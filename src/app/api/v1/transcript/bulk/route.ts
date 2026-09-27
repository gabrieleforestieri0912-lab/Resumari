import { authenticateApiKey } from '@/lib/api-auth'
import { getServiceClient } from '@/lib/supabase'
import { hasEnoughCredits, deductCredits, CREDIT_COSTS } from '@/lib/credits'

import {
  fetchChannelVideos,
  fetchPlaylistVideos,
  fetchTranscriptForVideo,
  extractYouTubePlaylistId,
  extractYouTubeChannelRef,
  getYouTubeVideoId,
} from '@/lib/youtube'

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

        const playlistId = extractYouTubePlaylistId(url)
        if (playlistId) {
          const result = await fetchPlaylistVideos(playlistId, 150)
          if (result) {
            playlistTitle = result.playlistTitle
            videos = result.videos
          }
        } else if (extractYouTubeChannelRef(url)) {
          const result = await fetchChannelVideos(url, 150)
          if (result) {
            channelTitle = result.channelTitle
            videos = result.videos.map((v) => ({ videoId: v.videoId, title: v.title }))
          }
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
            const transcriptData = await fetchTranscriptForVideo(video.videoId)
            if (transcriptData && transcriptData.transcript.length > 0) {
              const segments = transcriptData.transcript.map((s) => ({
                text: s.text,
                start: s.time,
                duration: s.duration,
              }))
              const text = segments.map((s) => s.text).join(' ')
              results.push({
                video_id: video.videoId,
                title: video.title,
                transcript: segments,
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
