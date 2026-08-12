import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'
import { createMockSupabaseClient } from '../helpers/supabase-mock'

const { getServiceClientMock, rateLimitMock, getClientIpMock } = vi.hoisted(() => ({
  getServiceClientMock: vi.fn(),
  rateLimitMock: vi.fn(),
  getClientIpMock: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  getServiceClient: getServiceClientMock,
  getSupabaseClient: vi.fn(),
  TABLES: {
    USERS: 'users',
    CHATS: 'chats',
    VERIFICATION_CODES: 'verification_codes',
    MESSAGES: 'messages',
    ACCOUNTS: 'nextauth_accounts',
    SESSIONS: 'nextauth_sessions',
    VERIFICATION_TOKENS: 'nextauth_verification_tokens',
    API_KEYS: 'api_keys',
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: rateLimitMock,
  getClientIp: getClientIpMock,
}))

import { POST } from '@/app/api/auth/verify-code/route'

const client = createMockSupabaseClient()

function codeRequest(email: string, code: string) {
  return new Request('http://localhost/api/auth/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  })
}

const FUTURE = new Date(Date.now() + 60_000).toISOString()
const PAST = new Date(Date.now() - 60_000).toISOString()

describe('POST /api/auth/verify-code (estensione: login email+codice)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServiceClientMock).mockReturnValue(client)
    getClientIpMock.mockReturnValue('1.2.3.4')
    rateLimitMock.mockReturnValue({ success: true, remaining: 49 })
    client.setData('users', [])
    client.setData('verification_codes', [
      {
        id: 'vc-1',
        email: 'new@example.com',
        code: '123456',
        used: false,
        expires_at: FUTURE,
      },
    ])
  })

  it('creates a NEW account in the same users table used by the site', async () => {
    const res = await POST(codeRequest('new@example.com', '123456'))
    expect(res.status).toBe(200)
    const body = await res.json()

    // The user row lives in the same "users" table as register/login/Google.
    const stored = client.getData('users').find((u) => u.email === 'new@example.com')
    expect(stored).toBeDefined()
    expect(stored!.name).toBe('new')
    expect(stored!.credits).toBe(10)
    expect(stored!.plan).toBe('free')

    // Same JWT shape the site issues (payload { userId, email }).
    const decoded = jwt.verify(body.token, 'test-jwt-secret') as any
    expect(decoded.userId).toBe(stored!.id)
    expect(decoded.email).toBe('new@example.com')
    expect(body.user.id).toBe(stored!.id)
  })

  it('normalizes the email when creating the account', async () => {
    const res = await POST(codeRequest('New@Example.com', '123456'))
    expect(res.status).toBe(200)
    const stored = client.getData('users').find((u) => u.email === 'new@example.com')
    expect(stored).toBeDefined()
  })

  it('does NOT duplicate an account already registered on the site', async () => {
    client.setData('users', [
      {
        id: 'user-site',
        email: 'existing@example.com',
        name: 'Pino',
        password: '$2b$10$hashed',
        credits: 25,
        plan: 'pro',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ])
    client.setData('verification_codes', [
      {
        id: 'vc-2',
        email: 'existing@example.com',
        code: '654321',
        used: false,
        expires_at: FUTURE,
      },
    ])

    const res = await POST(codeRequest('existing@example.com', '654321'))
    expect(res.status).toBe(200)
    const body = await res.json()

    // Same row, credits/plan untouched, no second user created.
    expect(client.getData('users')).toHaveLength(1)
    expect(body.user.id).toBe('user-site')
    expect(body.user.email).toBe('existing@example.com')
    expect(client.getData('users')[0].credits).toBe(25)
    expect(client.getData('users')[0].plan).toBe('pro')
  })

  it('marks the code as used after a successful login', async () => {
    await POST(codeRequest('new@example.com', '123456'))
    const code = client.getData('verification_codes').find((c) => c.id === 'vc-1')
    expect(code!.used).toBe(true)
  })

  it('rejects an invalid or expired code', async () => {
    client.setData('verification_codes', [
      {
        id: 'vc-3',
        email: 'late@example.com',
        code: '111111',
        used: false,
        expires_at: PAST,
      },
    ])
    const res = await POST(codeRequest('late@example.com', '111111'))
    expect(res.status).toBe(401)
    expect(client.getData('users')).toHaveLength(0)
  })
})
