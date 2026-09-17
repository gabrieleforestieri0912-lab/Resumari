import { NextResponse } from 'next/server';
import { getServiceClient, TABLES } from '@/lib/supabase';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WAITLIST_MARKER = '[waitlist]';

function isMissingTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist')
  );
}

export async function POST(request: Request) {
  try {
    let body: { nome?: unknown; email?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 });
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 });
    }

    const emailPulita = body.email ? String(body.email).trim().toLowerCase() : '';
    const nomePulito = body.nome ? String(body.nome).trim() : '';

    if (!emailPulita || !EMAIL_RE.test(emailPulita)) {
      return NextResponse.json(
        { message: 'Inserisci un’email valida.' },
        { status: 400 },
      );
    }

    if (!nomePulito) {
      return NextResponse.json(
        { message: 'Inserisci il tuo nome.' },
        { status: 400 },
      );
    }

    if (nomePulito.length > 120) {
      return NextResponse.json(
        { message: 'Il nome è troppo lungo.' },
        { status: 400 },
      );
    }

    let client;
    try {
      client = getServiceClient();
    } catch {
      return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }

    const { data: existing, error: selectError } = await client
      .from(TABLES.WAITLIST)
      .select('id')
      .eq('email', emailPulita)
      .maybeSingle();

    const waitlistMissing = isMissingTable(selectError);

    if (selectError && !waitlistMissing) {
      console.error('Waitlist lookup error:', selectError);
      return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ success: true, alreadyJoined: true });
    }

    if (!waitlistMissing) {
      const { error } = await client.from(TABLES.WAITLIST).insert({
        nome: nomePulito,
        email: emailPulita,
        created_at: new Date().toISOString(),
      });

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json({ success: true, alreadyJoined: true });
        }
        if (!isMissingTable(error)) {
          console.error('Waitlist insert error:', error);
          return NextResponse.json({ message: 'Errore del server.' }, { status: 500 });
        }
      } else {
        return NextResponse.json({ success: true });
      }
    }

    const { data: existingFallback } = await client
      .from(TABLES.MESSAGES)
      .select('id')
      .eq('email', emailPulita)
      .eq('messaggio', WAITLIST_MARKER)
      .maybeSingle();

    if (existingFallback) {
      return NextResponse.json({ success: true, alreadyJoined: true });
    }

    const { error: fallbackError } = await client.from(TABLES.MESSAGES).insert({
      nome: nomePulito || 'Waitlist',
      email: emailPulita,
      messaggio: WAITLIST_MARKER,
      created_at: new Date().toISOString(),
    });

    if (fallbackError) {
      console.error('Waitlist fallback insert error:', fallbackError);
      return NextResponse.json({ message: 'Errore del server.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Waitlist error:', error);
    return NextResponse.json({ message: 'Errore del server.' }, { status: 500 });
  }
}
