import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { hasEnoughCredits, deductCredits, CREDIT_COSTS } from '@/lib/credits';
import { fetchTranscriptForVideo } from '@/lib/youtube';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1].length === 11) return match[1];
  }
  return null;
}

async function getVideoDetails(videoId: string) {
  if (!YOUTUBE_API_KEY) return null;
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet,contentDetails,statistics`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      return {
        title: item.snippet.title,
        description: item.snippet.description,
        channelTitle: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails?.high?.url,
        viewCount: item.statistics?.viewCount || '0',
        likeCount: item.statistics?.likeCount || '0',
        publishedAt: item.snippet.publishedAt,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching video details:', error);
    return null;
  }
}



export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ message: 'Non autorizzato. Effettua il login.' }, { status: 401 });
    }

    if (!hasEnoughCredits(user, CREDIT_COSTS.transcription)) {
      return NextResponse.json(
        { message: 'Crediti insufficienti. I crediti si ricaricano ogni mese con un piano Pro o Business.' },
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
