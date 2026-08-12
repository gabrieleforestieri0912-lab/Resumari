import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { hasEnoughCredits, deductCredits, CREDIT_COSTS } from '@/lib/credits';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
  'Referer': 'https://www.youtube.com/',
  'Origin': 'https://www.youtube.com',
};

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

async function getTranscriptTimedText(videoId: string): Promise<{ transcript: any[]; language: string } | null> {
  const languages = ['it', 'en'];
  for (const lang of languages) {
    try {
      const url = `https://youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`;
      const response = await fetch(url, { headers: BROWSER_HEADERS });
      if (response.ok) {
        const captionData = await response.json();
        if (captionData.events && captionData.events.length > 0) {
          const segments = captionData.events
            .filter((e: any) => e.segs)
            .map((e: any) => ({
              text: e.segs.map((s: any) => s.utf8).join(' '),
              time: (e.tStartMs || 0) / 1000,
              duration: (e.dDurationMs || 0) / 1000,
            }));
          if (segments.length > 0) {
            return { transcript: segments, language: lang };
          }
        }
      }
    } catch (e) {
      console.error(`timedtext error for ${lang}:`, e);
    }
  }
  return null;
}

async function getTranscriptFrom3rdParty(videoId: string): Promise<{ transcript: any[]; language: string } | null> {
  try {
    const response = await fetch(`https://youtubetranscript.com/?v=${videoId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const segments = data.map((s: any) => ({
          text: s.text || '',
          time: parseFloat(s.start) || 0,
          duration: parseFloat(s.duration) || 0,
        }));
        return { transcript: segments, language: 'en' };
      }
    }
  } catch (e) {
    console.error('youtubetranscript error:', e);
  }

  try {
    const response = await fetch(`https://youtubetranscriptapi.vercel.app/api?videoId=${videoId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.transcript) {
        const segments = data.transcript.map((s: any) => ({
          text: s.text || s.subtitle || '',
          time: parseFloat(s.start) || parseFloat(s.seconds) || 0,
          duration: parseFloat(s.duration) || 0,
        }));
        return { transcript: segments, language: data.language || 'en' };
      }
    }
  } catch (e) {
    console.error('youtubetranscriptapi error:', e);
  }

  return null;
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
      getTranscriptTimedText(videoId),
    ]);

    let transcript = transcriptData?.transcript || [];
    let transcriptLanguage = transcriptData?.language || null;

    if (!transcript || transcript.length === 0) {
      const fallbackData = await getTranscriptFrom3rdParty(videoId);
      if (fallbackData) {
        transcript = fallbackData.transcript;
        transcriptLanguage = fallbackData.language;
      }
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
