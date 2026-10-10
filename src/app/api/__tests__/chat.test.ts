import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockClient, mockPostRequest } from './helpers'

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }))
const { aiMocks } = vi.hoisted(() => ({
  aiMocks: {
    generateChatCompletion: vi.fn(),
    streamChatCompletion: vi.fn(),
    aiErrorMessage: vi.fn(() => 'AI_ERROR'),
    DEFAULT_AI_MODEL: 'test-model',
    VISION_AI_MODEL: '',
  },
}))
const { ytMocks } = vi.hoisted(() => {
  const fetchTranscriptForVideo = vi.fn()
  const getVideoDetails = vi.fn()
  return {
    ytMocks: {
      fetchTranscriptForVideo,
      getVideoDetails,
      getYouTubeVideoId: vi.fn(),
      // La route usa il contesto con cache: stesso risultato dei due helper.
      getVideoContext: vi.fn(async (id: string) => ({
        transcript: await fetchTranscriptForVideo(id),
        details: await getVideoDetails(id),
      })),
    },
  }
})
const { creditsMocks } = vi.hoisted(() => ({
  creditsMocks: {
    hasEnoughCredits: vi.fn(),
    deductCredits: vi.fn(),
    CREDIT_COSTS: { chat: 1 },
    creditsExhaustedMessage: () => 'Crediti esauriti',
  },
}))
const { supabaseState } = vi.hoisted(() => ({ supabaseState: { client: null as any, builders: null as any } }))

vi.mock('@/lib/auth', () => ({ getAuthenticatedUser: authMock }))
vi.mock('@/lib/ai', () => aiMocks)
vi.mock('@/lib/youtube', () => ytMocks)
vi.mock('@/lib/credits', () => creditsMocks)
vi.mock('@/lib/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supabase')>()
  return { ...actual, getServiceClient: () => supabaseState.client }
})

import { POST } from '@/app/api/ai/chat/route'
import { readSseStream, type SseEvent } from '@/lib/sse'

const user = { id: 'u1', credits: 5, plan: 'free' }

beforeEach(() => {
  vi.clearAllMocks()
  const { client, builders } = mockClient()
  supabaseState.client = client
  supabaseState.builders = builders
  authMock.mockResolvedValue({ ...user })
  creditsMocks.hasEnoughCredits.mockReturnValue(true)
  creditsMocks.deductCredits.mockResolvedValue(4)
  aiMocks.generateChatCompletion.mockResolvedValue('Risposta AI')
  ytMocks.getYouTubeVideoId.mockReturnValue(null)
  ytMocks.fetchTranscriptForVideo.mockResolvedValue(null)
  ytMocks.getVideoDetails.mockResolvedValue(null)
})

describe('POST /api/ai/chat', () => {
  it('401 senza utente', async () => {
    authMock.mockResolvedValue(null)
    const res = await POST(mockPostRequest({ message: 'ciao' }))
    expect(res.status).toBe(401)
  })

  it('403 con crediti insufficienti', async () => {
    creditsMocks.hasEnoughCredits.mockReturnValue(false)
    const res = await POST(mockPostRequest({ message: 'ciao' }))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('insufficient_credits')
    expect(aiMocks.generateChatCompletion).not.toHaveBeenCalled()
  })

  it('risponde senza video e salva cronologia + scala crediti', async () => {
    const res = await POST(mockPostRequest({ message: 'ciao' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.response).toBe('Risposta AI')
    expect(body.credits).toBe(4)
    expect(ytMocks.fetchTranscriptForVideo).not.toHaveBeenCalled()
    expect(supabaseState.builders['chats'].__calls.insert).toHaveLength(1)
    expect(creditsMocks.deductCredits).toHaveBeenCalledWith('u1', 1)
  })

  it('con video: inietta trascrizione nel contesto', async () => {
    ytMocks.getYouTubeVideoId.mockReturnValue('VID12345678')
    ytMocks.fetchTranscriptForVideo.mockResolvedValue({
      transcript: [{ text: 'parola', time: 0, duration: 1 }],
      language: 'it',
    })
    ytMocks.getVideoDetails.mockResolvedValue({ title: 'T', channelTitle: 'C', description: 'd' })
    const res = await POST(mockPostRequest({ message: 'riassumi' }))
    expect(res.status).toBe(200)
    const [messages] = aiMocks.generateChatCompletion.mock.calls[0]
    const userContent = typeof messages[1] === 'string' ? messages[1] : messages[1].content
    expect(userContent).toMatch(/TRASCRIZIONE/)
  })

  it('500 se il salvataggio cronologia fallisce', async () => {
    const { client } = mockClient({ chats: { error: new Error('db'), data: null } as any })
    supabaseState.client = client
    const res = await POST(mockPostRequest({ message: 'ciao' }))
    expect(res.status).toBe(500)
  })
})

describe('POST /api/ai/chat — streaming SSE', () => {
  const sseRequest = (body: unknown) =>
    mockPostRequest(body, { accept: 'text/event-stream' })

  it('trasmette i token e poi done con la risposta completa', async () => {
    aiMocks.streamChatCompletion.mockImplementation(async function* () {
      yield 'Risposta '
      yield 'AI'
    })

    const res = await POST(sseRequest({ message: 'ciao' }))
    expect(res.headers.get('Content-Type')).toMatch(/text\/event-stream/)

    const events: SseEvent[] = []
    await readSseStream(res, (e) => events.push(e))

    expect(events.filter((e) => e.event === 'delta').map((e) => (e.data as any).text)).toEqual([
      'Risposta ',
      'AI',
    ])
    const done = events.find((e) => e.event === 'done')
    expect(done?.data).toEqual({ response: 'Risposta AI', credits: 4 })
    // Il JSON "vecchio" non viene usato quando si streamma.
    expect(aiMocks.generateChatCompletion).not.toHaveBeenCalled()
    expect(creditsMocks.deductCredits).toHaveBeenCalledWith('u1', 1)
  })

  it('errore del provider: frame error senza done e senza crediti scalati', async () => {
    aiMocks.streamChatCompletion.mockImplementation(async function* () {
      yield 'parziale'
      throw new Error('boom')
    })

    const res = await POST(sseRequest({ message: 'ciao' }))
    const events: SseEvent[] = []
    await readSseStream(res, (e) => events.push(e))

    expect(events.some((e) => e.event === 'done')).toBe(false)
    expect(events.at(-1)).toEqual({ event: 'error', data: { message: 'AI_ERROR' } })
    expect(creditsMocks.deductCredits).not.toHaveBeenCalled()
  })

  it('salvataggio fallito a metà stream: frame error, nessun credito scalato', async () => {
    const { client } = mockClient({ chats: { error: new Error('db'), data: null } as any })
    supabaseState.client = client
    aiMocks.streamChatCompletion.mockImplementation(async function* () {
      yield 'testo'
    })

    const res = await POST(sseRequest({ message: 'ciao' }))
    const events: SseEvent[] = []
    await readSseStream(res, (e) => events.push(e))

    expect(events.at(-1)).toEqual({
      event: 'error',
      data: { message: 'Errore nel salvataggio della chat' },
    })
    expect(creditsMocks.deductCredits).not.toHaveBeenCalled()
  })
})
