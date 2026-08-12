import { NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/ai';
import { getAuthenticatedUser } from '@/lib/auth';
import { hasEnoughCredits, deductCredits, CREDIT_COSTS } from '@/lib/credits';

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });

  if (!hasEnoughCredits(user, CREDIT_COSTS.transcription)) {
    return NextResponse.json(
      { message: 'Crediti insufficienti. I crediti si ricaricano ogni mese con un piano Pro o Business.' },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'Nessun file audio fornito' }, { status: 400 });
    }

    const transcription = await transcribeAudio(file);

    // Atomic deduction — blocks every plan (pool model) and prevents overspending.
    const remaining = await deductCredits(user.id, CREDIT_COSTS.transcription);
    if (remaining === null) {
      return NextResponse.json({ message: 'Crediti insufficienti' }, { status: 403 });
    }

    return NextResponse.json({
      text: transcription.text,
      language: (transcription as any).language,
      credits: remaining
    });
  } catch (error) {
    console.error('Transcription API Error:', error);
    return NextResponse.json({ message: 'Errore durante la trascrizione' }, { status: 500 });
  }
}
