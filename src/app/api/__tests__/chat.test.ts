import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockClient, mockPostRequest } from './helpers'

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }))
const { aiMocks } = vi.hoisted(() => ({
  aiMocks: {
    generateChatCompletion: vi.fn(),
    aiErrorMessage: vi.fn(() => 'AI_ERROR'),
    DEFAULT_AI_MODEL: 'test-model',
    VISION_AI_MODEL: '',
  },
}))
const { ytMocks } = vi.hoisted(() => ({
  ytMocks: { fetchTranscriptForVideo: vi.fn(), getVideoDetails: vi.fn(), getYouTubeVideoId: vi.fn() },
}))
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
