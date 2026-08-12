import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'
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

import { POST } from '@/app/api/auth/login/route'

const client = createMockSupabaseClient()

describe('POST /api/auth/login', () => {
  let hashedPassword: string

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.mocked(getServiceClientMock).mockReturnValue(client)
    hashedPassword = await bcrypt.hash('password123', 10)
    getClientIpMock.mockReturnValue('1.2.3.4')
    rateLimitMock.mockReturnValue({ success: true, remaining: 49 })

    client.setData('users', [
      {
        id: 'user-1',
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test',
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
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      }),
    )
    expect(res.status).toBe(429)
  })

  it('returns 400 when email or password are missing', async () => {
    const res = await POST(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it('returns 401 for unknown email', async () => {
    const res = await POST(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nobody@example.com', password: 'password123' }),
      }),
    )
    expect(res.status).toBe(401)
  })

  it('returns 401 for a wrong password', async () => {
    const res = await POST(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'wrongpass' }),
      }),
    )
    expect(res.status).toBe(401)
  })

  it('returns a token and the user (without password) on success', async () => {
    const res = await POST(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'TEST@example.com', password: 'password123' }),
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.token).toBeTypeOf('string')
    expect(body.user.email).toBe('test@example.com')
    expect(body.user).not.toHaveProperty('password')

    const decoded = jwt.verify(body.token, 'test-jwt-secret') as any
    expect(decoded.userId).toBe('user-1')
  })
})
