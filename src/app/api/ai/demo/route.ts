import { NextResponse } from 'next/server';
import { aiErrorMessage, generateChatCompletion, removeEmojis } from '@/lib/ai';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

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
    const { message, context, videoId } = await request.json();

    if (!message) {
      return NextResponse.json({ message: 'Messaggio obbligatorio' }, { status: 400 });
    }

    // Configura il prompt di sistema utilizzando il contesto fornito o un default
    let systemPrompt = context || 'Fornisci una risposta chiara e concisa in italiano.';

    // Il renderer della demo interpreta solo paragrafi, elenchi e grassetto:
    // tabelle e titoli con # verrebbero mostrati come testo grezzo.
    systemPrompt +=
      '\nFormatta la risposta in markdown semplice (paragrafi, elenchi puntati, grassetto). Non usare tabelle né titoli con #.' +
      '\nQuando citi momenti specifici di un video, usa il formato [MM:SS Titolo breve della sezione] (es. [01:23 Introduzione] oppure [00:45 Closure in JavaScript]). Non usare solo il secondaggio nudo, aggiungi sempre un titolo descrittivo di 2-5 parole.';

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: message },
    ];

    // Generazione della risposta tramite Groq (emoji rimosse come nella chat autenticata)
    const aiResponse = removeEmojis((await generateChatCompletion(messages)) || '');

    return NextResponse.json({ response: aiResponse });
  } catch (error: unknown) {
    console.error('Demo AI Error:', error);
    // Distingue chiave/modello/quota: senza questo tutte le cause diventavano
    // il generico "Errore durante l'elaborazione".
    return NextResponse.json({ message: aiErrorMessage(error) }, { status: 500 });
  }
}
