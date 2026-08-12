import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('next-auth/react', () => ({
  signOut: vi.fn(() => Promise.resolve()),
}))

import { saveSession, clearSession } from '@/lib/session'
import { signOut } from 'next-auth/react'

const store = new Map<string, string>()

beforeEach(() => {
  store.clear()
  ;(globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  }
})

afterEach(() => {
  delete (globalThis as any).localStorage
  delete (globalThis as any).window
  vi.mocked(signOut).mockClear()
})

describe('session', () => {
  it('stores token and user and broadcasts the session to the extension', () => {
    const events: any[] = []
    ;(globalThis as any).window = { dispatchEvent: (e: any) => events.push(e.detail) }
    saveSession('tok', { id: 1, name: 'A' })
    expect(store.get('token')).toBe('tok')
    expect(JSON.parse(store.get('user')!)).toEqual({ id: 1, name: 'A' })
    expect(events).toEqual([{ token: 'tok', user: { id: 1, name: 'A' } }])
  })

  it('ignores missing arguments', () => {
    saveSession('', null)
    expect(store.size).toBe(0)
    saveSession('tok', null)
    expect(store.size).toBe(0)
  })

  it('clearSession removes the session, signs out and broadcasts logout', () => {
    const events: any[] = []
    ;(globalThis as any).window = { dispatchEvent: (e: any) => events.push(e.detail) }
    saveSession('tok', { id: 1 })
    clearSession()
    expect(store.has('token')).toBe(false)
    expect(store.has('user')).toBe(false)
    expect(signOut).toHaveBeenCalledWith({ redirect: false })
    expect(events).toEqual([{ token: 'tok', user: { id: 1 } }, null])
  })

  it('clearSession is safe when nothing was stored', () => {
    expect(() => clearSession()).not.toThrow()
    expect(signOut).toHaveBeenCalled()
  })
})
