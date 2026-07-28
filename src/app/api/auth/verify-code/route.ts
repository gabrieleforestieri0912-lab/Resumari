import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getServiceClient, TABLES } from '@/lib/supabase';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const { success } = rateLimit(ip);
  if (!success) {
    return NextResponse.json({ message: 'Troppe richieste. Riprova più tardi.' }, { status: 429 });
  }

  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ message: 'Email e codice sono obbligatori' }, { status: 400 });
    }

    if (!JWT_SECRET) {
      return NextResponse.json({ message: 'Configurazione server mancante' }, { status: 500 });
    }

    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });

    // Find valid verification code
    const { data: record } = await client
      .from(TABLES.VERIFICATION_CODES)
      .select()
      .eq('email', email.toLowerCase())
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!record) {
      return NextResponse.json({ message: 'Codice non valido o scaduto' }, { status: 401 });
    }

    // Mark code as used
    await client
      .from(TABLES.VERIFICATION_CODES)
      .update({ used: true })
      .eq('id', record.id);

    // Find or create user
    let { data: user } = await client
      .from(TABLES.USERS)
      .select()
      .eq('email', email.toLowerCase())
      .single();

    if (!user) {
      const name = email.split('@')[0];
      const { data: newUser, error } = await client
        .from(TABLES.USERS)
        .insert({
          email: email.toLowerCase(),
          name,
          credits: 10,
          plan: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error || !newUser) {
        return NextResponse.json({ message: 'Errore durante la creazione dell\'account' }, { status: 500 });
      }
      user = newUser;
    }

    if (!JWT_SECRET) return NextResponse.json({ message: 'Configurazione server mancante' }, { status: 500 });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      token,
      user: { ...userWithoutPassword, id: user.id }
    });
  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json({ message: 'Errore durante la verifica del codice' }, { status: 500 });
  }
}
