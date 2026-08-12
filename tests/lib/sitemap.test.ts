import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const rootDir = path.resolve(__dirname, '../..')
const sitemap = fs.readFileSync(path.join(rootDir, 'public/sitemap.xml'), 'utf-8')
const robots = fs.readFileSync(path.join(rootDir, 'public/robots.txt'), 'utf-8')

function extractUrls(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
}

describe('public/sitemap.xml', () => {
  it('is structurally well-formed XML', () => {
    expect(sitemap.trimStart().startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(sitemap.trim().endsWith('</urlset>')).toBe(true)

    const open = (sitemap.match(/<url>/g) || []).length
    const close = (sitemap.match(/<\/url>/g) || []).length
    expect(open).toBe(close)
    expect(open).toBeGreaterThan(0)
  })

  it('lists only public pages under the production domain', () => {
    const urls = extractUrls(sitemap)
    expect(urls.length).toBeGreaterThan(10)
    for (const u of urls) {
      expect(u).toMatch(/^https:\/\/resumari\.it/)
    }
  })

  it('does not include auth-only or robots-disallowed pages', () => {
    const urls = extractUrls(sitemap)
    for (const u of urls) {
      expect(u).not.toMatch(
        /\/dashboard|\/api-keys|\/videos|\/chat|\/settings|\/profile|\/auth|\/api\//,
      )
    }
  })

  it('includes the home page and the tools hub', () => {
    const urls = extractUrls(sitemap)
    expect(urls).toContain('https://resumari.it/')
    expect(urls).toContain('https://resumari.it/tools')
    expect(urls.some(u => u.startsWith('https://resumari.it/tools/'))).toBe(true)
  })

  it('is referenced from robots.txt', () => {
    expect(robots).toContain('Sitemap: https://resumari.it/sitemap.xml')
  })

  it('robots.txt disallows the auth-only areas that are excluded from the sitemap', () => {
    for (const area of ['/dashboard/', '/settings/', '/profile/', '/api-keys/', '/videos/', '/chat/']) {
      expect(robots).toContain(`Disallow: ${area}`)
    }
  })
})
