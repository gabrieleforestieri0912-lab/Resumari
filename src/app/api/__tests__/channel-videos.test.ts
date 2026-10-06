import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockPostRequest } from './helpers'

const { ytMocks } = vi.hoisted(() => ({
  ytMocks: { fetchChannelVideos: vi.fn() },
}))
vi.mock('@/lib/youtube', () => ytMocks)

import { POST } from '@/app/api/channel-videos/route'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('YOUTUBE_API_KEY', 'test-key')
  ytMocks.fetchChannelVideos.mockResolvedValue({
    channelId: 'UC123', channelTitle: 'Canale', channelThumbnail: 'thumb',
    channelDescription: 'desc', uploadsPlaylistId: 'UU123',
    videos: [{ videoId: 'VID12345678', title: 'Video 1', publishedAt: 'oggi' }],
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/channel-videos', () => {
  it('400 senza channelUrl', async () => {
    const res = await POST(mockPostRequest({}))
    expect(res.status).toBe(400)
  })

  it('500 senza YOUTUBE_API_KEY', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', '')
    const res = await POST(mockPostRequest({ channelUrl: 'https://youtube.com/@x' }))
    expect(res.status).toBe(500)
  })

  it('404 con canale non trovato', async () => {
    ytMocks.fetchChannelVideos.mockResolvedValue(null)
    const res = await POST(mockPostRequest({ channelUrl: 'https://youtube.com/@sconosciuto' }))
    expect(res.status).toBe(404)
  })

  it('200 con elenco video e metadati canale', async () => {
    const res = await POST(mockPostRequest({ channelUrl: 'https://youtube.com/@canale' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.channelId).toBe('UC123')
    expect(body.videos).toHaveLength(1)
    expect(body.totalVideos).toBe(1)
    expect(ytMocks.fetchChannelVideos).toHaveBeenCalledWith('https://youtube.com/@canale', 50)
  })
})
