import { NextResponse } from 'next/server';
import { getServiceClient, TABLES } from '@/lib/supabase';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { generateChatCompletion } from '@/lib/ai';
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
      return {
        title: data.items[0].snippet.title,
        description: data.items[0].snippet.description,
        channelTitle: data.items[0].snippet.channelTitle,
        thumbnail: data.items[0].snippet.thumbnails?.high?.url,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching video details:', error);
    return null;
  }
}

async function getTranscript(videoId: string) {
  const languages = ['it', 'en'];
  for (const lang of languages) {
    try {
      const url = `https://youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`;
      const response = await fetch(url, { headers: BROWSER_HEADERS });
      if (response.ok) {
        const captionData = await response.json();
        if (captionData.events && captionData.events.length > 0) {
          const text = captionData.events
            .filter((e: any) => e.segs)
            .map((e: any) => e.segs.map((s: any) => s.utf8).join(' '))
            .join(' ');
          if (text.trim().length > 0) return text;
        }
      }
    } catch (e) {}
  }

  try {
    const res = await fetch(`https://youtubetranscript.com/?v=${videoId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((s: any) => s.text).join(' ');
      }
    }
  } catch (e) {}

  return null;
}

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const { success: rlSuccess } = rateLimit(ip);
  if (!rlSuccess) return NextResponse.json({ message: 'Troppe richieste' }, { status: 429 });

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });

  if (!hasEnoughCredits(user, CREDIT_COSTS.chat)) {
    return NextResponse.json(
      { message: 'Crediti insufficienti. I crediti si ricaricano ogni mese con un piano Pro o Business.' },
      { status: 403 }
    );
  }

  try {
    const { message, videoId: providedVideoId, documentContext } = await request.json();
    const videoId = providedVideoId || getYouTubeVideoId(message);

    let systemPrompt = "Sei Resumari, un assistente AI esperto in riassunti video e analisi documenti. Rispondi in italiano.";
    let contextData = "";

    if (documentContext) {
      contextData = `DOCUMENTO CONTESTO:\n${documentContext}\n\n`;
      systemPrompt += "\nAnalizza il testo del documento fornito come contesto per rispondere alla domanda.";
    }

    if (videoId) {
      const [transcript, details] = await Promise.all([
        getTranscript(videoId),
        getVideoDetails(videoId)
      ]);

      if (transcript) {
        contextData += `VIDEO: ${details?.title || videoId}\nTRASCRIZIONE: ${transcript.substring(0, 15000)}`;
        systemPrompt += "\nAnalizza la trascrizione del video fornita per rispondere o riassumere.";
      } else if (details) {
        contextData += `TITOLO: ${details.title}\nDESCRIZIONE: ${details.description}`;
        systemPrompt += "\nTrascrizione non disponibile, usa titolo e descrizione del video.";
      }
    }

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: contextData ? `${contextData}\n\nDOMANDA: ${message}` : message }
    ];

    const aiResponse = await generateChatCompletion(messages);

    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });

    // Save chat history FIRST
    const { error: saveError } = await client
      .from(TABLES.CHATS)
      .insert({
        user_id: user.id,
        video_id: videoId || null,
        chat_id: `ai-${Date.now()}`,
        title: 'AI Chat',
        messages: [
          { role: 'user', content: message, videoId: videoId || undefined },
          { role: 'assistant', content: aiResponse }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (saveError) {
      console.error('Failed to save chat:', saveError);
      return NextResponse.json({ message: 'Errore nel salvataggio della chat' }, { status: 500 });
    }

    // Atomic deduction — blocks every plan (pool model) and prevents overspending.
    // Deducted AFTER the chat is saved so failed AI calls don't consume credits;
    // in the rare race where the deduction fails here, the chat stays as history
    // and the client can simply retry the message.
    const remaining = await deductCredits(user.id, CREDIT_COSTS.chat);
    if (remaining === null) {
      return NextResponse.json({ message: 'Crediti insufficienti' }, { status: 403 });
    }

    return NextResponse.json({ response: aiResponse, credits: remaining });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    const message = error.message?.includes('429') || error.message?.includes('quota')
      ? 'Limite di utilizzo AI superato. Riprova più tardi o contatta il supporto.'
      : 'Errore durante l\'elaborazione';
    return NextResponse.json({ message }, { status: 500 });
  }
}
