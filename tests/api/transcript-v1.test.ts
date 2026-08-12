import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockSupabaseClient } from '../helpers/supabase-mock'

const { authenticateApiKeyMock, getServiceClientMock } = vi.hoisted(() => ({
  authenticateApiKeyMock: vi.fn(),
  getServiceClientMock: vi.fn(),
}))

vi.mock('@/lib/api-auth', () => ({
  authenticateApiKey: authenticateApiKeyMock,
}))

vi.mock('@/lib/supabase', () => ({
  getServiceClient: getServiceClientMock,
  getSupabaseClient: vi.fn(),
  TABLES: { USERS: 'users' },
}))

import { POST } from '@/app/api/v1/transcript/route'

const client = createMockSupabaseClient()

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/v1/transcript', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  const authUser = {
    id: 'user-1',
    email: 'api@example.com',
    credits: 100,
    plan: 'free',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServiceClientMock).mockReturnValue(client)
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    authenticateApiKeyMock.mockResolvedValue({
      authenticated: true,
      user: authUser,
      creditsRemaining: 100,
      rateLimitRemaining: 29,
    })
    client.setData('users', [{ ...authUser }])
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('rejects unauthenticated requests', async () => {
    authenticateApiKeyMock.mockResolvedValue({ authenticated: false, error: 'missing_api_key', status: 401 })
    const res = await POST(new Request('http://localhost/api/v1/transcript', { method: 'POST' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for an invalid video id', async () => {
    const res = await POST(
      new Request('http://localhost/api/v1/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: 'xyz' }),
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_input')
  })

  it('returns 403 for free users without enough credits', async () => {
    authenticateApiKeyMock.mockResolvedValue({
      authenticated: true,
      user: { ...authUser, credits: 1 },
      creditsRemaining: 1,
      rateLimitRemaining: 29,
    })
    const res = await POST(
      new Request('http://localhost/api/v1/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: 'abc123def45' }),
      }),
    )
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('insufficient_credits')
  })

  it('returns 404 when no transcript exists', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ events: [] })))
    const res = await POST(
      new Request('http://localhost/api/v1/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: 'https://youtu.be/abc123def45' }),
      }),
    )
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('no_transcript')
  })

  it('returns transcript, deducts 2 credits and reports remaining', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.startsWith('https://www.googleapis.com/youtube/v3/videos')) {
        return Promise.resolve(
          jsonResponse({
            items: [
              {
                snippet: { title: 'Il video', channelTitle: 'Il canale' },
                contentDetails: { duration: 'PT1M30S' },
              },
            ],
          }),
        )
      }
      if (url.startsWith('https://youtube.com/api/timedtext')) {
        return Promise.resolve(
          jsonResponse({ events: [{ tStartMs: 0, dDurationMs: 1500, segs: [{ utf8: 'Ciao' }] }] }),
        )
      }
      return Promise.resolve(jsonResponse({}, false, 404))
    })

    const res = await POST(
      new Request('http://localhost/api/v1/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: 'abc123def45' }),
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.video_id).toBe('abc123def45')
    expect(body.title).toBe('Il video')
    expect(body.channel).toBe('Il canale')
    expect(body.duration).toBe(90)
    expect(body.transcript).toHaveLength(1)
    expect(body.text).toBe('Ciao')
    expect(body.language).toBe('it')
    expect(body.credits_used).toBe(2)
    expect(body.credits_remaining).toBe(98)

    const updated = client.getData('users')[0]
    expect(updated.credits).toBe(98)
  })

  it('allows pro users to transcribe with zero credits', async () => {
    authenticateApiKeyMock.mockResolvedValue({
      authenticated: true,
      user: { ...authUser, credits: 0, plan: 'pro' },
      creditsRemaining: 0,
      rateLimitRemaining: 29,
    })
    client.setData('users', [{ ...authUser, credits: 0, plan: 'pro' }])
    fetchMock.mockImplementation((url: string) => {
      if (url.startsWith('https://youtube.com/api/timedtext')) {
        return Promise.resolve(jsonResponse({ events: [{ tStartMs: 0, segs: [{ utf8: 'Hi' }] }] }))
      }
      return Promise.resolve(jsonResponse({ items: [] }))
    })

    const res = await POST(
      new Request('http://localhost/api/v1/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: 'abc123def45' }),
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.text).toBe('Hi')
    expect(body.credits_remaining).toBe(0)
  })
})
