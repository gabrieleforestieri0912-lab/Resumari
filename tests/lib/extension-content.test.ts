import { describe, it, expect } from 'vitest'
import vm from 'node:vm'
import { content } from '../../scripts/build-extension'

type Element = any
type Listener = (msg: any, sender: any, sendResponse: any) => void

function makeElement(tag: string): Element {
  const listeners: Record<string, Function[]> = {}
  const el: Element = {
    tagName: tag.toUpperCase(),
    className: '',
    id: '',
    innerHTML: '',
    textContent: '',
    style: {},
    children: [] as Element[],
    listeners,
    addEventListener(type: string, cb: Function) {
      ;(listeners[type] ||= []).push(cb)
    },
    appendChild(child: Element) {
      el.children.push(child)
      return child
    },
    insertBefore(child: Element) {
      el.children.push(child)
      return child
    },
    remove() {},
    contains() {
      return false
    },
    querySelector(sel: string) {
      const matches = (c: Element) => {
        if (sel.startsWith('.')) return c.className === sel.slice(1)
        if (sel.startsWith('#')) return c.id === sel.slice(1)
        const m = sel.match(/^([a-z0-9-]+)(?:#([a-z0-9-]+))?/)
        if (m) {
          const tagMatch = c.tagName === m[1].toUpperCase()
          const idMatch = !m[2] || c.id === m[2]
          return tagMatch && idMatch
        }
        return false
      }
      const stack = [...el.children]
      while (stack.length) {
        const c = stack.pop()
        if (matches(c)) return c
        stack.push(...(c.children || []))
      }
      return null
    },
    querySelectorAll(sel: string) {
      const found: Element[] = []
      const stack = [...el.children]
      while (stack.length) {
        const c = stack.pop()
        if (sel.startsWith('.')) {
          if (c.className === sel.slice(1)) found.push(c)
        } else if (c.tagName === sel.toUpperCase()) {
          found.push(c)
        }
        stack.push(...(c.children || []))
      }
      return found
    },
    closest() {
      return null
    },
    setAttribute() {},
    classList: {
      add() {},
      remove() {},
    },
    onclick: null,
  }
  return el
}

function createHarness(
  opts: { hostname?: string; pathname?: string; href?: string; origin?: string } = {},
) {
  const captured = {
    storage: new Map<string, unknown>(),
    sentMessages: [] as unknown[],
    messageListeners: [] as Listener[],
    dispatchedEvents: [] as Array<{ type: string; detail: any }>,
    localStorage: {} as Record<string, string>,
    domReadyHandlers: [] as Function[],
    observed: [] as string[],
    responses: [] as unknown[],
    querySelectorAllCalls: 0,
    mutationCallback: null as Function | null,
    windowListeners: [] as Array<{ type: string; cb: Function }>,
    storageChangeListeners: [] as Function[],
  }

  // Minimal functional timer so debounced/throttled work can be flushed.
  let nextTimerId = 1
  const timers = new Map<number, { fn: Function }>()
  const setTimeoutMock = (fn: Function) => {
    const id = nextTimerId++
    timers.set(id, { fn })
    return id
  }
  const clearTimeoutMock = (id: number) => {
    timers.delete(id)
  }
  const flushTimers = () => {
    const pending = [...timers.values()]
    timers.clear()
    for (const t of pending) t.fn()
  }

  const queryMap = new Map<string, Element>()
  const queryAllMap = new Map<string, Element[]>()

  const documentMock: Element = {
    readyState: 'loading',
    head: makeElement('head'),
    body: makeElement('body'),
    getElementById: (id: string) => {
      const stack = [...documentMock.head.children, ...documentMock.body.children]
      while (stack.length) {
        const c = stack.pop()
        if (c.id === id) return c
        stack.push(...(c.children || []))
      }
      return null
    },
    createElement: (tag: string) => makeElement(tag),
    addEventListener: (type: string, cb: Function) => {
      if (type === 'DOMContentLoaded') captured.domReadyHandlers.push(cb)
    },
    querySelector: (sel: string) => queryMap.get(sel) ?? null,
    querySelectorAll: (sel: string) => {
      captured.querySelectorAllCalls++
      return queryAllMap.get(sel) ?? []
    },
  }

  const chromeMock = {
    runtime: {
      id: 'fake-ext',
      getURL: (p: string) => `chrome-extension://fake/${p}`,
      onMessage: {
        addListener: (cb: Listener) => captured.messageListeners.push(cb),
      },
      sendMessage: (msg: unknown) => captured.sentMessages.push(msg),
    },
    storage: {
      local: {
        set: (obj: Record<string, unknown>) => {
          for (const k of Object.keys(obj)) captured.storage.set(k, obj[k])
        },
        remove: (k: string) => captured.storage.delete(k),
        get: (key: string, cb?: (res: Record<string, unknown>) => void) => {
          const out: Record<string, unknown> = {}
          const keys = Array.isArray(key) ? key : [key]
          for (const k of keys) {
            if (captured.storage.has(k)) out[k] = captured.storage.get(k)
          }
          if (cb) cb(out)
        },
      },
      onChanged: {
        addListener: (cb: Function) => captured.storageChangeListeners.push(cb),
        removeListener: () => {},
      },
    },
    tabs: { create: () => {} },
    sidePanel: { open: () => {} },
    action: { onClicked: { addListener: () => {} } },
  }

  const sandbox: Record<string, any> = {
    chrome: chromeMock,
    document: documentMock,
    location: {
      hostname: opts.hostname ?? 'www.youtube.com',
      pathname: opts.pathname ?? '/watch',
      href: opts.href ?? 'https://www.youtube.com/watch?v=abc123def45',
      origin: opts.origin ?? 'https://' + (opts.hostname ?? 'www.youtube.com'),
    },
    window: {
      dispatchEvent: (e: any) => captured.dispatchedEvents.push({ type: e.type, detail: e.detail }),
      addEventListener: (type: string, cb: Function) => captured.windowListeners.push({ type, cb }),
      removeEventListener: () => {},
      name: '',
    },
    localStorage: {
      getItem: (k: string) => captured.localStorage[k] ?? null,
      setItem: (k: string, v: string) => {
        captured.localStorage[k] = v
      },
      removeItem: (k: string) => {
        delete captured.localStorage[k]
      },
    },
    CustomEvent: class {
      type: string
      detail: any
      constructor(type: string, init?: { detail?: any }) {
        this.type = type
        this.detail = init?.detail
      }
    },
    MutationObserver: class {
      constructor(cb: Function) {
        captured.observed.push('constructed')
        captured.mutationCallback = cb
      }
      observe(target: Element) {
        captured.observed.push(`observe:${target.tagName || 'unknown'}`)
      }
      disconnect() {}
    },
    URLSearchParams,
    URL,
    setTimeout: setTimeoutMock,
    clearTimeout: clearTimeoutMock,
    getComputedStyle: (el: Element) => ({ position: el.style?.position || 'static' }),
    console,
  }

  vm.createContext(sandbox)
  vm.runInContext(content, sandbox)

  return {
    captured,
    queryMap,
    queryAllMap,
    document: documentMock,
    call(fn: string, ...args: any[]) {
      return sandbox[fn](...args)
    },
    fireDOMContentLoaded() {
      for (const h of captured.domReadyHandlers) h()
    },
    flushTimers() {
      flushTimers()
    },
    fireMutation() {
      captured.mutationCallback?.()
    },
    fireWindowEvent(type: string, detail: any) {
      for (const l of captured.windowListeners) {
        if (l.type === type) l.cb({ detail })
      }
    },
    fireStorageChange(changes: Record<string, any>, area = 'local') {
      for (const l of captured.storageChangeListeners) l(changes, area)
    },
    invokeMessage(msg: any, sender: any = { id: 'fake-ext' }) {
      const sendResponse = (res: unknown) => captured.responses.push(res)
      for (const l of captured.messageListeners) l(msg, sender, sendResponse)
      return captured.responses
    },
  }
}

describe('extension content script (content.js)', () => {
  describe('YouTube detection', () => {
    it('detects youtube.com as a platform', () => {
      const h = createHarness({ hostname: 'www.youtube.com' })
      expect(h.call('getPlatform')).toBe('youtube')
      expect(h.call('isVideoPage')).toBe(true)
    })

    it('returns null platform for non-YouTube sites', () => {
      const h = createHarness({ hostname: 'resumari.com' })
      expect(h.call('getPlatform')).toBeNull()
      expect(h.call('isVideoPage')).toBe(false)
      expect(h.call('getVideoId')).toBeNull()
    })

    it('parses the video id from watch URLs', () => {
      const h = createHarness()
      expect(h.call('getVideoIdFromUrl', 'https://www.youtube.com/watch?v=abc123def45')).toBe(
        'abc123def45',
      )
      expect(h.call('getVideoIdFromUrl', 'https://www.youtube.com/watch?list=PLx')).toBeNull()
      expect(h.call('getVideoId')).toBe('abc123def45')
    })

    it('parses the video id from /shorts/ URLs (no ?v= parameter)', () => {
      const h = createHarness()
      expect(h.call('getVideoIdFromUrl', 'https://www.youtube.com/shorts/dApurie2r8k')).toBe(
        'dApurie2r8k',
      )
      expect(h.call('getVideoIdFromUrl', 'https://www.youtube.com/shorts/dApurie2r8k?si=xyz')).toBe(
        'dApurie2r8k',
      )
      // Legacy watch URLs keep working
      expect(h.call('getVideoIdFromUrl', 'https://www.youtube.com/watch?v=abc123def45')).toBe(
        'abc123def45',
      )
    })

    it('only treats /watch as a video page', () => {
      const h = createHarness({ pathname: '/', href: 'https://www.youtube.com/' })
      expect(h.call('isVideoPage')).toBe(false)
    })
  })

  describe('openSidePanel', () => {
    it('stores the pending transcript and asks to open the side panel', () => {
      const h = createHarness()
      h.call('openSidePanel', 'abc123def45', 'youtube')

      const pending = h.captured.storage.get('pendingTranscript') as Record<string, any>
      expect(pending).toBeDefined()
      expect(pending.videoId).toBe('abc123def45')
      expect(pending.platform).toBe('youtube')
      expect(pending.url).toBe('https://www.youtube.com/watch?v=abc123def45')
      expect(pending.autoProcess).toBe(true)
      expect(typeof pending.timestamp).toBe('number')

      expect(h.captured.sentMessages).toContainEqual({ type: 'openSidePanel' })
    })

    it('does nothing without a video id', () => {
      const h = createHarness()
      h.call('openSidePanel', null, 'youtube')
      expect(h.captured.storage.has('pendingTranscript')).toBe(false)
      expect(h.captured.sentMessages).toHaveLength(0)
    })
  })

  describe('auth sync messages', () => {
    it('stores the token and user on AUTH_SYNC (on the Resumari site)', () => {
      const h = createHarness({ hostname: 'resumari.com' })
      const responses = h.invokeMessage({
        type: 'AUTH_SYNC',
        token: 'aaa.bbb.ccc',
        user: { id: 'u1', name: 'Test' },
      })

      expect(h.captured.localStorage['token']).toBe('aaa.bbb.ccc')
      expect(JSON.parse(h.captured.localStorage['user'])).toEqual({ id: 'u1', name: 'Test' })
      expect(h.captured.dispatchedEvents).toContainEqual(
        expect.objectContaining({ type: 'resumari-auth-changed' }),
      )
      expect(responses).toEqual([{ success: true }])
    })

    it('never writes the token into page localStorage off the Resumari site (e.g. YouTube)', () => {
      const h = createHarness({ hostname: 'www.youtube.com' })
      h.invokeMessage({
        type: 'AUTH_SYNC',
        token: 'aaa.bbb.ccc',
        user: { id: 'u1' },
      })

      // chrome.storage is fine (extension-private), but the page must never
      // see the token on a third-party origin.
      expect(h.captured.storage.get('resumariAuth')).toEqual({ token: 'aaa.bbb.ccc', user: { id: 'u1' } })
      expect(h.captured.localStorage['token']).toBeUndefined()
      expect(h.captured.dispatchedEvents).toHaveLength(0)
    })

    it('rejects AUTH_SYNC payloads whose token is not a JWT', () => {
      const h = createHarness({ hostname: 'resumari.com' })
      h.invokeMessage({ type: 'AUTH_SYNC', token: 'not-a-jwt', user: { id: 'u1' } })
      expect(h.captured.storage.has('resumariAuth')).toBe(false)
      expect(h.captured.localStorage['token']).toBeUndefined()
    })

    it('ignores runtime messages from unknown senders', () => {
      const h = createHarness({ hostname: 'resumari.com' })
      h.invokeMessage({ type: 'AUTH_SYNC', token: 'aaa.bbb.ccc', user: { id: 'u1' } }, { id: 'evil-ext' })
      expect(h.captured.storage.has('resumariAuth')).toBe(false)
      expect(h.captured.localStorage['token']).toBeUndefined()
    })

    it('clears the session on AUTH_LOGOUT', () => {
      const h = createHarness({ hostname: 'resumari.com' })
      h.invokeMessage({ type: 'AUTH_SYNC', token: 'aaa.bbb.ccc', user: { id: 'u1' } })
      const responses = h.invokeMessage({ type: 'AUTH_LOGOUT' })

      expect(h.captured.localStorage['token']).toBeUndefined()
      expect(h.captured.localStorage['user']).toBeUndefined()
      expect(h.captured.dispatchedEvents.at(-1)).toEqual(
        expect.objectContaining({ type: 'resumari-auth-changed', detail: null }),
      )
      expect(responses.at(-1)).toEqual({ success: true })
    })
  })

  describe('shared auth bridge (chrome.storage)', () => {
    it('mirrors AUTH_SYNC into chrome.storage', () => {
      const h = createHarness()
      h.invokeMessage({ type: 'AUTH_SYNC', token: 'aaa.bbb.ccc', user: { id: 'u1' } })
      expect(h.captured.storage.get('resumariAuth')).toEqual({ token: 'aaa.bbb.ccc', user: { id: 'u1' } })
    })

    it('clears chrome.storage on AUTH_LOGOUT', () => {
      const h = createHarness()
      h.invokeMessage({ type: 'AUTH_SYNC', token: 'aaa.bbb.ccc', user: { id: 'u1' } })
      h.invokeMessage({ type: 'AUTH_LOGOUT' })
      expect(h.captured.storage.has('resumariAuth')).toBe(false)
    })

    it('writes chrome.storage when the site dispatches resumari-auth-change', () => {
      const h = createHarness({ hostname: 'resumari.com' })
      h.fireWindowEvent('resumari-auth-change', { token: 'aaa.bbb.ccc', user: { id: 'u2' } })
      expect(h.captured.storage.get('resumariAuth')).toEqual({ token: 'aaa.bbb.ccc', user: { id: 'u2' } })
    })

    it('ignores resumari-auth-change events off the Resumari site', () => {
      // A hostile page (e.g. YouTube) must not be able to inject shared auth.
      const h = createHarness({ hostname: 'www.youtube.com' })
      h.fireWindowEvent('resumari-auth-change', { token: 'aaa.bbb.ccc', user: { id: 'u2' } })
      expect(h.captured.storage.has('resumariAuth')).toBe(false)
    })

    it('ignores resumari-auth-change events with a non-JWT token', () => {
      const h = createHarness({ hostname: 'resumari.com' })
      h.fireWindowEvent('resumari-auth-change', { token: 'not-a-jwt', user: { id: 'u2' } })
      expect(h.captured.storage.has('resumariAuth')).toBe(false)
    })

    it('removes chrome.storage on a logout event from the site', () => {
      const h = createHarness({ hostname: 'resumari.com' })
      h.fireWindowEvent('resumari-auth-change', { token: 'aaa.bbb.ccc', user: { id: 'u2' } })
      h.fireWindowEvent('resumari-auth-change', null)
      expect(h.captured.storage.has('resumariAuth')).toBe(false)
    })

    it('honours a sticky panel logout: site login cannot re-inject auth', () => {
      const h = createHarness({ hostname: 'resumari.com' })
      h.captured.storage.set('resumariLoggedOut', true)
      h.fireWindowEvent('resumari-auth-change', { token: 'aaa.bbb.ccc', user: { id: 'u2' } })
      expect(h.captured.storage.has('resumariAuth')).toBe(false)
    })

    it('mirrors panel logins into the site session on resumari.com', () => {
      const h = createHarness({ hostname: 'resumari.com' })
      h.fireStorageChange({ resumariAuth: { newValue: { token: 'aaa.bbb.ccc', user: { id: 'u3' } } } })
      expect(h.captured.localStorage['token']).toBe('aaa.bbb.ccc')
      expect(JSON.parse(h.captured.localStorage['user'])).toEqual({ id: 'u3' })
      expect(h.captured.dispatchedEvents.at(-1)).toEqual(
        expect.objectContaining({ type: 'resumari-auth-changed' }),
      )
    })

    it('does not touch the page session on non-Resumari origins', () => {
      const h = createHarness({ hostname: 'www.youtube.com' })
      h.fireStorageChange({ resumariAuth: { newValue: { token: 'aaa.bbb.ccc', user: { id: 'u3' } } } })
      expect(h.captured.localStorage['token']).toBeUndefined()
      expect(h.captured.dispatchedEvents).toHaveLength(0)
    })

    it('clears the site session when the shared auth is removed', () => {
      const h = createHarness({ hostname: 'resumari.com' })
      h.captured.localStorage['token'] = 'old'
      h.captured.localStorage['user'] = '{}'
      h.fireStorageChange({ resumariAuth: { newValue: undefined } })
      expect(h.captured.localStorage['token']).toBeUndefined()
      expect(h.captured.localStorage['user']).toBeUndefined()
      expect(h.captured.dispatchedEvents.at(-1)).toEqual(
        expect.objectContaining({ type: 'resumari-auth-changed', detail: null }),
      )
    })
  })

  describe('GET_VIDEO_ID message', () => {
    it('answers with the current video id on a watch page', () => {
      const h = createHarness()
      const responses = h.invokeMessage({ type: 'GET_VIDEO_ID' })
      expect(responses).toEqual([{ videoId: 'abc123def45' }])
    })

    it('answers with null off YouTube', () => {
      const h = createHarness({ hostname: 'resumari.com' })
      const responses = h.invokeMessage({ type: 'GET_VIDEO_ID' })
      expect(responses).toEqual([{ videoId: null }])
    })
  })

  describe('thumbnail button injection', () => {
    function makeThumb() {
      const link = makeElement('a')
      link.href = 'https://www.youtube.com/watch?v=abc123def45'
      link.id = 'thumbnail'
      const thumb = makeElement('ytd-thumbnail')
      thumb.appendChild(link)
      thumb.style.setProperty = () => {}
      thumb.classList = { add: () => {} }
      return { thumb, link }
    }

    it('adds a button linked to the video id', () => {
      const h = createHarness()
      const { thumb, link } = makeThumb()
      h.call('addThumbnailButton', thumb)

      // The button is anchored to the wrapping link (it survives the hover
      // preview re-render), not to the thumbnail itself.
      const btn = link.children.find((c: Element) => c.className === 'resumari-thumb-btn')
      expect(btn).toBeDefined()
      expect(btn.innerHTML).toContain('chrome-extension://fake/resumari.png')
      expect(link.style.position).toBe('relative')
    })

    it('anchors the button to the link wrapper so the hover preview cannot remove it', () => {
      const h = createHarness()
      const { thumb, link } = makeThumb()
      h.call('addThumbnailButton', thumb)

      // YouTube re-renders the thumbnail's inner content (img -> video) when
      // the preview plays: a button inside the thumbnail would be deleted,
      // one inside the link wrapper survives.
      expect(link.children.some((c: Element) => c.className === 'resumari-thumb-btn')).toBe(true)
      expect(thumb.children.some((c: Element) => c.className === 'resumari-thumb-btn')).toBe(false)
      expect(link.classList.add).toBeDefined()
    })

    it('does not add a duplicate button', () => {
      const h = createHarness()
      const { thumb, link } = makeThumb()
      h.call('addThumbnailButton', thumb)
      h.call('addThumbnailButton', thumb)
      const buttons = link.children.filter((c: Element) => c.className === 'resumari-thumb-btn')
      expect(buttons).toHaveLength(1)
    })

    it('opens the side panel when the button is clicked and shows a toast', () => {
      const h = createHarness()
      const { thumb, link } = makeThumb()
      h.call('addThumbnailButton', thumb)

      const btn = link.children.find((c: Element) => c.className === 'resumari-thumb-btn')
      const clickHandler = btn.listeners['click'][0]
      clickHandler({ stopPropagation: () => {}, preventDefault: () => {} })

      const pending = h.captured.storage.get('pendingTranscript') as Record<string, any>
      expect(pending.videoId).toBe('abc123def45')

      const toast = h.document.getElementById('resumari-toast')
      expect(toast).toBeTruthy()
      expect(toast.textContent).toContain('Resumari')
    })

    it('skips thumbnails without a playable link', () => {
      const h = createHarness()
      const thumb = makeElement('ytd-thumbnail')
      thumb.querySelector = () => null
      thumb.closest = () => null
      h.call('addThumbnailButton', thumb)
      expect(thumb.children).toHaveLength(0)
    })

    it('handles the modern YouTube structure where the link wraps the thumbnail (watch sidebar)', () => {
      const h = createHarness()
      const link = makeElement('a')
      link.href = 'https://www.youtube.com/watch?v=abc123def45'
      const thumb = makeElement('yt-thumbnail-view-model')
      const parent = makeElement('yt-lockup-view-model')
      parent.appendChild(link)
      parent.appendChild(thumb)
      // The thumbnail has no children and closest() is a no-op in the mock,
      // so the link can only be found via the new parentElement fallback.
      thumb.parentElement = parent
      thumb.style.setProperty = () => {}
      thumb.classList = { add: () => {} }

      h.call('addThumbnailButton', thumb)

      const btn = link.children.find((c: Element) => c.className === 'resumari-thumb-btn')
      expect(btn).toBeDefined()
      expect(btn.innerHTML).toContain('chrome-extension://fake/resumari.png')
    })

    it('finds the link when it is an ancestor of the thumbnail (closest path)', () => {
      const h = createHarness()
      const link = makeElement('a')
      link.href = 'https://www.youtube.com/watch?v=abc123def45'
      const thumb = makeElement('yt-thumbnail-view-model')
      thumb.style.setProperty = () => {}
      thumb.classList = { add: () => {} }
      // Emulates a thumbnail whose wrapping link is an ancestor: closest()
      // resolves it even though it is not a child of the thumbnail.
      thumb.closest = (sel: string) => (sel.includes('/watch?v=') ? link : null)

      h.call('addThumbnailButton', thumb)

      const btn = link.children.find((c: Element) => c.className === 'resumari-thumb-btn')
      expect(btn).toBeDefined()
    })

    it('creates a working button on Shorts thumbnails (href /shorts/VIDEO_ID)', () => {
      const h = createHarness()
      const link = makeElement('a')
      link.href = 'https://www.youtube.com/shorts/dApurie2r8k'
      const thumb = makeElement('yt-thumbnail-view-model')
      const parent = makeElement('yt-lockup-view-model')
      parent.appendChild(link)
      parent.appendChild(thumb)
      thumb.parentElement = parent
      thumb.style.setProperty = () => {}
      thumb.classList = { add: () => {} }

      h.call('addThumbnailButton', thumb)

      const btn = link.children.find((c: Element) => c.className === 'resumari-thumb-btn')
      expect(btn).toBeDefined()

      const clickHandler = btn.listeners['click'][0]
      clickHandler({ stopPropagation: () => {}, preventDefault: () => {} })

      const pending = h.captured.storage.get('pendingTranscript') as Record<string, any>
      expect(pending.videoId).toBe('dApurie2r8k')
    })

    it('injects a single button per video even if both thumbnail element types match', () => {
      const h = createHarness({ hostname: 'www.youtube.com', pathname: '/' })
      const link = makeElement('a')
      link.href = 'https://www.youtube.com/watch?v=abc123def45'
      const makeThumb = () => {
        const t = makeElement('yt-thumbnail-view-model')
        t.appendChild(link)
        t.style.setProperty = () => {}
        t.classList = { add: () => {} }
        return t
      }
      const thumbA = makeThumb()
      const thumbB = makeThumb()
      h.queryAllMap.set('ytd-thumbnail, yt-thumbnail-view-model', [thumbA, thumbB])

      h.call('injectThumbnailButtons')

      const buttons = link.children.filter((c: Element) => c.className === 'resumari-thumb-btn')
      expect(buttons).toHaveLength(1)
    })
  })

  describe('thumbnail button hover persistence (hover preview)', () => {
    it('keeps the button visible with an active class while the pointer is inside the thumbnail', () => {
      const h = createHarness()
      const link = makeElement('a')
      link.href = 'https://www.youtube.com/watch?v=abc123def45'
      link.id = 'thumbnail'
      const thumb = makeElement('ytd-thumbnail')
      thumb.appendChild(link)
      thumb.style.setProperty = () => {}
      thumb.classList = { add: () => {} }
      thumb.matches = (sel: string) => sel.includes('ytd-thumbnail')

      const classes = new Set<string>()
      link.classList = {
        add: (c: string) => classes.add(c),
        remove: (c: string) => classes.delete(c),
      }

      // The hover preview player is a child of the thumbnail but NOT a child
      // of the link: moving onto it must not hide the button.
      const preview = makeElement('div')
      preview.parentElement = thumb
      thumb.contains = (el: Element) => el === preview

      // mouseover on the preview overlay -> inject + activate
      h.call('handleThumbHover', { type: 'mouseover', target: preview })
      expect(link.children.some((c: Element) => c.className === 'resumari-thumb-btn')).toBe(true)
      expect(classes.has('resumari-thumb-active')).toBe(true)

      // mouseout but the pointer is still inside the thumbnail -> stays active
      h.call('handleThumbHover', { type: 'mouseout', target: preview, relatedTarget: preview })
      expect(classes.has('resumari-thumb-active')).toBe(true)

      // mouseout leaving the thumbnail entirely -> deactivates
      thumb.contains = (el: Element) => false
      h.call('handleThumbHover', { type: 'mouseout', target: preview, relatedTarget: makeElement('div') })
      expect(classes.has('resumari-thumb-active')).toBe(false)
    })

    it('shows the button immediately when re-injected over an already-hovered link', () => {
      const h = createHarness()
      const link = makeElement('a')
      link.href = 'https://www.youtube.com/watch?v=abc123def45'
      link.matches = (sel: string) => sel === ':hover'
      const added: string[] = []
      link.classList = { add: (c: string) => added.push(c), remove: () => {} }

      h.call('addButtonToLink', link)

      expect(link.children.some((c: Element) => c.className === 'resumari-thumb-btn')).toBe(true)
      expect(added).toContain('resumari-thumb-container')
      expect(added).toContain('resumari-thumb-active')
    })
  })

  describe('channel page "Trascrivi canale" chip', () => {
    it('detects channel pages (/@handle, /channel/…, /user/…, /c/…)', () => {
      expect(createHarness({ pathname: '/@handle' }).call('isChannelPage')).toBe(true)
      expect(createHarness({ pathname: '/@handle/videos' }).call('isChannelPage')).toBe(true)
      expect(createHarness({ pathname: '/channel/UCabc' }).call('isChannelPage')).toBe(true)
      expect(createHarness({ pathname: '/user/SomeName' }).call('isChannelPage')).toBe(true)
      expect(createHarness({ pathname: '/c/SomeName' }).call('isChannelPage')).toBe(true)
      // Non-channel pages stay off.
      expect(createHarness({ pathname: '/watch' }).call('isChannelPage')).toBe(false)
      expect(createHarness({ pathname: '/' }).call('isChannelPage')).toBe(false)
      expect(createHarness({ hostname: 'resumari.com', pathname: '/@handle' }).call('isChannelPage')).toBe(false)
    })

    it('builds the canonical channel URL from the current page', () => {
      const h = createHarness({ hostname: 'www.youtube.com', pathname: '/@handle/videos' })
      expect(h.call('getChannelUrl')).toBe('https://www.youtube.com/@handle')

      const h2 = createHarness({ hostname: 'www.youtube.com', pathname: '/channel/UCabc' })
      expect(h2.call('getChannelUrl')).toBe('https://www.youtube.com/channel/UCabc')

      const h3 = createHarness({ hostname: 'www.youtube.com', pathname: '/user/SomeName' })
      expect(h3.call('getChannelUrl')).toBe('https://www.youtube.com/user/SomeName')
    })

    it('asks the background to open the Resumari site queuing the whole channel', () => {
      const h = createHarness({ pathname: '/@handle' })
      h.call('openChannelTranscription', 'https://www.youtube.com/@handle')

      const msg = h.captured.sentMessages.find(
        (m: any) => m.type === 'openChannelTab',
      ) as any
      expect(msg).toBeDefined()
      expect(msg.url).toContain('/videos?channel=')
      expect(msg.url).toContain(encodeURIComponent('https://www.youtube.com/@handle'))
      // Raw content (marker not yet replaced at build time) falls back to the
      // local dev server; contentJsWithBase() bakes the real host instead.
      expect(msg.url).toMatch(/^http:\/\/localhost:3000\/videos\?channel=/)
    })

    it('injects the chip next to the subscribe button and queues the channel on click', () => {
      const h = createHarness({ hostname: 'www.youtube.com', pathname: '/@handle' })
      const sub = makeElement('ytd-subscribe-button-renderer')
      const host = makeElement('div')
      host.appendChild(sub)
      sub.parentElement = host
      h.document.body.appendChild(host)
      h.queryMap.set(
        '#subscribe-button, ytd-subscribe-button-renderer, yt-subscribe-button-view-model',
        sub,
      )

      h.call('injectChannelPageButton')

      const chip = host.children.find((c: Element) => c.id === 'resumari-channel-btn')
      expect(chip).toBeDefined()
      expect(chip.className).toBe('resumari-chip')
      expect(chip.innerHTML).toContain('Trascrivi canale')

      chip.parentElement = host
      chip.onclick()

      const toast = h.document.getElementById('resumari-toast')
      expect(toast).toBeTruthy()
      expect(toast.textContent).toContain('Resumari')
      const msg = h.captured.sentMessages.find(
        (m: any) => m.type === 'openChannelTab',
      ) as any
      expect(msg).toBeDefined()
      expect(msg.url).toContain(encodeURIComponent('https://www.youtube.com/@handle'))
    })

    it('does not inject the chip on video pages and removes a stale one', () => {
      const h = createHarness({ hostname: 'www.youtube.com', pathname: '/watch' })
      const sub = makeElement('ytd-subscribe-button-renderer')
      const host = makeElement('div')
      host.appendChild(sub)
      sub.parentElement = host
      h.document.body.appendChild(host)
      h.queryMap.set(
        '#subscribe-button, ytd-subscribe-button-renderer, yt-subscribe-button-view-model',
        sub,
      )

      h.call('injectChannelPageButton')
      expect(host.children).toHaveLength(1) // only the subscribe button, no chip
    })

    it('does not duplicate the chip when injection runs again (SPA navigation)', () => {
      const h = createHarness({ hostname: 'www.youtube.com', pathname: '/@handle' })
      const sub = makeElement('ytd-subscribe-button-renderer')
      const host = makeElement('div')
      host.appendChild(sub)
      sub.parentElement = host
      h.document.body.appendChild(host)
      h.queryMap.set(
        '#subscribe-button, ytd-subscribe-button-renderer, yt-subscribe-button-view-model',
        sub,
      )

      h.call('injectChannelPageButton')
      const chip = host.children.find((c: Element) => c.id === 'resumari-channel-btn')
      chip.parentElement = host

      h.call('injectChannelPageButton')
      expect(host.children.filter((c: Element) => c.id === 'resumari-channel-btn')).toHaveLength(1)
    })
  })

  describe('video page "Trascrivi" chip', () => {
    it('injects the chip into the actions bar on a watch page', () => {
      const h = createHarness({ hostname: 'www.youtube.com', pathname: '/watch' })
      const actions = makeElement('div')
      h.queryMap.set('ytd-watch-metadata #actions, ytd-video-primary-info-renderer #actions', actions)

      h.call('injectVideoPageButton')

      expect(actions.children).toHaveLength(1)
      const chip = actions.children[0]
      expect(chip.id).toBe('resumari-transcribe-btn')
      expect(chip.className).toBe('resumari-chip')
      expect(chip.innerHTML).toContain('Trascrivi')
    })

    it('does not inject the chip on non-video pages', () => {
      const h = createHarness({ hostname: 'www.youtube.com', pathname: '/' })
      const actions = makeElement('div')
      h.queryMap.set('ytd-watch-metadata #actions, ytd-video-primary-info-renderer #actions', actions)

      h.call('injectVideoPageButton')

      expect(actions.children).toHaveLength(0)
    })
  })

  describe('YouTube action button style', () => {
    it('styles the "Trascrivi" and "Trascrivi canale" chips as purple glow glassmorphic buttons', () => {
      expect(content).toContain('.resumari-chip { display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 14px;border-radius:18px;border:1px solid rgba(167,139,250,0.6);background:rgba(147,51,234,0.55);color:#fff')
      expect(content).toContain('cubic-bezier(0.4,0,0.2,1)')
      expect(content).toContain('backdrop-filter:blur(10px)')
      expect(content).toContain('box-shadow:0 4px 20px rgba(147,51,234,0.45)')
      expect(content).toContain('html[dark] .resumari-chip { background:rgba(147,51,234,0.4);color:#fff')
      expect(content).toContain('html[dark] .resumari-chip:hover { background:rgba(147,51,234,0.62)')
    })

    it('gives the chip a tactile active state and honours prefers-reduced-motion', () => {
      expect(content).toContain('resumari-chip:active { transform:scale(0.97)')
      expect(content).toContain('prefers-reduced-motion:reduce')
    })

    it('keeps the original purple thumbnail button style (restored)', () => {
      expect(content).toContain('width:32px !important;height:32px !important')
      expect(content).toContain('background:rgba(0,0,0,0.65)')
      expect(content).toContain('resumari-thumb-btn:hover { background:rgba(147,51,234,0.55)')
      expect(content).not.toContain('resumari-thumb-btn:hover { background:rgba(255,255,255,0.18)')
    })

    it('shows the thumbnail button on hover of the link wrapper and lockup/sidebar structures', () => {
      // The button is a child of the wrapping link, so hover rules target the
      // link/container plus the surrounding renderers.
      expect(content).toContain('a#thumbnail:hover .resumari-thumb-btn')
      expect(content).toContain('.resumari-thumb-container:hover .resumari-thumb-btn')
      expect(content).toContain('yt-lockup-view-model:hover .resumari-thumb-btn')
    })
  })

  describe('init()', () => {
    it('injects the styles, watches the DOM and scans thumbnails on DOMContentLoaded', () => {
      const h = createHarness({ hostname: 'www.youtube.com', pathname: '/watch' })
      h.fireDOMContentLoaded()

      expect(h.document.head.children).toHaveLength(1)
      expect(h.document.head.children[0].id).toBe('resumari-styles')
      expect(h.captured.observed).toContain('observe:BODY')
    })

    it('does not duplicate the injected styles', () => {
      const h = createHarness()
      h.fireDOMContentLoaded()
      h.fireDOMContentLoaded()
      expect(h.document.head.children).toHaveLength(1)
    })

    it('scans existing thumbnails on startup (both legacy and modern structures)', () => {
      const h = createHarness({ hostname: 'www.youtube.com', pathname: '/' })
      const link = makeElement('a')
      link.href = 'https://www.youtube.com/watch?v=abc123def45'
      link.id = 'thumbnail'
      const thumb = makeElement('ytd-thumbnail')
      thumb.appendChild(link)
      thumb.style.setProperty = () => {}
      thumb.classList = { add: () => {} }
      h.queryAllMap.set('ytd-thumbnail, yt-thumbnail-view-model', [thumb])

      h.fireDOMContentLoaded()

      expect(link.children.some((c: Element) => c.className === 'resumari-thumb-btn')).toBe(true)
    })

    it('debounces bursts of DOM mutations into a single injection pass', () => {
      const h = createHarness({ hostname: 'www.youtube.com', pathname: '/' })
      h.fireDOMContentLoaded()
      const before = h.captured.querySelectorAllCalls

      h.fireMutation()
      h.fireMutation()
      h.fireMutation()

      // Mutations alone must not trigger immediate scans.
      expect(h.captured.querySelectorAllCalls).toBe(before)

      // One debounced run (mutations collapsed) + the two delayed startup scans.
      h.flushTimers()
      expect(h.captured.querySelectorAllCalls).toBe(before + 3)
    })
  })
})
