import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockSupabaseClient } from '../helpers/supabase-mock'

const { getAuthenticatedUserMock, getServiceClientMock } = vi.hoisted(() => ({
  getAuthenticatedUserMock: vi.fn(),
  getServiceClientMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getAuthenticatedUser: getAuthenticatedUserMock,
}))

vi.mock('@/lib/supabase', () => ({
  getServiceClient: getServiceClientMock,
  getSupabaseClient: vi.fn(),
  TABLES: { USERS: 'users' },
}))

import { POST } from '@/app/api/video/route'

const client = createMockSupabaseClient()
vi.mocked(getServiceClientMock).mockReturnValue(client)

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const user = {
  id: 'user-1',
  email: 'test@example.com',
  credits: 5,
  plan: 'free',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

function post(body: unknown) {
  return POST(
    new Request('http://localhost/api/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

describe('POST /api/video', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServiceClientMock).mockReturnValue(client)
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    getAuthenticatedUserMock.mockResolvedValue(user)
    client.setData('users', [{ ...user }])
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns 401 when not authenticated', async () => {
    getAuthenticatedUserMock.mockResolvedValue(null)
    const res = await post({ videoUrl: 'https://youtu.be/abc123def45' })
    expect(res.status).toBe(401)
  })

  it('returns 403 for free users with no credits', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ ...user, credits: 0 })
    const res = await post({ videoUrl: 'https://youtu.be/abc123def45' })
    expect(res.status).toBe(403)
  })

  it('returns 400 for an invalid URL', async () => {
    const res = await post({ videoUrl: 'not-a-url' })
    expect(res.status).toBe(400)
  })

  it('returns video details + transcript and deducts 1 credit', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.startsWith('https://www.googleapis.com/youtube/v3/videos')) {
        return Promise.resolve(
          jsonResponse({
            items: [
              {
                snippet: { title: 'Il video', description: 'Desc', channelTitle: 'Canale', thumbnails: { high: { url: 'thumb.jpg' } }, publishedAt: '2026-01-01T00:00:00Z' },
                statistics: { viewCount: '100', likeCount: '10' },
              },
            ],
          }),
        )
      }
      if (url.startsWith('https://youtube.com/api/timedtext')) {
        return Promise.resolve(jsonResponse({ events: [{ tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: 'Ciao' }] }] }))
      }
      return Promise.resolve(jsonResponse({}, false, 404))
    })

    const res = await post({ videoUrl: 'https://www.youtube.com/watch?v=abc123def45' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.videoId).toBe('abc123def45')
    expect(body.title).toBe('Il video')
    expect(body.transcriptLanguage).toBe('it')
    expect(body.transcript[0].text).toBe('Ciao')

    const stored = client.getData('users')[0]
    expect(stored.credits).toBe(4)
  })

  it('blocks business users with zero credits (pool model)', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ ...user, plan: 'business', credits: 0 })
    client.setData('users', [{ ...user, plan: 'business', credits: 0 }])

    const res = await post({ videoUrl: 'abc123def45' })
    expect(res.status).toBe(403)
  })

  it('blocks pro users with zero credits (pool model)', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ ...user, plan: 'pro', credits: 0 })
    client.setData('users', [{ ...user, plan: 'pro', credits: 0 }])

    const res = await post({ videoUrl: 'abc123def45' })
    expect(res.status).toBe(403)
  })

  it('deducts credits for business users (pool model)', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ ...user, plan: 'business', credits: 5 })
    client.setData('users', [{ ...user, plan: 'business', credits: 5 }])
    fetchMock.mockImplementation((url: string) => {
      if (url.startsWith('https://youtube.com/api/timedtext')) {
        return Promise.resolve(jsonResponse({ events: [{ tStartMs: 0, segs: [{ utf8: 'Hi' }] }] }))
      }
      return Promise.resolve(jsonResponse({ items: [] }))
    })

    const res = await post({ videoUrl: 'abc123def45' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.credits).toBe(4)
    expect(client.getData('users')[0].credits).toBe(4)
  })

  it('falls back to a third-party transcript source when timedtext is empty', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.startsWith('https://youtube.com/api/timedtext')) {
        return Promise.resolve(jsonResponse({ events: [] }))
      }
      if (url.startsWith('https://youtubetranscript.com')) {
        return Promise.resolve(jsonResponse([{ text: 'Hello there', start: '0', duration: '2' }]))
      }
      return Promise.resolve(jsonResponse({ items: [] }))
    })

    const res = await post({ videoUrl: 'abc123def45' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.transcript).toHaveLength(1)
    expect(body.transcript[0].text).toBe('Hello there')
    expect(body.transcriptLanguage).toBe('en')
  })
})
