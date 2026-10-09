import { authenticateApiKey } from '@/lib/api-auth'
import { getServiceClient, TABLES } from '@/lib/supabase'
import { hasEnoughCredits, deductCredits, CREDIT_COSTS } from '@/lib/credits'

import {
  fetchChannelVideos,
  fetchPlaylistVideos,
  fetchTranscriptForVideo,
  extractYouTubePlaylistId,
  extractYouTubeChannelRef,
  getYouTubeVideoId,
} from '@/lib/youtube'

/** Numero massimo di video risolti da una playlist/canale in una richiesta. */
const MAX_VIDEOS = 150

function jsonError(error: string, status: number, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ error, ...extra }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function POST(request: Request) {
  const auth = await authenticateApiKey(request)
  if (!auth.authenticated) {
    return jsonError(auth.error, auth.status)
  }

  if (!hasEnoughCredits(auth.user, CREDIT_COSTS.transcriptionApi)) {
    return jsonError('insufficient_credits', 403, { credits_required: CREDIT_COSTS.transcriptionApi })
  }

  const body = await request.json()
  const { url } = body
  if (!url) {
    return jsonError('invalid_input', 400, { message: 'url richiesto' })
  }

  // Risoluzione dei video PRIMA di aprire lo stream: senza questo check il
  // batch poteva elaborare fino a 150 video (300 crediti) dopo aver verificato
  // che ne restassero 2, e l'addebito veniva semplicemente troncato.
  let channelTitle = ''
  let playlistTitle = ''
  let videos: Array<{ videoId: string; title: string }> = []
  let source: 'playlist' | 'channel' | 'single' = 'single'

  try {
    const playlistId = extractYouTubePlaylistId(url)
    if (playlistId) {
      const result = await fetchPlaylistVideos(playlistId, MAX_VIDEOS)
      if (result) {
        playlistTitle = result.playlistTitle
        videos = result.videos
        source = 'playlist'
      }
    } else if (extractYouTubeChannelRef(url)) {
      const result = await fetchChannelVideos(url, MAX_VIDEOS)
      if (result) {
        channelTitle = result.channelTitle
        videos = result.videos.map((v) => ({ videoId: v.videoId, title: v.title }))
        source = 'channel'
      }
    } else {
      const singleId = getYouTubeVideoId(url)
      if (singleId) {
        videos = [{ videoId: singleId, title: url }]
      }
    }
  } catch (err: any) {
    return jsonError('resolution_failed', 502, { message: err?.message || 'Errore' })
  }

  if (videos.length === 0) {
    return jsonError('no_videos', 404, { message: 'Nessun video trovato' })
  }

  // Limite al batch pari ai crediti disponibili: meglio processare 5 video
  // esplicitamente dichiarati che 150 di cui 148 regalati.
  const affordable = Math.floor((auth.user.credits ?? 0) / CREDIT_COSTS.transcriptionApi)
  if (affordable < 1) {
    return jsonError('insufficient_credits', 403, {
      message: 'Crediti insufficienti',
      credits_required: CREDIT_COSTS.transcriptionApi,
    })
  }
  const skipped = Math.max(0, videos.length - affordable)
  if (skipped > 0) {
    videos = videos.slice(0, affordable)
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      try {
        send('metadata', {
          title: channelTitle || playlistTitle || 'Video singolo',
          source,
          totalVideos: videos.length,
          creditsPerVideo: CREDIT_COSTS.transcriptionApi,
          creditsRequired: videos.length * CREDIT_COSTS.transcriptionApi,
          // Esplicito: questi video non sono stati elaborati per crediti insufficienti.
          skippedForCredits: skipped,
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
                videoId: video.videoId,
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
                videoId: video.videoId,
                title: video.title,
                success: false,
                error: 'no_transcript',
              })
              failed++
            }
          } catch {
            results.push({
              video_id: video.videoId,
              videoId: video.videoId,
              title: video.title,
              success: false,
              error: 'no_transcript',
            })
            failed++
          }
        }

        // Addebito: 2 crediti per ogni video elaborato con successo, i falliti
        // non costano nulla. Se i crediti sono finiti a metà batch (richiesta
        // concorrente) si addebita solo quanto disponibile.
        const chargeable = succeeded * CREDIT_COSTS.transcriptionApi
        let remaining = chargeable > 0 ? await deductCredits(auth.user.id, chargeable) : (auth.user.credits ?? 0)
        let creditsUsed = chargeable
        if (remaining === null) {
          const client = getServiceClient()
          const { data: currentUser } = await client
            .from(TABLES.USERS)
            .select('credits')
            .eq('id', auth.user.id)
            .single()

          const available = currentUser?.credits || 0
          creditsUsed = Math.min(chargeable, available)
          remaining = Math.max(0, available - creditsUsed)
          await client
            .from(TABLES.USERS)
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
      'Cache-Control': 'no-cache, no-transform',
    },
  })
}

export async function GET() {
  return new Response(JSON.stringify({ message: 'Usa POST con { "url": "..." }' }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
