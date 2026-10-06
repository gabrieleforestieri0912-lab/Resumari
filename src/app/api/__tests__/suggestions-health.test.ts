import { describe, it, expect, vi } from 'vitest'
import { mockPostRequest } from './helpers'

const { aiMocks } = vi.hoisted(() => ({
  aiMocks: { generateChatCompletion: vi.fn() },
}))
vi.mock('@/lib/ai', () => aiMocks)

import { POST } from '@/app/api/ai/suggestions/route'
import { GET as healthGET } from '@/app/api/health/route'

describe('POST /api/ai/suggestions', () => {
  it('ritorna i suggerimenti parsati e puliti', async () => {
    aiMocks.generateChatCompletion.mockResolvedValue(
      '1. Prima domanda sul video?\n2. Seconda domanda utile qui?\n- Terza domanda valida?',
    )
    const res = await POST(mockPostRequest({ type: 'chat', videoTitle: 'Video' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.suggestions).toHaveLength(3)
    expect(body.suggestions[0]).toBe('Prima domanda sul video?')
  })

  it('fallback demo quando AI vuota', async () => {
    aiMocks.generateChatCompletion.mockResolvedValue('')
    const res = await POST(mockPostRequest({ type: 'demo' }))
    const body = await res.json()
    expect(body.suggestions).toContain('Cosa rende unico questo canale?')
  })

  it('fallback in caso di errore provider', async () => {
    aiMocks.generateChatCompletion.mockRejectedValue(new Error('down'))
    const res = await POST(mockPostRequest({ type: 'chat' }))
    expect(res.status).toBe(200)
    expect((await res.json()).suggestions.length).toBeGreaterThan(0)
  })
})

describe('GET /api/health', () => {
  it('200 con tutte le env critiche presenti', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'k')
    vi.stubEnv('JWT_SECRET', 's')
    const res = await healthGET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.env_JWT_SECRET).toBe('set')
    vi.unstubAllEnvs()
  })

  it('503 con env critica mancante', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    vi.stubEnv('JWT_SECRET', '')
    const res = await healthGET()
    expect(res.status).toBe(503)
    vi.unstubAllEnvs()
  })
})
