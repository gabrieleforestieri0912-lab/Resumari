import { describe, it, expect, afterAll } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { manifest, background, content, panelJsWithBase, buildExtension, distDir } from '../../scripts/build-extension'

const rootDir = path.resolve(__dirname, '../..')

// The build tests must NEVER write into the real dist-extension/ (which the
// user loads in Chrome): the suite runs with NEXT_PUBLIC_APP_URL set to a
// test host (tests/setup.ts), and a real build baked from that env would
// point the panel at a non-resolvable host. Build into a temp dir instead.
const tmpBuildDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resumari-ext-build-'))

afterAll(() => {
  fs.rmSync(tmpBuildDir, { recursive: true, force: true })
})

describe('extension build (scripts/build-extension.js)', () => {
  describe('manifest.json', () => {
    it('is a Manifest V3 extension', () => {
      expect(manifest.manifest_version).toBe(3)
      expect(manifest.name).toBe('Resumari - Trascrizioni AI')
      expect(manifest.description).toBeTruthy()
    })

    it('has the expected permissions and host permissions', () => {
      expect(manifest.permissions).toEqual(expect.arrayContaining(['sidePanel', 'storage']))
      expect(manifest.host_permissions).toEqual(
        expect.arrayContaining([
          '*://www.youtube.com/*',
          'http://localhost:3000/*',
          'http://127.0.0.1:3000/*',
          'https://resumari.it/*',
        ]),
      )
    })

    it('keeps the extension-pages CSP valid for MV3 (no unsafe-inline in script-src)', () => {
      expect(manifest.minimum_chrome_version).toBe('116')
      const csp = manifest.content_security_policy.extension_pages
      expect(csp).toContain("script-src 'self'")
      // Chrome rejects the manifest if 'unsafe-inline' appears in script-src.
      expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/)
      expect(csp).toContain("object-src 'self'")
      // Runtime style tweaks need style-src 'unsafe-inline' (allowed by MV3).
      expect(csp).toMatch(/style-src[^;]*'unsafe-inline'[^;]*/)
    })

    it('defines the keyboard shortcut to transcribe the current video', () => {
      expect(manifest.commands['transcribe-video']).toBeDefined()
      expect(manifest.commands['transcribe-video'].description).toMatch(/video/i)
      expect(manifest.commands['transcribe-video'].suggested_key.default).toBe('Alt+R')
    })

    it('has no popup: the toolbar action opens the side panel directly', () => {
      const action = manifest.action as Record<string, unknown>
      expect(action.default_popup).toBeUndefined()
      expect(manifest.action.default_title).toBe('Resumari - Trascrizioni AI')
      expect(manifest.side_panel).toEqual({ default_path: 'panel.html' })
    })

    it('points the side panel at the standalone panel.html (not the site)', () => {
      expect(manifest.side_panel).toEqual({ default_path: 'panel.html' })
      expect(manifest.background).toEqual({ service_worker: 'background.js' })
      expect(manifest.icons).toEqual(
        expect.objectContaining({ '16': 'icon.png', '32': 'icon.png', '48': 'icon.png', '128': 'icon.png' }),
      )
      expect(manifest.action.default_icon).toEqual(
        expect.objectContaining({ '16': 'icon.png', '128': 'icon.png' }),
      )
    })

    it('injects content.js on YouTube and on the Resumari website', () => {
      expect(manifest.content_scripts).toHaveLength(2)
      for (const cs of manifest.content_scripts) {
        expect(cs.js).toEqual(['content.js'])
        expect(cs.run_at).toBe('document_idle')
      }
      expect(manifest.content_scripts[0].matches).toEqual(['*://www.youtube.com/*'])
      expect(manifest.content_scripts[1].matches).toEqual(
        expect.arrayContaining(['https://resumari.it/*', 'http://localhost:3000/*']),
      )
    })

    it('exposes only the needed assets to YouTube and Resumari pages', () => {
      const war = manifest.web_accessible_resources[0]
      expect(war.resources).toEqual(expect.arrayContaining(['icon.png', 'resumari.png']))
      // The standalone panel ships no site chunks, so assets/* must not be exposed.
      expect(war.resources).not.toContain('assets/*')
      expect(war.matches).toEqual(
        expect.arrayContaining(['*://*.youtube.com/*', 'https://resumari.it/*']),
      )
    })

    it('keeps the extension version in sync with package.json', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'))
      expect(manifest.version).toBe(pkg.version)
    })

    it('keeps a rich description within the 132-character Chrome limit', () => {
      expect(manifest.description.length).toBeGreaterThan(60)
      expect(manifest.description.length).toBeLessThanOrEqual(132)
      expect(manifest.description).toMatch(/trascrizioni/i)
      expect(manifest.description).toMatch(/riassunti/i)
      expect(manifest.description).toMatch(/YouTube/i)
    })
  })

  describe('background service worker', () => {
    it('opens the welcome page on install', () => {
      expect(background).toContain('chrome.runtime.onInstalled.addListener')
      expect(background).toContain('details.reason === "install"')
      expect(background).toContain('https://resumari.it/welcome')
      expect(background).toContain('chrome.tabs.create')
    })

    it('opens the side panel on toolbar click (no popup) and on message', () => {
      expect(background).toContain('chrome.sidePanel.setPanelBehavior')
      expect(background).toContain('openPanelOnActionClick: true')
      expect(background).toContain('msg.type === "openSidePanel"')
      expect(background).toContain('chrome.sidePanel.open')
    })

    it('transcribes the current video when the keyboard shortcut is pressed', () => {
      expect(background).toContain('chrome.commands.onCommand.addListener')
      expect(background).toContain('transcribe-video')
      expect(background).toContain('GET_VIDEO_ID')
      expect(background).toContain('pendingTranscript')
    })
  })

  describe('content script source', () => {
    it('is a non-trivial self-contained script', () => {
      expect(content.length).toBeGreaterThan(5000)
      expect(content).toContain('function init()')
    })

    it('implements the expected YouTube features', () => {
      expect(content).toContain('function getVideoIdFromUrl')
      expect(content).toContain('function isVideoPage')
      expect(content).toContain('function openSidePanel')
      expect(content).toContain('function addThumbnailButton')
      expect(content).toContain('function injectVideoPageButton')
      expect(content).toContain('pendingTranscript')
      expect(content).toContain('resumari-thumb-btn')
      expect(content).toContain('resumari-transcribe-btn')
    })

    it('handles auth sync between the site and the extension', () => {
      expect(content).toContain('AUTH_SYNC')
      expect(content).toContain('AUTH_LOGOUT')
      expect(content).toContain('resumari-auth-changed')
    })

    it('shares auth with the side panel through chrome.storage', () => {
      expect(content).toContain('resumari-auth-change')
      expect(content).toContain('chrome.storage.local.set({ resumariAuth')
      expect(content).toContain('chrome.storage.onChanged.addListener')
      expect(content).toContain('function isResumariSite()')
    })

    it('answers GET_VIDEO_ID for the popup and the keyboard shortcut', () => {
      expect(content).toContain('msg.type === "GET_VIDEO_ID"')
      expect(content).toContain('sendResponse({ videoId: getVideoId() })')
    })

    it('debounces DOM mutations and shows a toast on open', () => {
      expect(content).toContain('function scheduleInjection()')
      expect(content).toContain('function showToast(')
      expect(content).toContain('resumari-toast')
      expect(content).toContain('Apertura Resumari')
    })
  })

  describe('panelJsWithBase()', () => {
    it('replaces the API base marker with a valid backend URL', () => {
      const js = panelJsWithBase()
      expect(js).not.toContain('__RESUMARI_API_BASE__')
      // The inlined value comes from NEXT_PUBLIC_APP_URL when set (tests/setup.ts).
      const expected = process.env.NEXT_PUBLIC_APP_URL
      if (expected) {
        expect(js).toContain(`var API_BASE = "${expected}"`)
      }
      expect(js).toMatch(/var API_BASE = "https?:\/\/[^"]+"/)
      // The fallback to the local dev server is kept for unset environments.
      expect(js).toContain('http://localhost:3000')
      expect(js).toContain('window.__RESUMARI_PANEL__')
    })
  })

  describe('buildExtension()', () => {
    it('builds a standalone bundle in the given output dir (never the real dist)', () => {
      buildExtension(tmpBuildDir)
      expect(fs.existsSync(path.join(tmpBuildDir, 'manifest.json'))).toBe(true)
      expect(fs.existsSync(path.join(tmpBuildDir, 'background.js'))).toBe(true)
      expect(fs.existsSync(path.join(tmpBuildDir, 'content.js'))).toBe(true)
      // No popup: the toolbar action opens the side panel directly.
      expect(fs.existsSync(path.join(tmpBuildDir, 'popup.html'))).toBe(false)
      expect(fs.existsSync(path.join(tmpBuildDir, 'popup.js'))).toBe(false)
      // Standalone panel files
      expect(fs.existsSync(path.join(tmpBuildDir, 'panel.html'))).toBe(true)
      expect(fs.existsSync(path.join(tmpBuildDir, 'panel.css'))).toBe(true)
      expect(fs.existsSync(path.join(tmpBuildDir, 'panel.js'))).toBe(true)
      expect(fs.existsSync(path.join(tmpBuildDir, 'icon.png'))).toBe(true)
      expect(fs.existsSync(path.join(tmpBuildDir, 'resumari.png'))).toBe(true)
      // No leftover site chunks from the old architecture
      expect(fs.existsSync(path.join(tmpBuildDir, 'index.html'))).toBe(false)
      expect(fs.existsSync(path.join(tmpBuildDir, 'assets'))).toBe(false)
    })

    it('never overwrites the real dist-extension/ directory', () => {
      const before = fs.existsSync(path.join(distDir, 'panel.js'))
        ? fs.readFileSync(path.join(distDir, 'panel.js'), 'utf-8')
        : null
      buildExtension(tmpBuildDir)
      const after = fs.existsSync(path.join(distDir, 'panel.js'))
        ? fs.readFileSync(path.join(distDir, 'panel.js'), 'utf-8')
        : null
      expect(after).toBe(before)
    })

    it('writes a panel whose script has no inline event handlers (MV3 CSP)', () => {
      buildExtension(tmpBuildDir)
      const html = fs.readFileSync(path.join(tmpBuildDir, 'panel.html'), 'utf-8')
      // No inline event-handler attributes: they would be blocked by CSP.
      expect(html).not.toMatch(/\son[a-z]+\s*=\s*["'][^"']*["']/i)
      expect(html).toContain('<script src="panel.js">')
      expect(html).toContain('view-login')
      expect(html).toContain('tab-transcripts')
      expect(html).toContain('tab-account')
      expect(html).toContain('tab-usage')
    })

    it('writes files whose content matches the exported constants', () => {
      buildExtension(tmpBuildDir)
      const writtenManifest = JSON.parse(
        fs.readFileSync(path.join(tmpBuildDir, 'manifest.json'), 'utf-8'),
      )
      const writtenBackground = fs.readFileSync(path.join(tmpBuildDir, 'background.js'), 'utf-8')
      const writtenContent = fs.readFileSync(path.join(tmpBuildDir, 'content.js'), 'utf-8')
      expect(writtenManifest).toEqual(manifest)
      expect(writtenBackground).toBe(background)
      expect(writtenContent).toBe(content)
    })

    it('is idempotent and can run multiple times', () => {
      expect(() => {
        buildExtension(tmpBuildDir)
        buildExtension(tmpBuildDir)
      }).not.toThrow()
    })
  })
})
