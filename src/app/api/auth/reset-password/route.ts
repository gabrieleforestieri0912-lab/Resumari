import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServiceClient, TABLES } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { message: 'Token e nuova password obbligatori' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: 'La password deve avere almeno 6 caratteri' },
        { status: 400 }
      );
    }

    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });
    const { data: user } = await client
      .from(TABLES.USERS)
      .select()
      .eq('reset_token', token)
      .gt('reset_token_expiry', Date.now())
      .single();

    if (!user) {
      return NextResponse.json(
        { message: 'Token non valido o scaduto. Richiedi un nuovo link.' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await client
      .from(TABLES.USERS)
      .update({
        password: hashedPassword,
        reset_token: null,
        reset_token_expiry: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    return NextResponse.json({
      message: 'Password aggiornata con successo. Ora puoi effettuare il login.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { message: 'Errore. Riprova più tardi.' },
      { status: 500 }
    );
  }
}
