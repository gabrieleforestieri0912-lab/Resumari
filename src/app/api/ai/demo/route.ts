import { NextResponse } from 'next/server';
import { generateChatCompletion } from '@/lib/ai';
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

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: message },
    ];

    // Generazione della risposta tramite Groq
    const aiResponse = await generateChatCompletion(messages);

    return NextResponse.json({ response: aiResponse });
  } catch (error: any) {
    console.error('Demo AI Error:', error);
    // Gestione specifica per l'errore di quota/rate-limit dell'API Groq
    const errorMessage = error.message?.includes('429') || error.message?.includes('quota')
      ? 'Limite di utilizzo AI superato. Riprova più tardi.'
      : 'Errore durante l\'elaborazione';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
