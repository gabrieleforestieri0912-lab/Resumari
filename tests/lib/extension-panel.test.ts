import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { panelJsWithBase } from '../../scripts/build-extension'

const panelDir = path.join(__dirname, '../../scripts/extension-panel')

const html = fs.readFileSync(path.join(panelDir, 'panel.html'), 'utf-8')
const css = fs.readFileSync(path.join(panelDir, 'panel.css'), 'utf-8')
const js = panelJsWithBase()

describe('standalone side panel (scripts/extension-panel)', () => {
  describe('panel.html', () => {
    it('is a self-contained app without inline scripts or handlers (MV3 CSP)', () => {
      expect(html).not.toMatch(/<script(?![^>]*src=)[^>]*>/i)
      expect(html).not.toMatch(/\son[a-z]+\s*=\s*["'][^"']*["']/i)
      expect(html).toContain('<script src="panel.js">')
      expect(html).toContain('<link rel="stylesheet" href="panel.css"')
    })

    it('shows the login page for a new user with password and code modes', () => {
      expect(html).toContain('id="view-login"')
      expect(html).toContain('Accedi a')
      // The brand word carries the pulsing glow, same as the landing hero.
      expect(html).toContain('class="text-glow-pulse"')
      expect(html).toContain('>Resumari<')
      expect(html).toContain('login-email')
      expect(html).toContain('login-password')
      expect(html).toContain('login-code')
      // Two access modes: email+password form or magic code.
      expect(html).toContain('data-mode="password"')
      expect(html).toContain('data-mode="code"')
      expect(html).toContain('Password')
      expect(html).toContain('Codice')
      expect(html).toContain('login-submit-label')
    })

    it('opens on the transcripts tab after login', () => {
      expect(html).toContain('id="tab-transcripts"')
      expect(html).toContain('Cerca tra le trascrizioni')
      expect(html).toContain('tx-content')
      expect(html).toContain('tx-detail')
      // transcripts is the default active tab
      const activeTab = html.match(/id="(tab-[^"]+)" class="tab tab--active"/)
      expect(activeTab && activeTab[1]).toBe('tab-transcripts')
    })

    it('has account and usage tabs with the expected sections', () => {
      expect(html).toContain('id="tab-account"')
      expect(html).toContain('Crediti disponibili')
      expect(html).toContain('Piani di abbonamento')
      expect(html).toContain('acc-plans')
      expect(html).toContain('id="tab-usage"')
      expect(html).toContain('Usage History')
      expect(html).toContain('usage-stats')
      expect(html).toContain('usage-content')
    })

    it('has left sidebar navigation across the four app tabs', () => {
      // The nav lives in a left sidebar (app__body row) next to the tabs.
      expect(html).toContain('class="app__body"')
      expect(html).toContain('data-tab="transcripts"')
      expect(html).toContain('data-tab="chat"')
      expect(html).toContain('data-tab="account"')
      expect(html).toContain('data-tab="usage"')
      expect(html).toContain('Trascrizioni')
      expect(html).toContain('Chat')
      expect(html).toContain('Account')
      expect(html).toContain('Usage')
      // The nav precedes the first tab inside the body wrapper.
      const bodyIdx = html.indexOf('class="app__body"')
      const navIdx = html.indexOf('<nav class="app__nav"')
      const firstTabIdx = html.indexOf('id="tab-transcripts"')
      expect(bodyIdx).toBeGreaterThan(-1)
      expect(navIdx).toBeGreaterThan(bodyIdx)
      expect(firstTabIdx).toBeGreaterThan(navIdx)
    })

    it('has a chat tab with composer, messages area and context chip', () => {
      expect(html).toContain('id="tab-chat"')
      expect(html).toContain('Chat IA')
      expect(html).toContain('chat-messages')
      expect(html).toContain('chat-input')
      expect(html).toContain('chat-send')
      expect(html).toContain('chat-new')
      expect(html).toContain('chat-ctx')
      expect(html).toContain('chat-ctx-clear')
      // The chat tab sits between transcripts and account.
      const txIdx = html.indexOf('id="tab-transcripts"')
      const chatIdx = html.indexOf('id="tab-chat"')
      const accIdx = html.indexOf('id="tab-account"')
      expect(txIdx).toBeGreaterThan(-1)
      expect(chatIdx).toBeGreaterThan(txIdx)
      expect(accIdx).toBeGreaterThan(chatIdx)
    })

    it('does not use emoji anywhere in the panel', () => {
      const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u
      expect(html).not.toMatch(emoji)
      expect(css).not.toMatch(emoji)
      expect(js).not.toMatch(emoji)
      // The credits badge icon is an SVG, not the old ⚡ glyph.
      expect(html).not.toContain('⚡')
      expect(html).toContain('credits-badge__icon')
    })

    it('exposes a theme picker with Auto / Chiaro / Scuro', () => {
      expect(html).toContain('data-theme="auto"')
      expect(html).toContain('id="theme-btn"')
      expect(html).toContain('id="theme-menu"')
      expect(html).toContain('data-theme-choice="auto"')
      expect(html).toContain('data-theme-choice="light"')
      expect(html).toContain('data-theme-choice="dark"')
      expect(html).toContain('Auto')
      expect(html).toContain('Chiaro')
      expect(html).toContain('Scuro')
    })

    it('also shows the theme picker on the login view (pre-auth users)', () => {
      // The login view has its own floating theme button so new users can
      // switch theme before logging in.
      expect(html).toContain('login__theme')
      // Both instances (login + header) share the same class-based wiring.
      expect(html.match(/class="icon-btn theme-btn"/g)).toHaveLength(2)
    })
  })

  describe('panel.css', () => {
    it('styles the shell, login, cards, plans and timeline', () => {
      expect(css).toContain('.view')
      expect(css).toContain('.login__wrap')
      expect(css).toContain('.app__body')
      expect(css).toContain('.app__nav')
      expect(css).toContain('.nav__item')
      expect(css).toContain('.modal')
      expect(css).toContain('.modal__card')
      expect(css).toContain('.btn--danger')
      expect(css).toContain('.tx-card')
      expect(css).toContain('.plan')
      expect(css).toContain('.usage-event')
      expect(css).toContain('.toast')
      // Chat tab styling
      expect(css).toContain('.chat__messages')
      expect(css).toContain('.chat__bubble')
      expect(css).toContain('.chat__bubble--markdown')
      expect(css).toContain('.chat__composer')
      expect(css).toContain('.chat__typing')
      expect(css).toContain('.chat__ctx')
      expect(css).toContain('.chat__col { min-width: 0; flex: 1; }')
    })

    it('forces [hidden] to hide even on elements with a display rule (e.g. .field)', () => {
      // Regression guard: .field uses display:flex, which would override the
      // UA [hidden] rule and show the code field in password mode (and vice
      // versa). The global [hidden] rule must exist and win.
      expect(css).toMatch(/\[hidden\]\s*\{\s*display:\s*none\s*!important\s*;?\s*\}/i)
    })

    it('defines a dark palette and a system (prefers-color-scheme) fallback', () => {
      // Explicit dark theme applied by panel.js.
      expect(css).toContain('html[data-theme="dark"]')
      // System fallback for dark users before panel.js runs.
      expect(css).toContain('@media (prefers-color-scheme: dark)')
      expect(css).toContain('html:not([data-theme="light"])')
      // Colors are variable-driven so both themes share the same rules.
      expect(css).toMatch(/:root\s*\{[^}]*--bg:/)
      expect(css).toContain('var(--bg)')
      expect(css).toContain('var(--card)')
      expect(css).toContain('var(--text)')
    })

    it('styles the theme picker menu', () => {
      expect(css).toContain('.theme-menu')
      expect(css).toContain('.theme-menu__item')
      expect(css).toContain('.theme-wrap')
    })

    it('follows the landing identity (Inter font, purple-600→red gradient, glow)', () => {
      // Font: same family as the marketing site, with system fallbacks.
      expect(css).toMatch(/font-family:\s*Inter,/)
      // Signature gradient from the landing (purple-600 → red-600).
      expect(css).toMatch(/linear-gradient\(135deg,\s*#9333ea 0%,\s*#dc2626 100%\)/)
      // Brand glow-pulse used on the login title, same as the landing hero.
      expect(css).toContain('@keyframes text-glow-pulse')
      expect(css).toContain('.text-glow-pulse')
      expect(html).toContain('class="text-glow-pulse"')
    })
  })

  describe('panel.js', () => {
    it('talks to the backend over an absolute API base URL', () => {
      expect(js).not.toContain('__RESUMARI_API_BASE__')
      expect(js).toMatch(/var API_BASE = "https?:\/\/[^"]+"/)
      // The local dev server is the fallback in the source.
      expect(js).toContain('http://localhost:3000')
    })

    it('implements login (password + code), transcripts, account and usage flows', () => {
      // login — two modes
      expect(js).toContain('/api/auth/login')
      expect(js).toContain('/api/auth/send-code')
      expect(js).toContain('/api/auth/verify-code')
      expect(js).toContain('loginMode')
      expect(js).toContain('setLoginMode')
      // transcripts
      expect(js).toContain('/api/transcripts')
      expect(js).toContain('/api/video')
      expect(js).toContain('/api/ai/chat')
      // account / plans
      expect(js).toContain('/api/profile')
      expect(js).toContain('/api/create-checkout-session')
      // usage history
      expect(js).toContain('/api/usage')
    })

    it('implements the chat flow (send, context from transcript, persistence)', () => {
      expect(js).toContain('function chatSend')
      expect(js).toContain('function renderChat')
      expect(js).toContain('function newChat')
      expect(js).toContain('function clearChatContext')
      expect(js).toContain('function startChatWithTranscript')
      expect(js).toContain('resumari_panel_chat')
      expect(js).toContain('state.chatTyping')
      // Send posts to the same AI chat endpoint the site uses.
      expect(js).toContain('authFetch("/api/ai/chat"')
      // The payload carries the pinned video context when one is set.
      expect(js).toContain('payload.videoId')
      // AI answers are rendered as markdown; user messages are escaped text.
      expect(js).toContain('mdToHtml')
      expect(js).toContain('escHtml')
      // 401 is handled before any error bubble is pushed (status forwarded).
      expect(js).toContain('{ ok: res.ok, status: res.status, d: d }')
      expect(js).toContain('r.status === 401')
      // The transcript detail exposes a shortcut into the chat.
      expect(js).toContain('id: "detail-chat"')
      // Enter sends, Shift+Enter keeps the line break.
      expect(js).toContain('e.key === "Enter" && !e.shiftKey')
    })

    it('shares auth with the site through chrome.storage (resumariAuth)', () => {
      expect(js).toContain('resumariAuth')
      expect(js).toContain('chrome.storage.onChanged')
      expect(js).toContain('chrome.storage.local.set')
      expect(js).toContain('chrome.storage.local.remove')
    })

    it('processes pending videos from the YouTube button/shortcut', () => {
      expect(js).toContain('pendingTranscript')
      expect(js).toContain('autoProcess')
      expect(js).toContain('transcribeVideo')
    })

    it('implements the theme system (auto/light/dark + YouTube sync)', () => {
      expect(js).toContain('resumariTheme')
      expect(js).toContain('resumariYoutubeTheme')
      expect(js).toContain('function applyTheme')
      expect(js).toContain('function setThemeChoice')
      expect(js).toContain('function isYoutubeActive')
      expect(js).toContain('data-theme')
      // Auto follows YouTube when opened from it, else the OS.
      expect(js).toContain('prefers-color-scheme: dark')
    })

    it('exposes the panel marker for tests', () => {
      expect(js).toContain('window.__RESUMARI_PANEL__')
    })

    it('shows the login page on logout and keeps the session sticky', () => {
      // Logout must return to the login view.
      expect(js).toContain('function handleLogout')
      expect(js).toContain('showView("login")')
      // A sticky flag prevents the site (still-open NextAuth session) from
      // silently logging the panel back in after an explicit logout.
      expect(js).toContain('resumariLoggedOut')
      expect(js).toContain('storageSet({ [LOGGED_OUT_KEY]: true })')
      // Bootstrap ignores stored tokens while the flag is set.
      expect(js).toContain('storageGet(LOGGED_OUT_KEY)')
      // A real login clears the flag again.
      expect(js).toContain('storageRemove(LOGGED_OUT_KEY)')
      // Incoming tokens from the site are re-checked against the flag.
      expect(js).toContain('loggedOut')
    })

    it('asks for confirmation before logging out', () => {
      // A modal asks for confirmation; the actual logout only runs on confirm.
      expect(html).toContain('id="logout-modal"')
      expect(html).toContain('id="logout-confirm"')
      expect(html).toContain('id="logout-cancel"')
      expect(html).toContain('data-logout-cancel')
      expect(html).toContain('Vuoi uscire?')
      expect(js).toContain('function openLogoutConfirm')
      expect(js).toContain('function closeLogoutConfirm')
      // The logout button opens the dialog; handleLogout runs only on confirm.
      expect(js).toContain('"logout-btn").addEventListener("click", openLogoutConfirm)')
      expect(js).toContain('"logout-confirm").addEventListener("click"')
      expect(js).toContain('closeLogoutConfirm();')
      expect(js).toContain('handleLogout();')
      // Escape closes the dialog without logging out.
      expect(js).toContain('e.key === "Escape"')
    })

    it('parses inline SVG children as elements, not visible code', () => {
      // Regression: el() used to append string children with createTextNode,
      // so icon markup ('<svg …>…</svg>') rendered as raw code in the panel.
      // Strings starting with '<' must be parsed as HTML via a <template>.
      expect(js).toContain('document.createElement("template")')
      expect(js).toContain('tpl.innerHTML = c')
      expect(js).toContain('tpl.content')
      // Plain text children must still become text nodes.
      expect(js).toContain('document.createTextNode(c)')
    })
  })
})
