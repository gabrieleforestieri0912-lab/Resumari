import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getServiceClient, TABLES } from '@/lib/supabase';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const { success } = rateLimit(ip);

  if (!success) {
    return NextResponse.json(
      { message: 'Troppe richieste. Riprova più tardi.', code: 'RATE_LIMIT' },
      { status: 429 }
    );
  }

  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email e password sono obbligatori', code: 'MISSING_FIELDS' },
        { status: 400 }
      );
    }

    if (!JWT_SECRET) {
      return NextResponse.json(
        { message: 'Configurazione server mancante', code: 'SERVER_ERROR' },
        { status: 500 }
      );
    }

    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });
    const { data: existingUser } = await client
      .from(TABLES.USERS)
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { message: 'Esiste già un account con questa email. Prova a effettuare il login.', code: 'USER_EXISTS' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: newUser, error } = await client
      .from(TABLES.USERS)
      .insert({
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name || email.split('@')[0],
        credits: 10,
        plan: 'free',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !newUser) {
      return NextResponse.json(
        { message: 'Errore durante la registrazione. Riprova più tardi.', code: 'REGISTRATION_FAILED' },
        { status: 500 }
      );
    }

    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json({
      token,
      user: { ...userWithoutPassword, id: newUser.id }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Errore durante la registrazione. Riprova più tardi.', code: 'REGISTRATION_FAILED' },
      { status: 500 }
    );
  }
}
