import { authenticateApiKey } from '@/lib/api-auth'
import { getServiceClient } from '@/lib/supabase'
import { hasEnoughCredits, deductCredits, CREDIT_COSTS } from '@/lib/credits'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || ''

function getYouTubeChannelId(url: string) {
  const patterns = [
    /youtube\.com\/@([a-zA-Z0-9_-]+)/,
    /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return { type: pattern.source.includes('@') ? 'handle' as const : 'id' as const, value: match[1] }
    }
  }
  return null
}

function getYouTubePlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

function getYouTubeVideoId(input: string): string | null {
  if (!input) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match && match[1].length === 11) return match[1]
  }
  return null
}

function parseDuration(iso: string): number {
  const match = iso.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
  if (!match) return 0
  const h = parseInt(match[1] || '0') || 0
  const m = parseInt(match[2] || '0') || 0
  const s = parseInt(match[3] || '0') || 0
  return h * 3600 + m * 60 + s
}

async function getTranscript(videoId: string): Promise<{ transcript: any[]; language: string } | null> {
  const languages = ['it', 'en']
  for (const lang of languages) {
    try {
      const url = `https://youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`
      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (response.ok) {
        const captionData = await response.json()
        if (captionData.events && captionData.events.length > 0) {
          const segments = captionData.events
            .filter((e: any) => e.segs)
            .map((e: any) => ({
              text: e.segs.map((s: any) => s.utf8).join(' '),
              start: (e.tStartMs || 0) / 1000,
              duration: (e.dDurationMs || 0) / 1000,
            }))
          return { transcript: segments, language: lang }
        }
      }
    } catch {
      // continue
    }
  }
  return null
}

async function fetchVideosFromChannel(channelUrl: string): Promise<{ channelTitle: string; videos: Array<{ videoId: string; title: string }> }> {
  const channelInfo = getYouTubeChannelId(channelUrl)
  if (!channelInfo) throw new Error('URL canale non valido')

  let channelId = channelInfo.value
  if (channelInfo.type === 'handle') {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(channelId)}&key=${YOUTUBE_API_KEY}&maxResults=1`
    const searchRes = await fetch(searchUrl)
    const searchData = await searchRes.json()
    if (!searchData.items?.length) throw new Error('Canale non trovato')
    channelId = searchData.items[0].id.channelId
  }

  const detailsUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`
  const detailsRes = await fetch(detailsUrl)
  const detailsData = await detailsRes.json()
  if (!detailsData.items?.length) throw new Error('Canale non trovato')

  const channelTitle = detailsData.items[0].snippet.title
  const playlistId = detailsData.items[0].contentDetails.relatedPlaylists.uploads

  const videos: Array<{ videoId: string; title: string }> = []
  let nextPageToken = ''
  for (let i = 0; i < 3; i++) {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&pageToken=${nextPageToken}&key=${YOUTUBE_API_KEY}`
    const res = await fetch(url)
    const data = await res.json()
    if (!data.items) break
    for (const item of data.items) {
      if (item.snippet?.resourceId?.videoId) {
        videos.push({ videoId: item.snippet.resourceId.videoId, title: item.snippet.title })
      }
    }
    nextPageToken = data.nextPageToken
    if (!nextPageToken) break
  }

  return { channelTitle, videos }
}

async function fetchVideosFromPlaylist(playlistId: string): Promise<{ playlistTitle: string; videos: Array<{ videoId: string; title: string }> }> {
  const videos: Array<{ videoId: string; title: string }> = []
  let nextPageToken = ''
  for (let i = 0; i < 3; i++) {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&pageToken=${nextPageToken}&key=${YOUTUBE_API_KEY}`
    const res = await fetch(url)
    const data = await res.json()
    if (!data.items) break
    for (const item of data.items) {
      if (item.snippet?.resourceId?.videoId) {
        videos.push({ videoId: item.snippet.resourceId.videoId, title: item.snippet.title })
      }
    }
    nextPageToken = data.nextPageToken
    if (!nextPageToken) break
  }
  return { playlistTitle: videos[0]?.title || 'Playlist', videos }
}

export async function POST(request: Request) {
  const auth = await authenticateApiKey(request)
  if (!auth.authenticated) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!hasEnoughCredits(auth.user, CREDIT_COSTS.transcriptionApi)) {
    return new Response(JSON.stringify({ error: 'insufficient_credits' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = await request.json()
  const { url } = body
  if (!url) {
    return new Response(JSON.stringify({ error: 'invalid_input', message: 'url richiesto' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      try {
        let channelTitle = ''
        let playlistTitle = ''
        let videos: Array<{ videoId: string; title: string }> = []

        const playlistId = getYouTubePlaylistId(url)
        if (playlistId) {
          const result = await fetchVideosFromPlaylist(playlistId)
          playlistTitle = result.playlistTitle
          videos = result.videos
        } else if (getYouTubeChannelId(url)) {
          const result = await fetchVideosFromChannel(url)
          channelTitle = result.channelTitle
          videos = result.videos
        } else {
          const singleId = getYouTubeVideoId(url)
          if (singleId) {
            videos = [{ videoId: singleId, title: url }]
          } else {
            send('error', { error: 'invalid_input', message: 'URL YouTube non valido' })
            controller.close()
            return
          }
        }

        if (videos.length === 0) {
          send('error', { error: 'no_videos', message: 'Nessun video trovato' })
          controller.close()
          return
        }

        send('metadata', {
          title: channelTitle || playlistTitle || 'Video singolo',
          source: playlistId ? 'playlist' : channelTitle ? 'channel' : 'single',
          totalVideos: videos.length,
        })

        const results: any[] = []
        let succeeded = 0
        let failed = 0

        for (let i = 0; i < videos.length; i++) {
          const video = videos[i]
          try {
            const transcriptData = await getTranscript(video.videoId)
            if (transcriptData && transcriptData.transcript.length > 0) {
              const text = transcriptData.transcript.map((s: any) => s.text).join(' ')
              results.push({
                video_id: video.videoId,
                title: video.title,
                transcript: transcriptData.transcript,
                text,
                language: transcriptData.language,
                success: true,
              })
              succeeded++
            } else {
              results.push({
                video_id: video.videoId,
                title: video.title,
                success: false,
                error: 'no_transcript',
              })
              failed++
            }
          } catch {
            results.push({
              video_id: video.videoId,
              title: video.title,
              success: false,
              error: 'no_transcript',
            })
            failed++
          }
        }

        // Deduct credits: 2 per successful extraction, refund failed.
        // Atomic by default; falls back to a capped charge only if credits ran
        // out mid-batch due to a concurrent request.
        const chargeable = succeeded * CREDIT_COSTS.transcriptionApi
        let remaining = await deductCredits(auth.user.id, chargeable)
        let creditsUsed = chargeable
        if (remaining === null) {
          const client = getServiceClient()
          const { data: currentUser } = await client
            .from('users')
            .select('credits')
            .eq('id', auth.user.id)
            .single()

          const available = currentUser?.credits || 0
          creditsUsed = Math.min(chargeable, available)
          remaining = Math.max(0, available - creditsUsed)
          await client
            .from('users')
            .update({ credits: remaining, updated_at: new Date().toISOString() })
            .eq('id', auth.user.id)
        }

        send('batch', {
          batchIndex: 0,
          videos: results,
          stats: { processed: videos.length, succeeded, failed },
        })

        send('done', {
          stats: { total: videos.length, succeeded, failed, credits_used: creditsUsed, credits_remaining: remaining },
        })
      } catch (err: any) {
        send('error', { error: 'resolution_failed', message: err.message || 'Errore' })
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export async function GET() {
  return new Response(JSON.stringify({ message: 'Usa POST con { "url": "..." }' }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
