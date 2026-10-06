import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { rateLimit, rateLimitAsync, getClientIp } from '@/lib/rate-limit'

function headersOf(entries: Record<string, string>): Headers {
  const h = new Headers()
  for (const [k, v] of Object.entries(entries)) h.set(k, v)
  return h
}

describe('rateLimit (memory fallback)', () => {
  const ip = () => `10.0.0.${Math.floor(Math.random() * 200000)}`

  it('permette le prime 50 richieste nella finestra', () => {
    const addr = ip()
    for (let i = 0; i < 50; i++) {
      const r = rateLimit(addr)
      expect(r.success).toBe(true)
      expect(r.remaining).toBe(50 - i - 1)
    }
  })

  it('blocca la 51ª richiesta con resetTime valorizzato', () => {
    const addr = ip()
    for (let i = 0; i < 50; i++) rateLimit(addr)
    const blocked = rateLimit(addr)
    expect(blocked.success).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.resetTime).toBeGreaterThan(Date.now())
  })

  it('isola i conteggi per IP', () => {
    const a = ip()
    const b = ip()
    for (let i = 0; i < 50; i++) rateLimit(a)
    expect(rateLimit(a).success).toBe(false)
    expect(rateLimit(b).success).toBe(true)
  })

  it('riapre la finestra dopo 60s (sliding window)', () => {
    vi.useFakeTimers()
    try {
      const addr = ip()
      vi.setSystemTime(1_000_000)
      for (let i = 0; i < 50; i++) rateLimit(addr)
      expect(rateLimit(addr).success).toBe(false)
      vi.setSystemTime(1_000_000 + 60 * 1000 + 1)
      const reopened = rateLimit(addr)
      expect(reopened.success).toBe(true)
      expect(reopened.remaining).toBe(49)
    } finally {
      vi.useRealTimers()
    }
  })

  it('rateLimitAsync ripiega in memoria senza Supabase configurato', async () => {
    const r = await rateLimitAsync(ip())
    expect(r.success).toBe(true)
  });
})

describe('getClientIp', () => {
  it('preferisce x-forwarded-for (prima voce)', () => {
    expect(getClientIp(headersOf({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('1.2.3.4')
  })

  it('usa x-real-ip come fallback', () => {
    expect(getClientIp(headersOf({ 'x-real-ip': '9.9.9.9' }))).toBe('9.9.9.9')
  })

  it('ritorna unknown senza header', () => {
    expect(getClientIp(headersOf({}))).toBe('unknown')
  })
})
