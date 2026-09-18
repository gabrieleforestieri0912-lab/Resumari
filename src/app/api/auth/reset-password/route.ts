import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServiceClient, TABLES } from '@/lib/supabase';

/**
 * Endpoint API per il reset della password dell'utente.
 * Verifica la validità di un token di reset temporaneo e aggiorna la password nel database.
 *
 * Aspetta un JSON con i campi 'token' e 'newPassword'.
 */
export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json();

    // Validazione parametri di input
    if (!token || !newPassword) {
      return NextResponse.json(
        { message: 'Token e nuova password obbligatori' },
        { status: 400 }
      );
    }

    // Requisito minimo di sicurezza per la lunghezza della password
    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: 'La password deve avere almeno 6 caratteri' },
        { status: 400 }
      );
    }

    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });

    // Verifica l'esistenza di un utente con quel token e che non sia ancora scaduto
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

    // Cripta la nuova password prima di salvarla
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Aggiorna la password e rimuove il token di reset per renderlo inutilizzabile
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
