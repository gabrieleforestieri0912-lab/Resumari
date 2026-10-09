import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPostRequest } from './helpers'

const { apiAuthMocks, youtubeMocks, creditsMocks } = vi.hoisted(() => ({
  apiAuthMocks: { authenticateApiKey: vi.fn(), authenticateApiRequest: vi.fn() },
  youtubeMocks: {
    getYouTubeVideoId: vi.fn(),
    fetchTranscriptForVideo: vi.fn(),
    getVideoDetails: vi.fn(),
  },
  creditsMocks: {
    hasEnoughCredits: vi.fn(),
    deductCredits: vi.fn(),
    CREDIT_COSTS: { transcriptionApi: 2 },
  },
}))

vi.mock('@/lib/api-auth', () => apiAuthMocks)
vi.mock('@/lib/youtube', () => youtubeMocks)
vi.mock('@/lib/credits', () => creditsMocks)

import { POST as transcriptPOST } from '@/app/api/v1/transcript/route'

const authOk = { authenticated: true, user: { id: 'u1', credits: 10, plan: 'free' }, creditsRemaining: 10, rateLimitRemaining: 29 }
const keyHeaders = { 'x-api-key': 'rsm_live_test' }

describe('POST /api/v1/transcript', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiAuthMocks.authenticateApiKey.mockResolvedValue(authOk)
    creditsMocks.hasEnoughCredits.mockReturnValue(true)
    creditsMocks.deductCredits.mockResolvedValue(8)
    youtubeMocks.getYouTubeVideoId.mockReturnValue('DHjqpvDnNGE')
    youtubeMocks.getVideoDetails.mockResolvedValue({ title: 'Titolo', channelTitle: 'Canale', durationSec: 120 })
    youtubeMocks.fetchTranscriptForVideo.mockResolvedValue({
      language: 'it',
      transcript: [{ text: 'ciao', time: 0, duration: 2 }],
    })
  })

  it('401 quando la chiave manca o non è valida', async () => {
    for (const error of ['missing_api_key', 'invalid_api_key']) {
      apiAuthMocks.authenticateApiKey.mockResolvedValue({ authenticated: false, error, status: 401 })
      const res = await transcriptPOST(mockPostRequest({ video_id: 'x' }, keyHeaders))
      expect(res.status).toBe(401)
      expect((await res.json()).error).toBe(error)
    }
  })

  it('429 quando il rate limit è superato', async () => {
    apiAuthMocks.authenticateApiKey.mockResolvedValue({ authenticated: false, error: 'rate_limited', status: 429 })
    const res = await transcriptPOST(mockPostRequest({ video_id: 'x' }, keyHeaders))
    expect(res.status).toBe(429)
  })

  it('400 con un input non valido', async () => {
    youtubeMocks.getYouTubeVideoId.mockReturnValue(null)
    const res = await transcriptPOST(mockPostRequest({ video_id: 'non-un-video' }, keyHeaders))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_input')
  })

  it('403 senza crediti sufficienti, senza chiamare YouTube', async () => {
    creditsMocks.hasEnoughCredits.mockReturnValue(false)
    const res = await transcriptPOST(mockPostRequest({ video_id: 'DHjqpvDnNGE' }, keyHeaders))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('insufficient_credits')
    expect(youtubeMocks.fetchTranscriptForVideo).not.toHaveBeenCalled()
  })

  it('404 e nessun addebito quando il video non ha transcript', async () => {
    youtubeMocks.fetchTranscriptForVideo.mockResolvedValue({ language: 'it', transcript: [] })
    const res = await transcriptPOST(mockPostRequest({ video_id: 'DHjqpvDnNGE' }, keyHeaders))
    expect(res.status).toBe(404)
    expect(creditsMocks.deductCredits).not.toHaveBeenCalled()
  })

  it('restituisce transcript, testo e crediti, e addebita 2 crediti', async () => {
    const res = await transcriptPOST(mockPostRequest({ video_url: 'https://youtu.be/DHjqpvDnNGE' }, keyHeaders))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.transcript).toEqual([{ text: 'ciao', start: 0, duration: 2 }])
    expect(body.text).toBe('ciao')
    expect(body.credits_used).toBe(2)
    expect(body.credits_remaining).toBe(8)
    expect(creditsMocks.deductCredits).toHaveBeenCalledWith('u1', 2)
  })

  it('403 se i crediti finiscono tra il check e laddebito', async () => {
    creditsMocks.deductCredits.mockResolvedValue(null)
    const res = await transcriptPOST(mockPostRequest({ video_id: 'DHjqpvDnNGE' }, keyHeaders))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('insufficient_credits')
  })
})
