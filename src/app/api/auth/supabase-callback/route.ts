import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getServiceClient, TABLES } from '@/lib/supabase';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request: Request) {
  try {
    const { email, name, picture, id: supabaseId } = await request.json();

    if (!email) {
      return NextResponse.json({ message: 'Email obbligatoria' }, { status: 400 });
    }

    if (!JWT_SECRET) {
      return NextResponse.json({ message: 'Configurazione server mancante' }, { status: 500 });
    }

    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });

    // Find existing user by email
    let { data: user } = await client
      .from(TABLES.USERS)
      .select()
      .eq('email', email.toLowerCase())
      .single();

    if (user) {
      // Update existing user's Google info
      await client
        .from(TABLES.USERS)
        .update({
          name: name || user.name,
          picture: picture || user.picture,
          provider: 'google',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    } else {
      // Create new user
      const { data: newUser, error } = await client
        .from(TABLES.USERS)
        .insert({
          email: email.toLowerCase(),
          name: name || email.split('@')[0],
          picture,
          password: null,
          provider: 'google',
          credits: 10,
          plan: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error || !newUser) {
        return NextResponse.json({ message: 'Errore creazione utente' }, { status: 500 });
      }
      user = newUser;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      token,
      user: { ...userWithoutPassword, id: user.id },
    });
  } catch (error) {
    console.error('Supabase callback error:', error);
    return NextResponse.json({ message: 'Errore del server' }, { status: 500 });
  }
}
