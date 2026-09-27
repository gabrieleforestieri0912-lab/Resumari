import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { hasEnoughCredits, deductCredits, CREDIT_COSTS, creditsExhaustedMessage } from '@/lib/credits';
import { fetchTranscriptForVideo, getVideoDetails, getYouTubeVideoId } from '@/lib/youtube';

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ message: 'Non autorizzato. Effettua il login.' }, { status: 401 });
    }

    if (!hasEnoughCredits(user, CREDIT_COSTS.transcription)) {
      return NextResponse.json(
        {
          error: 'insufficient_credits',
          message: creditsExhaustedMessage(user.plan),
          plan: user.plan || 'free',
          credits: Number(user.credits) || 0,
        },
        { status: 403 }
      );
    }

    const { videoUrl } = await request.json();
    const videoId = getYouTubeVideoId(videoUrl || '');

    if (!videoId) {
      return NextResponse.json({ message: 'URL YouTube non valido' }, { status: 400 });
    }

    const [details, transcriptData] = await Promise.all([
      getVideoDetails(videoId),
      fetchTranscriptForVideo(videoId),
    ]);

    const transcript = transcriptData?.transcript || [];
    const transcriptLanguage = transcriptData?.language || null;

    // No transcript, no charge: the user keeps their credits and gets a clear
    // error instead of paying for an empty result.
    //
    // NOTE: the 422 body deliberately includes videoId + details. The /videos
    // page checks `data.videoId` (not res.ok) and renders the video card with
    // the "no transcript available" panel — nicer than a generic error. Keep
    // this coupling in sync if the client changes.
    if (transcript.length === 0) {
      return NextResponse.json(
        {
          message: 'Nessun sottotitolo disponibile per questo video. Prova con un video che ha i sottotitoli (anche automatici) abilitati.',
          videoId,
          title: details?.title || 'Video',
          channelTitle: details?.channelTitle || 'Canale sconosciuto',
          thumbnail: details?.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          transcript: [],
        },
        { status: 422 },
      );
    }

    // Atomic deduction — blocks every plan (pool model) and prevents overspending.
    const remaining = await deductCredits(user.id, CREDIT_COSTS.transcription);
    if (remaining === null) {
      return NextResponse.json({ message: 'Crediti insufficienti' }, { status: 403 });
    }

    return NextResponse.json({
      videoId,
      title: details?.title || 'Video',
      channelTitle: details?.channelTitle || 'Canale sconosciuto',
      thumbnail: details?.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      viewCount: details?.viewCount || '0',
      likeCount: details?.likeCount || '0',
      publishedAt: details?.publishedAt || '',
      description: details?.description || '',
      transcript,
      transcriptLanguage,
      credits: remaining,
    });
  } catch (error) {
    console.error('Video API error:', error);
    return NextResponse.json({ message: 'Errore nel recupero video' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Video endpoint' });
}
