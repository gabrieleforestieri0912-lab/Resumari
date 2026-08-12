import { describe, it, expect } from 'vitest'
import proxy from '@/proxy'

function fakeRequest(method: string, origin: string | null, pathname = '/api/video') {
  return {
    method,
    nextUrl: { pathname },
    headers: new Headers(origin ? { origin } : undefined),
  } as any
}

describe('CORS proxy (src/proxy.ts)', () => {
  it('echoes the chrome-extension origin on API responses', () => {
    const res = proxy(fakeRequest('POST', 'chrome-extension://abc123def'))
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('chrome-extension://abc123def')
  })

  it('answers the OPTIONS preflight for the extension', () => {
    const res = proxy(fakeRequest('OPTIONS', 'chrome-extension://abc123def'))
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('chrome-extension://abc123def')
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Authorization')
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
  })

  it('allows local dev origins', () => {
    const res = proxy(fakeRequest('POST', 'http://localhost:3000'))
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000')
  })

  it('does not add CORS headers for foreign web origins', () => {
    const res = proxy(fakeRequest('POST', 'https://evil.example'))
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('does not add CORS headers without an Origin header', () => {
    const res = proxy(fakeRequest('POST', null))
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('leaves non-API paths untouched', () => {
    const res = proxy(fakeRequest('GET', 'chrome-extension://abc123def', '/'))
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })
})
