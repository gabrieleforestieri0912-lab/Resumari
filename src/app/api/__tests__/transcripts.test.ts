import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockClient, mockPostRequest, mockGetRequest } from './helpers'

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }))
const { supabaseState } = vi.hoisted(() => ({ supabaseState: { client: null as any, builders: null as any } }))

vi.mock('@/lib/auth', () => ({ getAuthenticatedUser: authMock }))
vi.mock('@/lib/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supabase')>()
  return { ...actual, getServiceClient: () => supabaseState.client }
})

import { GET, POST } from '@/app/api/transcripts/route'

const user = { id: 'u1' }
const VID = 'VID12345678'
const row = { video_id: VID, title: 'T', transcript: [{ text: 'x', time: 0 }] }

beforeEach(() => {
  vi.clearAllMocks()
  const { client, builders } = mockClient()
  supabaseState.client = client
  supabaseState.builders = builders
  authMock.mockResolvedValue({ ...user })
})

describe('GET /api/transcripts', () => {
  it('401 senza utente', async () => {
    authMock.mockResolvedValue(null)
    expect((await GET(mockGetRequest())).status).toBe(401)
  })

  it('200 con lista trascrizioni (ordinata per data)', async () => {
    const { client, builders } = mockClient({ transcripts: { data: [row] } })
    supabaseState.client = client
    const res = await GET(mockGetRequest({ authorization: 'Bearer tok' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([row])
    expect(builders['transcripts'].__calls.order[0]).toEqual(['created_at', { ascending: false }])
  })
})

describe('POST /api/transcripts', () => {
  it('401 senza utente', async () => {
    authMock.mockResolvedValue(null)
    expect((await POST(mockPostRequest({}))).status).toBe(401)
  })

  it('400 senza videoId o senza transcript array', async () => {
    expect((await POST(mockPostRequest({ title: 'x' }))).status).toBe(400)
    expect((await POST(mockPostRequest({ videoId: VID, transcript: 'no' }))).status).toBe(400)
  })

  it('insert quando non esiste (upsert crea)', async () => {
    const { client, builders } = mockClient({
      transcripts: { data: null }, // maybeSingle -> nessun esistente... vedi nota sotto
    })
    // maybeSingle risolve { data: null } -> ramo insert; single finale risolve la riga
    supabaseState.client = client
    const res = await POST(mockPostRequest({ videoId: VID, title: 'T', transcript: row.transcript }))
    expect(res.status).toBe(200)
    expect(builders['transcripts'].__calls.insert).toHaveLength(1)
  })

  it('update quando esiste già (niente duplicati)', async () => {
    // Prima chiamata (select esistenza) -> riga esistente; la catena update
    // riusa lo stesso builder: maybeSingle/single risolvono il result dato.
    const { client, builders } = mockClient({ transcripts: { data: { id: 'r1' } } })
    supabaseState.client = client
    const res = await POST(mockPostRequest({ videoId: VID, title: 'T2', transcript: row.transcript }))
    expect(res.status).toBe(200)
    expect(builders['transcripts'].__calls.update).toHaveLength(1)
    expect(builders['transcripts'].__calls.insert).toHaveLength(0)
    expect(await res.json()).toEqual({ id: 'r1' })
  })
})
