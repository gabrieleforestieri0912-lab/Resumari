import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { GET } from '@/app/api/health/route'

describe('GET /api/health', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('returns 200 with ok status and version when critical vars are set', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc'
    process.env.JWT_SECRET = 'jwt'
    process.env.NEXTAUTH_SECRET = 'na'

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.version).toBe('1.1.2')
    expect(body.timestamp).toBeTypeOf('string')
    expect(body.env_NEXT_PUBLIC_SUPABASE_URL).toBe('set')
  })

  it('returns 503 when a critical env var is missing', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc'
    delete process.env.JWT_SECRET

    const res = await GET()
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.env_JWT_SECRET).toBe('missing')
  })

  it('reports NEXTAUTH_SECRET as missing when not set', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc'
    process.env.JWT_SECRET = 'jwt'
    delete process.env.NEXTAUTH_SECRET

    const res = await GET()
    const body = await res.json()
    expect(body.env_NEXTAUTH_SECRET).toBe('missing')
  })
})
