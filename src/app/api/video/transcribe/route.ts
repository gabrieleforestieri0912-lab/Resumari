import { NextResponse } from 'next/server';
import { getServiceClient, TABLES } from '@/lib/supabase';
import { transcribeAudio } from '@/lib/ai';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });

  if (user.credits <= 0 && user.plan === 'free') {
    return NextResponse.json({ message: 'Crediti insufficienti' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'Nessun file audio fornito' }, { status: 400 });
    }

    const transcription = await transcribeAudio(file);

    // Decrement credits
    if (user.plan !== 'business') {
      const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });
      const { data: currentUser } = await client
        .from(TABLES.USERS)
        .select('credits')
        .eq('id', user.id)
        .single();

      if (currentUser) {
        await client
          .from(TABLES.USERS)
          .update({ credits: Math.max(0, (currentUser.credits || 0) - 1), updated_at: new Date().toISOString() })
          .eq('id', user.id);
      }
    }

    return NextResponse.json({
      text: transcription.text,
      language: (transcription as any).language,
      credits: (user.credits || 0) - 1
    });
  } catch (error) {
    console.error('Transcription API Error:', error);
    return NextResponse.json({ message: 'Errore durante la trascrizione' }, { status: 500 });
  }
}
