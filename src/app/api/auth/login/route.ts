import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getServiceClient, TABLES } from '@/lib/supabase';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Endpoint API per l'autenticazione dell'utente (Login).
 * Verifica le credenziali fornite e genera un token JWT per l'accesso.
 *
 * Aspetta un JSON con i campi 'email' e 'password'.
 */
export async function POST(request: Request) {
  // Controllo rate limit per prevenire attacchi brute-force sul login
  const ip = getClientIp(request.headers);
  const { success } = rateLimit(ip);

  if (!success) {
    return NextResponse.json(
      { message: 'Troppe richieste. Riprova più tardi.' },
      { status: 429 }
    );
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email e password sono obbligatori' },
        { status: 400 }
      );
    }

    if (!JWT_SECRET) {
      return NextResponse.json(
        { message: 'Configurazione server mancante' },
        { status: 500 }
      );
    }

    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });

    // Recupero dell'utente tramite email (normalizzata in minuscolo)
    const { data: user } = await client
      .from(TABLES.USERS)
      .select()
      .eq('email', email.toLowerCase())
      .single();

    if (!user || !user.password) {
      return NextResponse.json(
        { message: 'Credenziali non valide' },
        { status: 401 }
      );
    }

    // Verifica della password utilizzando bcrypt per confrontare l'hash salvato
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Credenziali non valide' },
        { status: 401 }
      );
    }

    // Generazione del token JWT con validità di 7 giorni
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Rimuove la password dall'oggetto utente prima di restituirlo al client per sicurezza
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      token,
      user: { ...userWithoutPassword, id: user.id }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Errore durante il login' },
      { status: 500 }
    );
  }
}
