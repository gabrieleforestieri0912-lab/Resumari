import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const rootDir = path.resolve(__dirname, '../..')
const llms = fs.readFileSync(path.join(rootDir, 'public/llms.txt'), 'utf-8')
const robots = fs.readFileSync(path.join(rootDir, 'public/robots.txt'), 'utf-8')

describe('public/llms.txt (GEO/AEO)', () => {
  it('starts with an H1 title and a summary blockquote', () => {
    expect(llms.trimStart().startsWith('# ')).toBe(true)
    expect(llms).toContain('> Resumari')
  })

  it('links the key public pages for AI crawlers', () => {
    for (const u of ['/tools', '/mcp', '/api-keys', '/supporto', '/privacy', '/terms']) {
      expect(llms).toContain(`https://resumari.com${u}`)
    }
  })

  it('documents the MCP endpoint and the transcript API', () => {
    expect(llms).toContain('/api/mcp')
    expect(llms).toContain('/api/v1/transcript')
  })

  it('lists the free tools', () => {
    expect(llms).toContain('/tools/subtitle-converter')
    expect(llms).toContain('/tools/thumbnail-downloader')
  })
})

describe('public/robots.txt (AI crawlers)', () => {
  it('welcomes the main LLM / search crawlers', () => {
    for (const bot of [
      'GPTBot',
      'ChatGPT-User',
      'OAI-SearchBot',
      'ClaudeBot',
      'PerplexityBot',
      'Google-Extended',
      'Applebot-Extended',
      'CCBot',
      'cohere-ai',
    ]) {
      expect(robots).toContain(`User-agent: ${bot}`)
    }
  })

  it('references llms.txt for LLM-oriented discovery', () => {
    expect(robots).toContain('llms.txt')
  })
})
