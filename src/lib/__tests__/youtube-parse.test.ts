import { describe, it, expect } from 'vitest'
import {
  parseTimedTextJson,
  parseKomeTranscript,
  getYouTubeVideoId,
} from '@/lib/youtube'

describe('parseTimedTextJson', () => {
  it('mappa eventi json3 in segmenti (testo, secondi, durata)', () => {
    const segments = parseTimedTextJson({
      events: [
        { tStartMs: 1200, dDurationMs: 3000, segs: [{ utf8: 'Ciao ' }, { utf8: 'mondo' }] },
        { tStartMs: 5000, dDurationMs: 1500, segs: [{ utf8: 'seconda riga' }] },
      ],
    })
    expect(segments).toEqual([
      { text: 'Ciao mondo', time: 1.2, duration: 3 },
      { text: 'seconda riga', time: 5, duration: 1.5 },
    ])
  })

  it('scarta eventi senza segs e testi vuoti', () => {
    expect(parseTimedTextJson({ events: [{ tStartMs: 0 }, { tStartMs: 1, segs: [{ utf8: '   ' }] }] })).toEqual([])
    expect(parseTimedTextJson({} as any)).toEqual([])
    expect(parseTimedTextJson(null as any)).toEqual([])
  })

  it('gestisce campi mancanti con default 0', () => {
    expect(parseTimedTextJson({ events: [{ segs: [{ utf8: 'x' }] }] })).toEqual([
      { text: 'x', time: 0, duration: 0 },
    ])
  })
})

describe('parseKomeTranscript', () => {
  it('stima i tempi dal conteggio parole (~150 wpm)', () => {
    const words = Array(150).fill('parola').join(' ')
    const [seg] = parseKomeTranscript(words)
    expect(seg.time).toBe(0)
    expect(seg.duration).toBeCloseTo(60, 5)
  })

  it('concatena i tempi dei segmenti e ignora righe vuote', () => {
    const segments = parseKomeTranscript('riga uno\n\nriga due tre')
    expect(segments).toHaveLength(2)
    expect(segments[0].time).toBe(0)
    expect(segments[1].time).toBeGreaterThan(0)
    expect(segments[1].time).toBe(segments[0].duration)
    expect(parseKomeTranscript('   \n  ')).toEqual([])
  })
})

describe('getYouTubeVideoId (alias server)', () => {
  it('è lo stesso estrattore condiviso', () => {
    expect(getYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(getYouTubeVideoId('nonsense')).toBe(null)
  })
})
