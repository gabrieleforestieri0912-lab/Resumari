import { NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/api-auth'
import { hasEnoughCredits, deductCredits, CREDIT_COSTS } from '@/lib/credits'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || ''

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

async function getVideoDetails(videoId: string) {
  if (!YOUTUBE_API_KEY) return null
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet,contentDetails`
    const response = await fetch(url)
    const data = await response.json()
    if (data.items && data.items.length > 0) {
      const item = data.items[0]
      const duration = item.contentDetails?.duration || 'PT0S'
      const durationSec = parseDuration(duration)
      return {
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        duration: durationSec,
      }
    }
    return null
  } catch {
    return null
  }
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
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
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

export async function POST(request: Request) {
  const auth = await authenticateApiKey(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { video_id, video_url } = await request.json()
  const videoId = getYouTubeVideoId(video_id || video_url || '')
  if (!videoId) {
    return NextResponse.json({ error: 'invalid_input', message: 'video_id non valido' }, { status: 400 })
  }

  if (!hasEnoughCredits(auth.user, CREDIT_COSTS.transcriptionApi)) {
    return NextResponse.json({ error: 'insufficient_credits', message: 'Crediti insufficienti' }, { status: 403 })
  }

  const [details, transcriptData] = await Promise.all([
    getVideoDetails(videoId),
    getTranscript(videoId),
  ])

  if (!transcriptData || transcriptData.transcript.length === 0) {
    return NextResponse.json({ error: 'no_transcript', message: 'Nessun transcript disponibile' }, { status: 404 })
  }

  const text = transcriptData.transcript.map((s: any) => s.text).join(' ')

  // Atomic deduction — blocks every plan (pool model) and prevents overspending.
  const creditsRemaining = await deductCredits(auth.user.id, CREDIT_COSTS.transcriptionApi)
  if (creditsRemaining === null) {
    return NextResponse.json({ error: 'insufficient_credits', message: 'Crediti insufficienti' }, { status: 403 })
  }

  return NextResponse.json({
    video_id: videoId,
    title: details?.title || 'Video',
    channel: details?.channelTitle || 'Canale sconosciuto',
    duration: details?.duration || 0,
    transcript: transcriptData.transcript,
    text,
    language: transcriptData.language,
    credits_used: CREDIT_COSTS.transcriptionApi,
    credits_remaining: creditsRemaining,
  })
}
