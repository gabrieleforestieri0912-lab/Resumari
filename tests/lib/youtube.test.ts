import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseTimedTextJson,
  parseKomeTranscript,
  fetchTranscriptForVideo,
} from '@/lib/youtube'

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('parseTimedTextJson', () => {
  it('maps events with segs to segments with seconds', () => {
    const segments = parseTimedTextJson({
      events: [
        { tStartMs: 1000, dDurationMs: 2500, segs: [{ utf8: 'Ciao' }, { utf8: 'mondo' }] },
        { tStartMs: 5000, dDurationMs: 1000, segs: [{ utf8: 'Benvenuti' }] },
      ],
    })
    expect(segments).toEqual([
      { text: 'Ciao mondo', time: 1, duration: 2.5 },
      { text: 'Benvenuti', time: 5, duration: 1 },
    ])
  })

  it('skips events without segs and empty text', () => {
    const segments = parseTimedTextJson({
      events: [
        { tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: '  ' }] },
        { tStartMs: 0, dDurationMs: 1000 },
        { tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: 'Reale' }] },
      ],
    })
    expect(segments).toHaveLength(1)
    expect(segments[0].text).toBe('Reale')
  })

  it('returns [] for missing events', () => {
    expect(parseTimedTextJson({})).toEqual([])
  })
})

describe('parseKomeTranscript', () => {
  it('splits plain text into segments with estimated timings', () => {
    const segments = parseKomeTranscript(
      'Hello there\nWelcome back to the channel',
    )
    expect(segments).toHaveLength(2)
    expect(segments[0].text).toBe('Hello there')
    expect(segments[0].time).toBe(0)
    expect(segments[0].duration).toBeGreaterThan(0)
    // second line starts after the first one
    expect(segments[1].time).toBeGreaterThan(segments[0].time)
  })

  it('ignores blank lines', () => {
    const segments = parseKomeTranscript('Uno\n\n\nDue')
    expect(segments).toHaveLength(2)
    expect(segments.map((s) => s.text)).toEqual(['Uno', 'Due'])
  })
})

describe('fetchTranscriptForVideo', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the direct timedtext layer when it returns events', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.startsWith('https://youtube.com/api/timedtext')) {
        return Promise.resolve(
          jsonResponse({
            events: [{ tStartMs: 0, dDurationMs: 2000, segs: [{ utf8: 'Diretto' }] }],
          }),
        )
      }
      return Promise.resolve(jsonResponse({}, false, 404))
    })

    const result = await fetchTranscriptForVideo('abc123def45')
    expect(result?.language).toBe('it')
    expect(result?.transcript[0].text).toBe('Diretto')
  })

  it('falls back to kome.ai when timedtext and the package both fail', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.startsWith('https://youtube.com/api/timedtext')) {
        return Promise.resolve(jsonResponse({ events: [] }))
      }
      if (url.startsWith('https://kome.ai/api/transcript')) {
        return Promise.resolve(jsonResponse({ transcript: 'Fallback text' }))
      }
      return Promise.resolve(jsonResponse({}, false, 404))
    })

    const result = await fetchTranscriptForVideo('abc123def45')
    expect(result?.language).toBe('en')
    expect(result?.transcript[0].text).toBe('Fallback text')
  })

  it('returns null when every layer fails', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 404))
    const result = await fetchTranscriptForVideo('abc123def45')
    expect(result).toBeNull()
  })
})
