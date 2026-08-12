import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from '@/app/api/channel-info/route'

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('GET /api/channel-info', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns 400 when channelId is missing', async () => {
    const res = await GET(new Request('http://localhost/api/channel-info'))
    expect(res.status).toBe(400)
  })

  it('returns 404 when the channel is not found', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [] }))
    const res = await GET(new Request('http://localhost/api/channel-info?channelId=UCabc'))
    expect(res.status).toBe(404)
  })

  it('returns channel info and its first 12 videos', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.startsWith('https://www.googleapis.com/youtube/v3/channels')) {
        return Promise.resolve(
          jsonResponse({
            items: [
              {
                snippet: {
                  title: 'Canale Demo',
                  description: 'Descrizione',
                  thumbnails: { high: { url: 'https://thumb/demo.jpg' } },
                },
                contentDetails: { relatedPlaylists: { uploads: 'PL123' } },
              },
            ],
          }),
        )
      }
      if (url.startsWith('https://www.googleapis.com/youtube/v3/playlistItems')) {
        return Promise.resolve(
          jsonResponse({
            items: [
              { snippet: { title: 'Video 1', publishedAt: '2026-01-01T00:00:00Z', resourceId: { videoId: 'v1' }, thumbnails: {} } },
              { snippet: { title: 'Video 2', publishedAt: '2026-01-02T00:00:00Z', resourceId: { videoId: 'v2' }, thumbnails: {} } },
              { snippet: { title: 'No resource' } },
            ],
          }),
        )
      }
      return Promise.resolve(jsonResponse({}, false, 404))
    })

    const res = await GET(new Request('http://localhost/api/channel-info?channelId=UCabc'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.channelTitle).toBe('Canale Demo')
    expect(body.channelThumbnail).toBe('https://thumb/demo.jpg')
    expect(body.channelDescription).toBe('Descrizione')
    expect(body.videos).toHaveLength(2)
    expect(body.videos[0].videoId).toBe('v1')
  })
})
