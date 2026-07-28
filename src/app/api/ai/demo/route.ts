import { NextResponse } from 'next/server';
import { generateChatCompletion } from '@/lib/ai';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET() {
  return NextResponse.json({
    message: 'Demo AI endpoint',
    status: 'ok',
  });
}

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const { success: rlSuccess } = rateLimit(ip);
  if (!rlSuccess) return NextResponse.json({ message: 'Troppe richieste' }, { status: 429 });

  try {
    const { message, context, videoId } = await request.json();

    if (!message) {
      return NextResponse.json({ message: 'Messaggio obbligatorio' }, { status: 400 });
    }

    let systemPrompt = context || 'Fornisci una risposta chiara e concisa in italiano.';

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: message },
    ];

    const aiResponse = await generateChatCompletion(messages);

    return NextResponse.json({ response: aiResponse });
  } catch (error: any) {
    console.error('Demo AI Error:', error);
    const errorMessage = error.message?.includes('429') || error.message?.includes('quota')
      ? 'Limite di utilizzo AI superato. Riprova più tardi.'
      : 'Errore durante l\'elaborazione';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
