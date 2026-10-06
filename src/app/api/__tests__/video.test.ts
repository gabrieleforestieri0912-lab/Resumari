import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockClient, mockPostRequest } from './helpers'

const { getAuthenticatedUserMock } = vi.hoisted(() => ({ getAuthenticatedUserMock: vi.fn() }))
const { youtubeMocks } = vi.hoisted(() => ({
  youtubeMocks: {
    fetchTranscriptForVideo: vi.fn(),
    getVideoDetails: vi.fn(),
    getYouTubeVideoId: (url: string) => {
      const m = String(url || '').match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([a-zA-Z0-9_-]{11})/)
      return m ? m[1] : null
    },
  },
}))
const { creditsMocks } = vi.hoisted(() => ({
  creditsMocks: {
    hasEnoughCredits: vi.fn(),
    deductCredits: vi.fn(),
    CREDIT_COSTS: { transcription: 1 },
    creditsExhaustedMessage: (plan?: string) => `Crediti esauriti (${plan})`,
  },
}))

vi.mock('@/lib/auth', () => ({ getAuthenticatedUser: getAuthenticatedUserMock }))
vi.mock('@/lib/youtube', () => youtubeMocks)
vi.mock('@/lib/credits', () => creditsMocks)

import { POST } from '@/app/api/video/route'

const VID = 'dQw4w9WgXcQ'
const TRANSCRIPT = [
  { text: 'ciao', time: 0, duration: 1 },
  { text: 'mondo', time: 1, duration: 1 },
]
const user = { id: 'u1', credits: 5, plan: 'free' }

beforeEach(() => {
  vi.clearAllMocks()
  getAuthenticatedUserMock.mockResolvedValue({ ...user })
  creditsMocks.hasEnoughCredits.mockReturnValue(true)
  creditsMocks.deductCredits.mockResolvedValue(4)
  youtubeMocks.fetchTranscriptForVideo.mockResolvedValue({ transcript: TRANSCRIPT, language: 'it' })
  youtubeMocks.getVideoDetails.mockResolvedValue({
    title: 'Titolo', channelTitle: 'Canale', thumbnail: 'thumb', viewCount: '1',
    likeCount: '2', publishedAt: 'oggi', description: 'desc',
  })
})

describe('POST /api/video', () => {
  it('401 senza utente autenticato', async () => {
    getAuthenticatedUserMock.mockResolvedValue(null)
    const res = await POST(mockPostRequest({ videoUrl: `https://youtube.com/watch?v=${VID}` }))
    expect(res.status).toBe(401)
  })

  it('403 con crediti insufficienti', async () => {
    creditsMocks.hasEnoughCredits.mockReturnValue(false)
    const res = await POST(mockPostRequest({ videoUrl: `https://youtube.com/watch?v=${VID}` }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('insufficient_credits')
  })

  it('400 con URL non valido', async () => {
    const res = await POST(mockPostRequest({ videoUrl: 'non-un-link' }))
    expect(res.status).toBe(400)
  })

  it('422 senza trascrizione: nessun addebito, ma dettagli presenti', async () => {
    youtubeMocks.fetchTranscriptForVideo.mockResolvedValue({ transcript: [], language: null })
    const res = await POST(mockPostRequest({ videoUrl: `https://youtube.com/watch?v=${VID}` }))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.videoId).toBe(VID)
    expect(body.transcript).toEqual([])
    expect(creditsMocks.deductCredits).not.toHaveBeenCalled()
  })

  it('200 con trascrizione: scala i crediti e ritorna i dettagli', async () => {
    const res = await POST(mockPostRequest({ videoUrl: `https://youtube.com/watch?v=${VID}` }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.videoId).toBe(VID)
    expect(body.transcript).toEqual(TRANSCRIPT)
    expect(body.title).toBe('Titolo')
    expect(creditsMocks.deductCredits).toHaveBeenCalledWith('u1', 1)
    expect(body.credits).toBe(4)
  })

  it('403 se la deduzione fallisce dopo il fetch', async () => {
    creditsMocks.deductCredits.mockResolvedValue(null)
    const res = await POST(mockPostRequest({ videoUrl: `https://youtube.com/watch?v=${VID}` }))
    expect(res.status).toBe(403)
  })
})
