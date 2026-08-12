import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'
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

import { POST } from '@/app/api/auth/register/route'

const client = createMockSupabaseClient()

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServiceClientMock).mockReturnValue(client)
    getClientIpMock.mockReturnValue('1.2.3.4')
    rateLimitMock.mockReturnValue({ success: true, remaining: 49 })
    client.setData('users', [
      {
        id: 'user-existing',
        email: 'taken@example.com',
        name: 'Existing',
        credits: 10,
        plan: 'free',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ])
  })

  it('returns 429 when rate limited', async () => {
    rateLimitMock.mockReturnValue({ success: false, remaining: 0 })
    const res = await POST(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'new@example.com', password: 'password123' }),
      }),
    )
    expect(res.status).toBe(429)
  })

  it('returns 400 when fields are missing', async () => {
    const res = await POST(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'new@example.com' }),
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('MISSING_FIELDS')
  })

  it('rejects an already-registered email', async () => {
    const res = await POST(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'taken@example.com', password: 'password123' }),
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('USER_EXISTS')
  })

  it('creates a free account with 10 credits and a hashed password', async () => {
    const res = await POST(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'New@Example.com', password: 'password123', name: 'Pinco' }),
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.email).toBe('new@example.com')
    expect(body.user.name).toBe('Pinco')
    expect(body.user.credits).toBe(10)
    expect(body.user.plan).toBe('free')
    expect(body.user).not.toHaveProperty('password')
    expect(body.token).toBeTypeOf('string')

    const stored = client.getData('users').find((u) => u.email === 'new@example.com')
    expect(stored).toBeDefined()
    expect(stored!.password).not.toBe('password123')
    expect(await bcrypt.compare('password123', stored!.password)).toBe(true)
  })

  it('derives the display name from the email when not provided', async () => {
    await POST(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'bob@example.com', password: 'password123' }),
      }),
    )
    const stored = client.getData('users').find((u) => u.email === 'bob@example.com')
    expect(stored!.name).toBe('bob')
  })
})
