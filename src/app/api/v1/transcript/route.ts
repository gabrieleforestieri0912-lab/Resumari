import { NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/api-auth'
import { hasEnoughCredits, deductCredits, CREDIT_COSTS } from '@/lib/credits'
import { fetchTranscriptForVideo, getVideoDetails, getYouTubeVideoId } from '@/lib/youtube'

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
    fetchTranscriptForVideo(videoId),
  ])

  if (!transcriptData || transcriptData.transcript.length === 0) {
    return NextResponse.json({ error: 'no_transcript', message: 'Nessun transcript disponibile' }, { status: 404 })
  }

  // Normalizza i segmenti per compatibilità con l'API pubblica: { text, start, duration }
  const segments = transcriptData.transcript.map((s) => ({
    text: s.text,
    start: s.time,
    duration: s.duration,
  }))
  const text = segments.map((s) => s.text).join(' ')

  // Atomic deduction — blocks every plan (pool model) and prevents overspending.
  const creditsRemaining = await deductCredits(auth.user.id, CREDIT_COSTS.transcriptionApi)
  if (creditsRemaining === null) {
    return NextResponse.json({ error: 'insufficient_credits', message: 'Crediti insufficienti' }, { status: 403 })
  }

  return NextResponse.json({
    video_id: videoId,
    title: details?.title || 'Video',
    channel: details?.channelTitle || 'Canale sconosciuto',
    duration: details?.durationSec || 0,
    transcript: segments,
    text,
    language: transcriptData.language,
    credits_used: CREDIT_COSTS.transcriptionApi,
    credits_remaining: creditsRemaining,
  })
}

