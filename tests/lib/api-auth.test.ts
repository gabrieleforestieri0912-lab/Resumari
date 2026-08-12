import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'

const { findApiKeyByKeyHashMock, findUserByIdMock, touchApiKeyMock } = vi.hoisted(() => ({
  findApiKeyByKeyHashMock: vi.fn(),
  findUserByIdMock: vi.fn(),
  touchApiKeyMock: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  findApiKeyByKeyHash: findApiKeyByKeyHashMock,
  findUserById: findUserByIdMock,
  touchApiKey: touchApiKeyMock,
}))

import { authenticateApiKey } from '@/lib/api-auth'

const user = {
  id: 'user-1',
  email: 'test@example.com',
  credits: 10,
  plan: 'free',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const keyRecord = {
  id: 'key-1',
  user_id: 'user-1',
  name: 'k',
  key_prefix: 'rsm_live_ab12...',
  key_hash: 'hash',
  created_at: '2026-01-01T00:00:00.000Z',
  last_used_at: null,
  revoked: false,
}

const rawKey = 'rsm_live_' + 'a'.repeat(32)
const rawHash = crypto.createHash('sha256').update(rawKey).digest('hex')

describe('authenticateApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects requests without an api key', async () => {
    const result = await authenticateApiKey(new Request('http://localhost/api/v1/transcript', { method: 'POST' }))
    expect(result.authenticated).toBe(false)
    if (!result.authenticated) {
      expect(result.error).toBe('missing_api_key')
      expect(result.status).toBe(401)
    }
  })

  it('rejects requests with an unknown api key', async () => {
    findApiKeyByKeyHashMock.mockResolvedValue(null)
    const req = new Request('http://localhost/api/v1/transcript', {
      method: 'POST',
      headers: { 'x-api-key': rawKey },
    })
    const result = await authenticateApiKey(req)
    expect(result.authenticated).toBe(false)
    if (!result.authenticated) {
      expect(result.error).toBe('invalid_api_key')
      expect(result.status).toBe(401)
    }
  })

  it('authenticates a valid key and returns user + credits', async () => {
    findApiKeyByKeyHashMock.mockResolvedValue(keyRecord)
    findUserByIdMock.mockResolvedValue(user)

    const req = new Request('http://localhost/api/v1/transcript', {
      method: 'POST',
      headers: { 'x-api-key': rawKey },
    })
    const result = await authenticateApiKey(req)
    expect(result.authenticated).toBe(true)
    if (result.authenticated) {
      expect(result.user.id).toBe('user-1')
      expect(result.creditsRemaining).toBe(10)
      expect(result.rateLimitRemaining).toBe(29)
    }
    expect(findApiKeyByKeyHashMock).toHaveBeenCalledWith(rawHash)
    expect(touchApiKeyMock).toHaveBeenCalledWith('key-1')
  })

  it('rejects when the key owner no longer exists', async () => {
    findApiKeyByKeyHashMock.mockResolvedValue(keyRecord)
    findUserByIdMock.mockResolvedValue(null)

    const req = new Request('http://localhost/api/v1/transcript', {
      method: 'POST',
      headers: { 'x-api-key': rawKey },
    })
    const result = await authenticateApiKey(req)
    expect(result.authenticated).toBe(false)
    if (!result.authenticated) expect(result.status).toBe(401)
  })

  it('rate limits a key after 30 requests per minute', async () => {
    findApiKeyByKeyHashMock.mockResolvedValue({ ...keyRecord, id: 'key-rl' })
    findUserByIdMock.mockResolvedValue(user)

    for (let i = 0; i < 30; i++) {
      const result = await authenticateApiKey(
        new Request('http://localhost/x', { method: 'POST', headers: { 'x-api-key': rawKey } }),
      )
      expect(result.authenticated).toBe(true)
    }

    const blocked = await authenticateApiKey(
      new Request('http://localhost/x', { method: 'POST', headers: { 'x-api-key': rawKey } }),
    )
    expect(blocked.authenticated).toBe(false)
    if (!blocked.authenticated) {
      expect(blocked.error).toBe('rate_limited')
      expect(blocked.status).toBe(429)
    }
  })
})
