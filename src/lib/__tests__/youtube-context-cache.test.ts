import { describe, it, expect, vi, beforeEach } from 'vitest'

const { groqMock } = vi.hoisted(() => ({ groqMock: vi.fn() }))

vi.mock('youtube-transcript', () => ({ YoutubeTranscript: { fetchTranscript: groqMock } }))

import { clearVideoContextCache, getVideoContext } from '@/lib/youtube'

const VIDEO_ID = 'dQw4w9WgXcQ'

beforeEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  clearVideoContextCache()
})

/** Simula una risposta timedtext valida (layer 1 della catena). */
function stubTimedText(text: string) {
  return new Response(
    JSON.stringify({ events: [{ tStartMs: 0, dDurationMs: 2000, segs: [{ utf8: text }] }] }),
    { headers: { 'Content-Type': 'application/json' } },
  )
}

describe('getVideoContext', () => {
  it('non riscarica la trascrizione a ogni richiesta sullo stesso video', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: any) => {
        const url = String(input)
        if (url.includes('/api/timedtext')) return stubTimedText('testo del video')
        return new Response(JSON.stringify({}), { status: 200 })
      }),
    )

    const first = await getVideoContext(VIDEO_ID)
    const second = await getVideoContext(VIDEO_ID)

    expect(first.transcript?.transcript[0]?.text).toBe('testo del video')
    expect(second).toBe(first)
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('cache scaduta: la trascrizione viene ricaricata', async () => {
    vi.useFakeTimers()
    try {
      const fetchMock = vi.fn(async () => stubTimedText('testo del video'))
      vi.stubGlobal('fetch', fetchMock)

      await getVideoContext(VIDEO_ID)
      vi.advanceTimersByTime(11 * 60 * 1000)
      await getVideoContext(VIDEO_ID)

      expect(fetchMock).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('video diversi non condividono la cache', async () => {
    const fetchMock = vi.fn(async () => stubTimedText('testo del video'))
    vi.stubGlobal('fetch', fetchMock)

    await getVideoContext('aaaaaaaaaaa')
    await getVideoContext('bbbbbbbbbbb')

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('clearVideoContextCache azzera tutto', async () => {
    const fetchMock = vi.fn(async () => stubTimedText('testo del video'))
    vi.stubGlobal('fetch', fetchMock)

    await getVideoContext(VIDEO_ID)
    clearVideoContextCache()
    await getVideoContext(VIDEO_ID)

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
