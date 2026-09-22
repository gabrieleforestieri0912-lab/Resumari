import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getPlanLimit } from '@/lib/credits';
import { getServiceClient, TABLES } from '@/lib/supabase';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Endpoint di callback utilizzato per gestire l'autenticazione tramite Supabase/Google.
 * Sincronizza l'utente autenticato esternamente con il database locale di Resumari,
 * creando l'utente se non esiste o aggiornandone i dati.
 *
 * Aspetta un JSON con i dati dell'utente (email, name, picture, id).
 */
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

    // Verifica se esiste già un utente con l'email fornita
    let { data: user } = await client
      .from(TABLES.USERS)
      .select()
      .eq('email', email.toLowerCase())
      .single();

    if (user) {
      // L'utente esiste già: aggiorna le informazioni provenienti dal provider (Google)
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
      // L'utente non esiste: crea un nuovo profilo con i crediti e il piano di default
      const { data: newUser, error } = await client
        .from(TABLES.USERS)
        .insert({
          email: email.toLowerCase(),
          name: name || email.split('@')[0],
          picture,
          password: null,
          provider: 'google',
          credits: getPlanLimit('free'),
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

    // Genera un token JWT per mantenere l'utente autenticato nell'applicazione
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Rimuove la password (se presente) prima di restituire l'utente
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
