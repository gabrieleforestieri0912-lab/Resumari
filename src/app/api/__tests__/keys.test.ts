import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPostRequest, mockGetRequest } from './helpers'

const { authMocks, dbMocks } = vi.hoisted(() => ({
  authMocks: { getAuthenticatedUser: vi.fn() },
  dbMocks: {
    findApiKeysByUserId: vi.fn(),
    createApiKey: vi.fn(),
    revokeApiKey: vi.fn(),
  },
}))

vi.mock('@/lib/auth', () => authMocks)
vi.mock('@/lib/db', () => dbMocks)

import { GET as keysGET, POST as keysPOST } from '@/app/api/keys/route'
import { DELETE as keyDELETE } from '@/app/api/keys/[id]/route'
import { MAX_API_KEYS_PER_USER } from '@/lib/api-keys'

const user = { id: 'user-1', email: 'a@b.c', credits: 10, plan: 'free' }
const bearer = { authorization: 'Bearer jwt' }

describe('GET /api/keys', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 senza autenticazione', async () => {
    authMocks.getAuthenticatedUser.mockResolvedValue(null)
    const res = await keysGET(mockGetRequest())
    expect(res.status).toBe(401)
  })

  it('non espone mai key_hash, solo il prefisso', async () => {
    authMocks.getAuthenticatedUser.mockResolvedValue(user)
    dbMocks.findApiKeysByUserId.mockResolvedValue([
      { id: 'k1', name: 'Produzione', key_prefix: 'rsm_live_ab...', key_hash: 'segreto', created_at: 'x', last_used_at: null, revoked: false },
    ])
    const res = await keysGET(mockGetRequest(bearer))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(JSON.stringify(body)).not.toContain('segreto')
    expect(body.keys[0].key_prefix).toBe('rsm_live_ab...')
    expect(body.keys[0].last_used_at).toBeNull()
  })
})

describe('POST /api/keys', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rifiuta le richieste senza nome', async () => {
    authMocks.getAuthenticatedUser.mockResolvedValue(user)
    const res = await keysPOST(mockPostRequest({ name: '   ' }, bearer))
    expect(res.status).toBe(400)
  })

  it('crea la chiave e la restituisce una sola volta', async () => {
    authMocks.getAuthenticatedUser.mockResolvedValue(user)
    dbMocks.findApiKeysByUserId.mockResolvedValue([])
    dbMocks.createApiKey.mockResolvedValue({})
    const res = await keysPOST(mockPostRequest({ name: 'Produzione' }, bearer))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.key).toMatch(/^rsm_live_[0-9a-f]{64}$/)
    expect(dbMocks.createApiKey).toHaveBeenCalledOnce()
    // Al database va solo l'hash, mai la chiave in chiaro.
    const stored = dbMocks.createApiKey.mock.calls[0][0]
    expect(stored.key_hash).not.toBe(body.key)
    expect(stored.key_hash).toHaveLength(64)
  })

  it('applica il limite di chiavi attive dichiarato in pagina', async () => {
    authMocks.getAuthenticatedUser.mockResolvedValue(user)
    dbMocks.findApiKeysByUserId.mockResolvedValue(
      Array.from({ length: MAX_API_KEYS_PER_USER }, (_, i) => ({ id: `k${i}`, revoked: false })),
    )
    const res = await keysPOST(mockPostRequest({ name: 'Quarta' }, bearer))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.code).toBe('KEY_LIMIT_REACHED')
    expect(dbMocks.createApiKey).not.toHaveBeenCalled()
  })

  it('le chiavi revocate non contano nel limite', async () => {
    authMocks.getAuthenticatedUser.mockResolvedValue(user)
    dbMocks.findApiKeysByUserId.mockResolvedValue([
      ...Array.from({ length: MAX_API_KEYS_PER_USER }, (_, i) => ({ id: `k${i}`, revoked: true })),
    ])
    dbMocks.createApiKey.mockResolvedValue({})
    const res = await keysPOST(mockPostRequest({ name: 'Nuova' }, bearer))
    expect(res.status).toBe(200)
  })
})

describe('DELETE /api/keys/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('404 se la chiave non è dell utente', async () => {
    authMocks.getAuthenticatedUser.mockResolvedValue(user)
    dbMocks.findApiKeysByUserId.mockResolvedValue([{ id: 'altra', revoked: false }])
    const res = await keyDELETE(new Request('http://localhost/api/keys/mia', { method: 'DELETE', headers: bearer }), {
      params: Promise.resolve({ id: 'mia' }),
    } as any)
    expect(res.status).toBe(404)
    expect(dbMocks.revokeApiKey).not.toHaveBeenCalled()
  })

  it('revoca la chiave di proprietà', async () => {
    authMocks.getAuthenticatedUser.mockResolvedValue(user)
    dbMocks.findApiKeysByUserId.mockResolvedValue([{ id: 'mia', revoked: false }])
    dbMocks.revokeApiKey.mockResolvedValue({ id: 'mia', revoked: true })
    const res = await keyDELETE(new Request('http://localhost/api/keys/mia', { method: 'DELETE', headers: bearer }), {
      params: Promise.resolve({ id: 'mia' }),
    } as any)
    expect(res.status).toBe(200)
    expect(dbMocks.revokeApiKey).toHaveBeenCalledWith('mia')
  })
})
