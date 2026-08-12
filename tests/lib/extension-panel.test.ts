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
      expect(html).toContain('Accedi a Resumari')
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

    it('has bottom navigation across the three app tabs', () => {
      expect(html).toContain('data-tab="transcripts"')
      expect(html).toContain('data-tab="account"')
      expect(html).toContain('data-tab="usage"')
      expect(html).toContain('Trascrizioni')
      expect(html).toContain('Account')
      expect(html).toContain('Usage')
    })
  })

  describe('panel.css', () => {
    it('styles the shell, login, cards, plans and timeline', () => {
      expect(css).toContain('.view')
      expect(css).toContain('.login__wrap')
      expect(css).toContain('.app__nav')
      expect(css).toContain('.tx-card')
      expect(css).toContain('.plan')
      expect(css).toContain('.usage-event')
      expect(css).toContain('.toast')
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

    it('exposes the panel marker for tests', () => {
      expect(js).toContain('window.__RESUMARI_PANEL__')
    })
  })
})
