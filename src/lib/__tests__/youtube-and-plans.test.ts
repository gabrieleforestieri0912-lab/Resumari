import { describe, it, expect } from 'vitest'
import {
  extractYouTubeVideoId,
  parseISODuration,
  extractYouTubeChannelRef,
  extractYouTubePlaylistId,
} from '@/lib/youtube-ids'
import {
  normalizePlan,
  getPlanLimit,
  getPlanName,
  isPaidPlan,
  getPlanPrice,
  getCreditsUsage,
} from '@/lib/plans'

describe('youtube-ids helper', () => {
  it('estrae videoId da formati watch/short/embed/shortlink/raw', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(extractYouTubeVideoId('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(extractYouTubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(extractYouTubeVideoId('invalid')).toBe(null)
    expect(extractYouTubeVideoId('')).toBe(null)
  })

  it('converte durate ISO in secondi', () => {
    expect(parseISODuration('PT1H2M3S')).toBe(3723)
    expect(parseISODuration('PT45M')).toBe(2700)
    expect(parseISODuration('PT30S')).toBe(30)
    expect(parseISODuration('PT0S')).toBe(0)
    expect(parseISODuration('')).toBe(0)
  })

  it('estrae riferimenti a canali da handle e URL classici', () => {
    expect(extractYouTubeChannelRef('https://youtube.com/@hubermanlab')).toEqual({
      type: 'handle',
      value: 'hubermanlab',
    })
    expect(extractYouTubeChannelRef('https://youtube.com/channel/UC1234567890abcdef')).toEqual({
      type: 'id',
      value: 'UC1234567890abcdef',
    })
    expect(extractYouTubeChannelRef('https://example.com/not-youtube')).toBe(null)
  })

  it('estrae playlist ID da URL con query ?list=', () => {
    expect(extractYouTubePlaylistId('https://www.youtube.com/playlist?list=PL12345')).toBe('PL12345')
    expect(extractYouTubePlaylistId('https://www.youtube.com/watch?v=abc&list=PL12345')).toBe('PL12345')
    expect(extractYouTubePlaylistId('https://www.youtube.com/watch?v=abc')).toBe(null)
  })
})

describe('plans & credits logic', () => {
  it('normalizza e applica limiti di default per i piani', () => {
    expect(normalizePlan('FREE')).toBe('free')
    expect(normalizePlan('premium')).toBe('pro') // alias legacy
    expect(getPlanLimit('free')).toBe(10)
    expect(getPlanLimit('standard')).toBe(1000)
    expect(getPlanLimit('pro')).toBe(2500)
    expect(getPlanLimit('business')).toBe(6000)
    expect(getPlanLimit('unknown')).toBe(10)
  })

  it('riconosce correttamente piani a pagamento e nomi', () => {
    expect(isPaidPlan('free')).toBe(false)
    expect(isPaidPlan('pro')).toBe(true)
    expect(getPlanName('pro')).toBe('Pro Pack')
    expect(getPlanPrice('standard', 'monthly')).toBe(4.99)
    expect(getPlanPrice('standard', 'annual')).toBe(49.9)
  })

  it('calcola l utilizzo crediti senza sforare il pool', () => {
    const usage = getCreditsUsage({ plan: 'free', credits: 7 })
    expect(usage.limit).toBe(10)
    expect(usage.remaining).toBe(7)
    expect(usage.used).toBe(3)
    expect(usage.exhausted).toBe(false)

    const exhausted = getCreditsUsage({ plan: 'free', credits: 0 })
    expect(exhausted.exhausted).toBe(true)
  })
})
