import { describe, it, expect, vi, beforeEach } from 'vitest'

const { getAuthenticatedUserMock, findApiKeysByUserIdMock, createApiKeyMock, revokeApiKeyMock } = vi.hoisted(() => ({
  getAuthenticatedUserMock: vi.fn(),
  findApiKeysByUserIdMock: vi.fn(),
  createApiKeyMock: vi.fn(),
  revokeApiKeyMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getAuthenticatedUser: getAuthenticatedUserMock,
}))

vi.mock('@/lib/db', () => ({
  findApiKeysByUserId: findApiKeysByUserIdMock,
  createApiKey: createApiKeyMock,
  revokeApiKey: revokeApiKeyMock,
}))

import { GET, POST } from '@/app/api/keys/route'
import { DELETE } from '@/app/api/keys/[id]/route'

const user = {
  id: 'user-1',
  email: 'test@example.com',
  credits: 10,
  plan: 'free',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const apiKey = {
  id: 'key-1',
  user_id: 'user-1',
  name: 'Prod',
  key_prefix: 'rsm_live_ab12...',
  key_hash: 'hash',
  created_at: '2026-01-01T00:00:00.000Z',
  last_used_at: null,
  revoked: false,
}

describe('API keys routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAuthenticatedUserMock.mockResolvedValue(user)
    findApiKeysByUserIdMock.mockResolvedValue([apiKey])
    createApiKeyMock.mockImplementation((data: any) => Promise.resolve({ ...apiKey, ...data }))
    revokeApiKeyMock.mockResolvedValue({ ...apiKey, revoked: true })
  })

  describe('GET /api/keys', () => {
    it('returns 401 when not authenticated', async () => {
      getAuthenticatedUserMock.mockResolvedValue(null)
      const res = await GET(new Request('http://localhost/api/keys'))
      expect(res.status).toBe(401)
    })

    it('lists the user keys without exposing the hash', async () => {
      const res = await GET(new Request('http://localhost/api/keys'))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.keys).toHaveLength(1)
      expect(body.keys[0].key_prefix).toBe('rsm_live_ab12...')
      expect(body.keys[0]).not.toHaveProperty('key_hash')
    })
  })

  describe('POST /api/keys', () => {
    it('returns 401 when not authenticated', async () => {
      getAuthenticatedUserMock.mockResolvedValue(null)
      const res = await POST(
        new Request('http://localhost/api/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'k' }),
        }),
      )
      expect(res.status).toBe(401)
    })

    it('returns 400 when name is missing', async () => {
      const res = await POST(
        new Request('http://localhost/api/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: '  ' }),
        }),
      )
      expect(res.status).toBe(400)
    })

    it('creates a key with rsm_live_ prefix and stores only the hash', async () => {
      const res = await POST(
        new Request('http://localhost/api/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Prod' }),
        }),
      )
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.key).toMatch(/^rsm_live_[0-9a-f]{64}$/)
      expect(body.name).toBe('Prod')

      const stored = createApiKeyMock.mock.calls[0][0]
      expect(stored.user_id).toBe('user-1')
      expect(stored.key_hash).toMatch(/^[0-9a-f]{64}$/)
      expect(stored.key_hash).not.toBe(body.key)
      expect(stored.key_prefix).toBe(body.key.substring(0, 12) + '...')
    })
  })

  describe('DELETE /api/keys/[id]', () => {
    it('returns 401 when not authenticated', async () => {
      getAuthenticatedUserMock.mockResolvedValue(null)
      const res = await DELETE(new Request('http://localhost/api/keys/key-1', { method: 'DELETE' }), {
        params: Promise.resolve({ id: 'key-1' }),
      })
      expect(res.status).toBe(401)
    })

    it('returns 404 when the key does not belong to the user', async () => {
      findApiKeysByUserIdMock.mockResolvedValue([{ ...apiKey, id: 'key-other' }])
      const res = await DELETE(new Request('http://localhost/api/keys/key-1', { method: 'DELETE' }), {
        params: Promise.resolve({ id: 'key-1' }),
      })
      expect(res.status).toBe(404)
    })

    it('revokes a key owned by the user', async () => {
      const res = await DELETE(new Request('http://localhost/api/keys/key-1', { method: 'DELETE' }), {
        params: Promise.resolve({ id: 'key-1' }),
      })
      expect(res.status).toBe(200)
      expect(revokeApiKeyMock).toHaveBeenCalledWith('key-1')
    })
  })
})
