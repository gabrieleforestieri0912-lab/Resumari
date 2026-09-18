import { NextResponse } from 'next/server';
import { getServiceClient, TABLES } from '@/lib/supabase';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { generateChatCompletion, removeEmojis } from '@/lib/ai';
import { getAuthenticatedUser } from '@/lib/auth';
import { hasEnoughCredits, deductCredits, CREDIT_COSTS } from '@/lib/credits';

// Chiave API per l'accesso ai dati di YouTube
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

// Header per simulare un browser durante le richieste a YouTube (evita blocchi)
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
  'Referer': 'https://www.youtube.com/',
  'Origin': 'https://www.youtube.com',
};

/**
 * Estrae l'ID di un video YouTube da un URL o da una stringa.
 */
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

/**
 * Recupera dettagli di un video (titolo, descrizione, ecc.) tramite l'API ufficiale di YouTube.
 */
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

/**
 * Tenta di recuperare la trascrizione di un video YouTube in italiano o inglese.
 * Utilizza diverse fonti per massimizzare le probabilità di successo.
 */
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

/**
 * Endpoint API per la chat AI.
 * Gestisce l'input dell'utente, il contesto (video/documenti/immagini) e la generazione della risposta.
 */
export async function POST(request: Request) {
  // 1. Controllo Rate Limit per prevenire abusi
  const ip = getClientIp(request.headers);
  const { success: rlSuccess } = rateLimit(ip);
  if (!rlSuccess) return NextResponse.json({ message: 'Troppe richieste' }, { status: 429 });

  // 2. Autenticazione utente
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });

  // 3. Verifica disponibilità crediti
  if (!hasEnoughCredits(user, CREDIT_COSTS.chat)) {
    return NextResponse.json(
      { message: 'Crediti insufficienti. I crediti si ricaricano ogni mese con un piano Pro o Business.' },
      { status: 403 }
    );
  }

  try {
    let message = '';
    let providedVideoId: string | undefined;
    let documentContext = '';
    let imageDataUrl: string | null = null;

    // Parsing del corpo della richiesta (supporta JSON e multipart/form-data per le immagini)
    if (request.headers.get('content-type')?.includes('multipart/form-data')) {
      const formData = await request.formData();
      message = String(formData.get('message') || '');
      providedVideoId = String(formData.get('videoId') || '') || undefined;
      documentContext = String(formData.get('documentContext') || '');
      const image = formData.get('image');

      if (image instanceof File) {
        if (!image.type.startsWith('image/')) {
          return NextResponse.json({ message: 'È possibile allegare solo immagini.' }, { status: 400 });
        }
        if (image.size > 10 * 1024 * 1024) {
          return NextResponse.json({ message: 'L’immagine non può superare 10 MB.' }, { status: 400 });
        }
        const bytes = Buffer.from(await image.arrayBuffer()).toString('base64');
        imageDataUrl = `data:${image.type};base64,${bytes}`;
      }
    } else {
      const body = await request.json();
      message = String(body.message || '');
      providedVideoId = body.videoId;
      documentContext = body.documentContext || '';
    }

    if (!message.trim() && !imageDataUrl) {
      return NextResponse.json({ message: 'Inserisci un messaggio o allega un’immagine.' }, { status: 400 });
    }

    // Identificazione del video (se presente nel messaggio o fornito esplicitamente)
    const videoId = providedVideoId || getYouTubeVideoId(message);

    let systemPrompt = "Sei Resumari, un assistente AI esperto in riassunti video e analisi documenti. Rispondi in italiano.";
    let contextData = "";

    // Aggiunta del contesto da documenti
    if (documentContext) {
      contextData = `DOCUMENTO CONTESTO:\n${documentContext}\n\n`;
      systemPrompt += "\nAnalizza il testo del documento fornito come contesto per rispondere alla domanda.";
    }

    // Aggiunta del contesto da video (trascrizione e dettagli)
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

    // Costruzione del messaggio finale per l'AI
    const userText = contextData ? `${contextData}\n\nDOMANDA: ${message}` : (message || 'Descrivi e analizza questa immagine.');
    const messages = [
      { role: 'system' as const, content: systemPrompt + (imageDataUrl ? '\nAnalizza anche l’immagine allegata in dettaglio.' : '') },
      {
        role: 'user' as const,
        content: imageDataUrl
          ? [
              { type: 'text' as const, text: userText },
              { type: 'image_url' as const, image_url: { url: imageDataUrl } },
            ]
          : userText,
      },
    ];

    // Selezione del modello (Vision se è presente un'immagine)
    const aiModel = imageDataUrl ? 'llama-3.2-11b-vision-preview' : undefined;

    // Generazione della risposta tramite Groq
    const aiResponse = removeEmojis(
      (await generateChatCompletion(messages, aiModel)) || '',
    );

    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });

    // Salvataggio della cronologia della chat nel database Supabase
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

    // Detrazione dei crediti dell'utente
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
