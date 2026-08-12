import { describe, it, expect, afterEach } from 'vitest'
import { syncAuthToExtension, syncLogoutToExtension } from '@/lib/auth-sync'

if (typeof (globalThis as any).CustomEvent === 'undefined') {
  ;(globalThis as any).CustomEvent = class {
    type: string
    detail: any
    constructor(type: string, init?: { detail?: any }) {
      this.type = type
      this.detail = init?.detail
    }
  }
}

afterEach(() => {
  delete (globalThis as any).window
})

describe('auth-sync', () => {
  it('dispatches the auth-change event with the session', () => {
    const events: any[] = []
    ;(globalThis as any).window = {
      dispatchEvent: (e: any) => events.push({ type: e.type, detail: e.detail }),
    }
    syncAuthToExtension('tok', { id: 1 })
    expect(events).toEqual([
      { type: 'resumari-auth-change', detail: { token: 'tok', user: { id: 1 } } },
    ])
  })

  it('dispatches a null detail on logout', () => {
    const events: any[] = []
    ;(globalThis as any).window = {
      dispatchEvent: (e: any) => events.push(e.detail),
    }
    syncLogoutToExtension()
    expect(events).toEqual([null])
  })

  it('is safe without arguments or a window', () => {
    expect(() => syncAuthToExtension('', null)).not.toThrow()
    expect(() => syncAuthToExtension('t', null)).not.toThrow()
    expect(() => syncLogoutToExtension()).not.toThrow()
  })
})
