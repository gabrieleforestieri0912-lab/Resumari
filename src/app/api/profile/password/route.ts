import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getServiceClient, TABLES } from '@/lib/supabase';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Estrae e verifica l'identità dell'utente dal token JWT contenuto nell'header di autorizzazione.
 *
 * @param request La richiesta HTTP entrante.
 * @returns L'oggetto decodificato del token o null se non valido/presente.
 */
function getUserFromToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    if (!JWT_SECRET) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Endpoint API per l'aggiornamento della password dell'utente dal proprio profilo.
 * Verifica la password attuale prima di permettere il cambio.
 *
 * Aspetta un JSON con i campi 'currentPassword' e 'newPassword'.
 */
export async function PUT(request: Request) {
  // Autenticazione tramite token
  const decoded = getUserFromToken(request);
  if (!decoded) {
    return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: 'Password attuale e nuova password sono obbligatorie' },
        { status: 400 }
      );
    }

    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });

    // Recupera l'utente dal database per verificare la password attuale
    const { data: user } = await client
      .from(TABLES.USERS)
      .select()
      .eq('id', decoded.userId)
      .single();

    if (!user) {
      return NextResponse.json({ message: 'Utente non trovato' }, { status: 404 });
    }

    // Confronta la password fornita con l'hash salvato nel DB
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password || '');
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Password attuale non corretta' },
        { status: 400 }
      );
    }

    // Cripta la nuova password e aggiorna il profilo utente
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await client
      .from(TABLES.USERS)
      .update({ password: hashedPassword, updated_at: new Date().toISOString() })
      .eq('id', decoded.userId);

    return NextResponse.json({ message: 'Password aggiornata con successo' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ message: 'Errore nel cambio password' }, { status: 500 });
  }
}
