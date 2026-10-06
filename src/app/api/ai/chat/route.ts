import { NextResponse } from 'next/server';
import { getServiceClient, TABLES } from '@/lib/supabase';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import {
  DEFAULT_AI_MODEL,
  VISION_AI_MODEL,
  aiErrorMessage,
  generateChatCompletion,
} from '@/lib/ai';
import { getAuthenticatedUser } from '@/lib/auth';
import { hasEnoughCredits, deductCredits, CREDIT_COSTS, creditsExhaustedMessage } from '@/lib/credits';
import { fetchTranscriptForVideo, getVideoDetails, getYouTubeVideoId } from '@/lib/youtube';

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

  // 3. Verifica disponibilità crediti (pool mensile del piano dell'utente)
  if (!hasEnoughCredits(user, CREDIT_COSTS.chat)) {
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
        // Groq non espone più modelli vision (llama-3.2-11b-vision-preview è stato
        // ritirato): senza GROQ_VISION_MODEL l'analisi immagini non è disponibile.
        if (!VISION_AI_MODEL) {
          return NextResponse.json(
            { message: "L'analisi delle immagini non è disponibile in questo momento: invia la domanda come testo." },
            { status: 400 },
          );
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
    systemPrompt +=
      "\nFormattazione obbligatoria (markdown): struttura ogni risposta con titoli di varie grandezze (## per le sezioni, ### per i sottotitoli), paragrafi brevi separati da righe vuote, elenchi puntati per i punti chiave e grassetto/italic per evidenziare i concetti importanti. Mai un muro di testo lineare." +
      "\nQuando citi momenti specifici di un video, usa il formato [MM:SS Titolo breve della sezione] (es. [01:23 Introduzione]).";
    let contextData = "";

    // Aggiunta del contesto da documenti
    if (documentContext) {
      contextData = `DOCUMENTO CONTESTO:\n${documentContext}\n\n`;
      systemPrompt += "\nAnalizza il testo del documento fornito come contesto per rispondere alla domanda.";
    }

    // Aggiunta del contesto da video (trascrizione e dettagli)
    if (videoId) {
      const [transcriptData, details] = await Promise.all([
        fetchTranscriptForVideo(videoId),
        getVideoDetails(videoId)
      ]);
      const transcript = transcriptData
        ? transcriptData.transcript.map((s) => s.text).join(' ')
        : null;

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

    // Selezione del modello (Vision se è presente un'immagine e se configurato)
    const aiModel = imageDataUrl && VISION_AI_MODEL ? VISION_AI_MODEL : DEFAULT_AI_MODEL;

    // Generazione della risposta tramite Groq (le emoji dell'AI vengono
    // mantenute: nessun filtro di rimozione)
    const aiResponse = (await generateChatCompletion(messages, aiModel)) || '';

    const client = getServiceClient();

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
  } catch (error: unknown) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ message: aiErrorMessage(error) }, { status: 500 });
  }
}
