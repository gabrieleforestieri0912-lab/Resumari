import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPostRequest } from './helpers'

const { aiMocks } = vi.hoisted(() => ({
  aiMocks: {
    generateChatCompletion: vi.fn(),
    streamChatCompletion: vi.fn(),
    aiErrorMessage: vi.fn((e: unknown) => 'AI_ERROR'),
  },
}))
const { ytMocks } = vi.hoisted(() => {
  const fetchTranscriptForVideo = vi.fn()
  const getVideoDetails = vi.fn()
  return {
    ytMocks: {
      fetchTranscriptForVideo,
      getVideoDetails,
      // La route usa il contesto con cache: stesso risultato dei due helper.
      getVideoContext: vi.fn(async (id: string) => ({
        transcript: await fetchTranscriptForVideo(id),
        details: await getVideoDetails(id),
      })),
    },
  }
})

vi.mock('@/lib/ai', () => aiMocks)
vi.mock('@/lib/youtube', () => ytMocks)

import { POST } from '@/app/api/ai/demo/route'
import { readSseStream, type SseEvent } from '@/lib/sse'

const VID = 'dQw4w9WgXcQ'
const ip = () => `192.168.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`

beforeEach(() => {
  vi.clearAllMocks()
  aiMocks.generateChatCompletion.mockResolvedValue('Risposta demo')
  ytMocks.fetchTranscriptForVideo.mockResolvedValue({
    transcript: [{ text: 'ciao mondo', time: 0, duration: 2 }],
    language: 'it',
  })
  ytMocks.getVideoDetails.mockResolvedValue({ title: 'Titolo video', channelTitle: 'Canale X', description: 'desc' })
})

describe('POST /api/ai/demo', () => {
  it('400 senza messaggio', async () => {
    const res = await POST(mockPostRequest({}, { 'x-forwarded-for': ip() }))
    expect(res.status).toBe(400)
  })

  it('429 oltre il rate limit (51 richieste dallo stesso IP)', async () => {
    const addr = ip()
    let last: Response | null = null
    for (let i = 0; i < 51; i++) {
      last = await POST(mockPostRequest({ message: 'ciao' }, { 'x-forwarded-for': addr }))
    }
    expect(last!.status).toBe(429)
  })

  it('chat libera senza video: chiama AI con contesto di default', async () => {
    const res = await POST(mockPostRequest({ message: 'ciao, chi sei?' }, { 'x-forwarded-for': ip() }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.response).toBe('Risposta demo')
    expect(ytMocks.fetchTranscriptForVideo).not.toHaveBeenCalled()
    const [messages] = aiMocks.generateChatCompletion.mock.calls[0]
    expect(messages[0].content).toMatch(/italiano/i)
  })

  it('link video nel messaggio: inietta la trascrizione con i tempi reali', async () => {
    ytMocks.fetchTranscriptForVideo.mockResolvedValue({
      transcript: [
        { text: 'primo argomento', time: 0, duration: 5 },
        { text: 'secondo argomento', time: 90, duration: 5 },
      ],
      language: 'it',
    })
    const res = await POST(
      mockPostRequest({ message: `Riassumi https://www.youtube.com/watch?v=${VID}` }, { 'x-forwarded-for': ip() }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.videoId).toBe(VID)
    const [messages] = aiMocks.generateChatCompletion.mock.calls[0]
    const userContent = messages[1].content
    expect(userContent).toMatch(/TRASCRIZIONE/)
    expect(userContent).toMatch(/primo argomento/)
    expect(userContent).toMatch(/Titolo video/)
    // I temi viaggiano con il testo: senza secondi il modello se li inventa.
    expect(userContent).toMatch(/\[0:00]/)
    expect(userContent).toMatch(/\[1:30]/)
    // Il prompt dice esplicitamente di non inventare tempi.
    expect(messages[0].content).toMatch(/SOLO tempi che compaiono/)
    // Il client riceve la trascrizione per riallineare i timestamp citati.
    expect(body.transcript).toHaveLength(2)
    expect(body.transcript[1]).toMatchObject({ time: 90 })
  })

  it('senza video la risposta non include una trascrizione', async () => {
    const res = await POST(mockPostRequest({ message: 'ciao' }, { 'x-forwarded-for': ip() }))
    const body = await res.json()
    expect(body.transcript).toBeUndefined()
  })

  it('videoId esplicito senza trascrizione ma con dettagli: usa titolo/descrizione', async () => {
    ytMocks.fetchTranscriptForVideo.mockResolvedValue(null)
    const res = await POST(
      mockPostRequest({ message: 'analizza', videoId: VID }, { 'x-forwarded-for': ip() }),
    )
    expect(res.status).toBe(200)
    const [messages] = aiMocks.generateChatCompletion.mock.calls[0]
    expect(messages[1].content).toMatch(/TITOLO: Titolo video/)
  })

  it('video non caricabile: 422 con messaggio chiaro', async () => {
    ytMocks.fetchTranscriptForVideo.mockResolvedValue(null)
    ytMocks.getVideoDetails.mockResolvedValue(null)
    const res = await POST(
      mockPostRequest({ message: `analizza https://youtu.be/${VID}` }, { 'x-forwarded-for': ip() }),
    )
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.videoId).toBe(VID)
    expect(body.message).toMatch(/sottotitoli/i)
    expect(aiMocks.generateChatCompletion).not.toHaveBeenCalled()
  })

  it('500 con messaggio AI leggibile in caso di errore provider', async () => {
    aiMocks.generateChatCompletion.mockRejectedValue(new Error('boom'))
    const res = await POST(mockPostRequest({ message: 'ciao' }, { 'x-forwarded-for': ip() }))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ message: 'AI_ERROR' })
  })
})

describe('POST /api/ai/demo — streaming SSE', () => {
  const sse = (body: unknown) =>
    mockPostRequest(body, { 'x-forwarded-for': ip(), accept: 'text/event-stream' })

  it('manda meta con video e trascrizione, poi i token e done', async () => {
    aiMocks.streamChatCompletion.mockImplementation(async function* () {
      yield 'Risposta '
      yield 'demo'
    })

    const res = await POST(sse({ message: `Riassumi https://youtu.be/${VID}` }))
    const events: SseEvent[] = []
    await readSseStream(res, (e) => events.push(e))

    expect(events[0].event).toBe('meta')
    const meta = events[0].data as any
    expect(meta.videoId).toBe(VID)
    expect(meta.transcript).toHaveLength(1)

    expect(events.filter((e) => e.event === 'delta').map((e) => (e.data as any).text)).toEqual([
      'Risposta ',
      'demo',
    ])
    expect(events.at(-1)).toEqual({ event: 'done', data: { response: 'Risposta demo' } })
    expect(aiMocks.generateChatCompletion).not.toHaveBeenCalled()
  })

  it('errore del provider: frame error e stream chiuso', async () => {
    aiMocks.streamChatCompletion.mockImplementation(async function* () {
      throw new Error('boom')
    })

    const res = await POST(sse({ message: 'ciao' }))
    const events: SseEvent[] = []
    await readSseStream(res, (e) => events.push(e))
    expect(events.at(-1)).toEqual({ event: 'error', data: { message: 'AI_ERROR' } })
  })
})
