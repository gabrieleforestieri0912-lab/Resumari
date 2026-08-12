import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows the first request and reports remaining', () => {
    const result = rateLimit('10.0.0.1')
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(49)
  })

  it('counts multiple requests from the same IP', () => {
    rateLimit('10.0.0.2')
    const second = rateLimit('10.0.0.2')
    expect(second.success).toBe(true)
    expect(second.remaining).toBe(48)
  })

  it('blocks requests exceeding the limit within the window', () => {
    for (let i = 0; i < 50; i++) {
      const r = rateLimit('10.0.0.3')
      if (i < 49) expect(r.success).toBe(true)
    }
    const blocked = rateLimit('10.0.0.3')
    expect(blocked.success).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.resetTime).toBeTypeOf('number')
  })

  it('resets the window after 60 seconds', () => {
    for (let i = 0; i < 50; i++) rateLimit('10.0.0.4')
    expect(rateLimit('10.0.0.4').success).toBe(false)

    vi.setSystemTime(new Date('2026-01-01T00:01:01Z'))
    const result = rateLimit('10.0.0.4')
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(49)
  })

  it('treats different IPs independently', () => {
    for (let i = 0; i < 50; i++) rateLimit('10.0.0.5')
    expect(rateLimit('10.0.0.5').success).toBe(false)
    expect(rateLimit('10.0.0.6').success).toBe(true)
  })
})

describe('getClientIp', () => {
  it('returns the first x-forwarded-for entry', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.1, 70.41.3.18' })
    expect(getClientIp(headers)).toBe('203.0.113.1')
  })

  it('falls back to x-real-ip', () => {
    const headers = new Headers({ 'x-real-ip': '198.51.100.7' })
    expect(getClientIp(headers)).toBe('198.51.100.7')
  })

  it('prefers x-forwarded-for over x-real-ip', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.1', 'x-real-ip': '198.51.100.7' })
    expect(getClientIp(headers)).toBe('203.0.113.1')
  })

  it('returns unknown when no header is present', () => {
    expect(getClientIp(new Headers())).toBe('unknown')
  })
})
