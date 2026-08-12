import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'

const { findUserByEmailMock, getAuthenticatedUserMock } = vi.hoisted(() => ({
  findUserByEmailMock: vi.fn(),
  getAuthenticatedUserMock: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  findUserByEmail: findUserByEmailMock,
}))

vi.mock('@/lib/auth', () => ({
  getAuthenticatedUser: getAuthenticatedUserMock,
}))

import { GET as getConfig } from '@/app/api/mcp/oauth/config/route'
import { POST as postToken, createAuthCode } from '@/app/api/mcp/oauth/token/route'
import { GET as getAuthorize } from '@/app/api/mcp/oauth/authorize/route'

const user = {
  id: 'user-1',
  email: 'user@example.com',
  credits: 10,
  plan: 'free',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

describe('GET /api/mcp/oauth/config', () => {
  it('exposes the OAuth discovery metadata', async () => {
    const res = await getConfig()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.issuer).toBe('https://test.resumari.it')
    expect(body.authorization_endpoint).toBe('https://test.resumari.it/api/mcp/oauth/authorize')
    expect(body.token_endpoint).toBe('https://test.resumari.it/api/mcp/oauth/token')
    expect(body.response_types_supported).toContain('code')
    expect(body.grant_types_supported).toEqual(['authorization_code', 'client_credentials'])
  })
})

describe('POST /api/mcp/oauth/token', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exchanges a valid authorization code for an access token', async () => {
    const code = createAuthCode('user-1')
    const res = await postToken(
      new Request('http://localhost/api/mcp/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_type: 'authorization_code', code }),
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.token_type).toBe('Bearer')
    expect(body.expires_in).toBe(604800)

    const decoded = jwt.verify(body.access_token, 'test-jwt-secret') as any
    expect(decoded.userId).toBe('user-1')
  })

  it('rejects an invalid authorization code', async () => {
    const res = await postToken(
      new Request('http://localhost/api/mcp/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_type: 'authorization_code', code: 'not-a-code' }),
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_grant')
  })

  it('rejects a reused authorization code', async () => {
    const code = createAuthCode('user-1')
    await postToken(
      new Request('http://localhost/api/mcp/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_type: 'authorization_code', code }),
      }),
    )
    const second = await postToken(
      new Request('http://localhost/api/mcp/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_type: 'authorization_code', code }),
      }),
    )
    expect(second.status).toBe(400)
    expect((await second.json()).error).toBe('invalid_grant')
  })

  it('issues a token for client_credentials with a known email', async () => {
    findUserByEmailMock.mockResolvedValue(user)
    const res = await postToken(
      new Request('http://localhost/api/mcp/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_type: 'client_credentials', client_id: 'user@example.com' }),
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    const decoded = jwt.verify(body.access_token, 'test-jwt-secret') as any
    expect(decoded.userId).toBe('user-1')
    expect(decoded.email).toBe('user@example.com')
  })

  it('rejects client_credentials for an unknown email', async () => {
    findUserByEmailMock.mockResolvedValue(null)
    const res = await postToken(
      new Request('http://localhost/api/mcp/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_type: 'client_credentials', client_id: 'nobody@example.com' }),
      }),
    )
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('invalid_client')
  })

  it('rejects unsupported grant types', async () => {
    const res = await postToken(
      new Request('http://localhost/api/mcp/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_type: 'refresh_token' }),
      }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('unsupported_grant_type')
  })
})

describe('GET /api/mcp/oauth/authorize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to login when the user is not authenticated', async () => {
    getAuthenticatedUserMock.mockResolvedValue(null)
    const res = await getAuthorize(
      new Request('http://localhost/api/mcp/oauth/authorize?redirect_uri=https://client.example.com/callback'),
    )
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
    expect(res.headers.get('location')).toContain('callbackUrl')
  })

  it('redirects to the client with an auth code when authenticated', async () => {
    getAuthenticatedUserMock.mockResolvedValue(user)
    const res = await getAuthorize(
      new Request(
        'http://localhost/api/mcp/oauth/authorize?redirect_uri=https%3A%2F%2Fclient.example.com%2Fcallback&state=xyz',
      ),
    )
    expect(res.status).toBe(307)
    const location = res.headers.get('location')!
    expect(location).toContain('https://client.example.com/callback')
    expect(location).toContain('code=')
    expect(location).toContain('state=xyz')

    const code = new URL(location).searchParams.get('code')!
    const tokenRes = await postToken(
      new Request('http://localhost/api/mcp/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_type: 'authorization_code', code }),
      }),
    )
    expect(tokenRes.status).toBe(200)
    const decoded = jwt.verify((await tokenRes.json()).access_token, 'test-jwt-secret') as any
    expect(decoded.userId).toBe('user-1')
  })
})
