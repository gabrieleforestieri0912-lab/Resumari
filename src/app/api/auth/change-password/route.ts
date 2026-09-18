import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServiceClient, TABLES } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * Endpoint API per consentire all'utente di cambiare la propria password.
 * Verifica la password attuale prima di permettere l'aggiornamento a una nuova.
 *
 * Aspetta un JSON con i campi 'currentPassword' e 'newPassword'.
 */
export async function POST(request: Request) {
  // Verifica l'autenticazione dell'utente richiedente
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await request.json();

    // Validazione dei campi obbligatori
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: 'Tutti i campi sono obbligatori' },
        { status: 400 }
      );
    }

    // Verifica della lunghezza minima per la nuova password
    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: 'La nuova password deve avere almeno 6 caratteri' },
        { status: 400 }
      );
    }

    // Verifica che la password attuale sia corretta confrontando l'hash
    const isMatch = await bcrypt.compare(currentPassword, user.password || '');
    if (!isMatch) {
      return NextResponse.json(
        { message: 'Password attuale errata' },
        { status: 400 }
      );
    }

    // Cripta la nuova password prima del salvataggio
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });

    // Aggiorna la password nel database Supabase
    await client
      .from(TABLES.USERS)
      .update({
        password: hashedPassword,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    return NextResponse.json({
      message: 'Password aggiornata con successo'
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { message: 'Errore durante l\'aggiornamento della password' },
      { status: 500 }
    );
  }
}
