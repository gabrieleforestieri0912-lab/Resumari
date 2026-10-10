import { NextResponse } from 'next/server';
import { aiErrorMessage, generateChatCompletion, streamChatCompletion } from '@/lib/ai';
import { createSseStream } from '@/lib/sse';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { extractYouTubeVideoId } from '@/lib/youtube-ids';
import { getVideoContext } from '@/lib/youtube';
import { buildTimedTranscript, TS_PROMPT_RULES, type TimedSegment } from '@/lib/timestamps';

/**
 * Endpoint di test/demo per l'interazione con l'AI.
 * Permette di testare rapidamente la generazione di risposte senza l'intera logica di business dell'app.
 */
export async function GET() {
  return NextResponse.json({
    message: 'Demo AI endpoint',
    status: 'ok',
  });
}

/**
 * Gestisce le richieste POST per generare una risposta dall'AI.
 * Include un controllo di rate limit basato sull'indirizzo IP del client.
 */
export async function POST(request: Request) {
  // Controllo rate limit per prevenire abusi dell'endpoint demo
  const ip = getClientIp(request.headers);
  const { success: rlSuccess } = rateLimit(ip);
  if (!rlSuccess) return NextResponse.json({ message: 'Troppe richieste' }, { status: 429 });

  try {
    const { message, context, videoId: providedVideoId } = await request.json();

    if (!message) {
      return NextResponse.json({ message: 'Messaggio obbligatorio' }, { status: 400 });
    }

    // Configura il prompt di sistema utilizzando il contesto fornito o un default
    let systemPrompt = context || 'Fornisci una risposta chiara e concisa in italiano.';

    // Il renderer della demo supporta titoli, paragrafi, elenchi e
    // grassetto/italic (niente tabelle): l'AI deve usarli sempre per
    // risposte strutturate e mai muri di testo lineari.
    systemPrompt +=
      '\nFormattazione obbligatoria (markdown semplice, niente tabelle): struttura ogni risposta con titoli di varie grandezze (## per le sezioni, ### per i sottotitoli), paragrafi brevi separati da righe vuote, elenchi puntati per i punti chiave e grassetto/italic per evidenziare i concetti importanti.' +
      '\nQuando citi momenti specifici di un video, usa il formato [MM:SS Titolo breve della sezione] (es. [01:23 Introduzione] oppure [00:45 Closure in JavaScript]). Non usare solo il secondaggio nudo, aggiungi sempre un titolo descrittivo di 2-5 parole.' +
      ' Genera i timestamp come UNICO blocco (un elenco puntato dedicato ai momenti chiave), non sparsi né costruiti pezzo per pezzo. Scrivili solo come testo [MM:SS Titolo], mai come HTML: il frontend li trasforma in link cliccabili.' +
      TS_PROMPT_RULES;

    // Identificazione del video: esplicito dal client o estratto dal testo
    // (stesso pattern della chat: senza trascrizione l'AI non può analizzare
    // il video — prima di questa fix il videoId veniva ignorato del tutto).
    const videoId = providedVideoId || extractYouTubeVideoId(message || '');

    // Contesto video (trascrizione e dettagli): la demo è la prova gratuita,
    // quindi niente auth/crediti — solo rate limit per IP (sopra).
    let contextData = '';
    let videoTitle: string | null = null;
    // Trascrizione con tempi reali: inviata al modello (che non deve inventare
    // i timestamp) e restituita al client, che la usa per riallineare i tempi
    // citati nella risposta.
    let timedSegments: TimedSegment[] = [];
    if (videoId) {
      // Cache: nella demo il video è quasi sempre lo stesso, quindi la
      // trascrizione viene scaricata da YouTube solo alla prima domanda.
      const { transcript: transcriptData, details } = await getVideoContext(videoId);
      const timed = buildTimedTranscript(transcriptData?.transcript);

      if (timed.text) {
        timedSegments = timed.segments;
        videoTitle = details?.title || videoId;
        contextData += `VIDEO: ${details?.title || videoId} (canale: ${details?.channelTitle || 'sconosciuto'})\nTRASCRIZIONE (ogni riga è preceduta dal suo tempo reale):\n${timed.text}`;
        systemPrompt += '\nAnalizza la trascrizione del video fornita per rispondere o riassumere.';
      } else if (details) {
        videoTitle = details.title;
        contextData += `TITOLO: ${details.title}\nDESCRIZIONE: ${(details.description || '').substring(0, 3000)}`;
        systemPrompt += '\nTrascrizione non disponibile, usa titolo e descrizione del video e dillo chiaramente.';
      } else {
        return NextResponse.json(
          {
            message:
              'Non riesco a caricare questo video: controlla che il link sia valido, che il video sia pubblico e che abbia i sottotitoli abilitati.',
            videoId,
          },
          { status: 422 },
        );
      }
    }

    const userText = contextData ? `${contextData}\n\nDOMANDA: ${message}` : message;
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userText },
    ];

    // Streaming SSE: il client riceve subito i metadati del video analizzato
    // (`meta`) e poi i token (`delta`), invece di aspettare la risposta intera
    // per vederla comparire di colpo.
    if (request.headers.get('accept')?.includes('text/event-stream')) {
      return createSseStream(async ({ send, close }) => {
        send('meta', {
          videoId: videoId || undefined,
          videoTitle,
          transcript: timedSegments.length > 0 ? timedSegments : undefined,
        });

        let response = '';
        try {
          for await (const delta of streamChatCompletion(messages)) {
            response += delta;
            send('delta', { text: delta });
          }
        } catch (error) {
          console.error('Demo stream error:', error);
          send('error', { message: aiErrorMessage(error) });
          close();
          return;
        }
        send('done', { response });
        close();
      });
    }

    // Generazione della risposta tramite Groq (emoji dell'AI mantenute)
    const aiResponse = (await generateChatCompletion(messages)) || '';

    return NextResponse.json({
      response: aiResponse,
      videoId: videoId || undefined,
      videoTitle,
      // Trascrizione usata dal client per verificare i timestamp della risposta.
      transcript: timedSegments.length > 0 ? timedSegments : undefined,
    });
  } catch (error: unknown) {
    console.error('Demo AI Error:', error);
    // Distingue chiave/modello/quota: senza questo tutte le cause diventavano
    // il generico "Errore durante l'elaborazione".
    return NextResponse.json({ message: aiErrorMessage(error) }, { status: 500 });
  }
}
