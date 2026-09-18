import { NextResponse } from 'next/server';
import { getServiceClient, TABLES } from '@/lib/supabase';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * Endpoint API per la gestione del profilo utente.
 * Gestisce il recupero (GET), l'aggiornamento (PUT) e l'eliminazione (DELETE) dell'account.
 */

/**
 * Recupera i dati del profilo dell'utente autenticato.
 */
export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
  }

  try {
    // Rimuove la password dai dati restituiti per motivi di sicurezza
    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json({ ...userWithoutPassword, id: user.id });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ message: 'Errore nel recupero profilo' }, { status: 500 });
  }
}

/**
 * Aggiorna le informazioni del profilo utente.
 * Supporta l'aggiornamento di nome, lingua preferita e immagine del profilo.
 */
export async function PUT(request: Request) {
  // Controllo rate limit per prevenire l'abuso dell'endpoint di aggiornamento profilo
  const ip = getClientIp(request.headers);
  const { success } = rateLimit(ip);

  if (!success) {
    return NextResponse.json({ message: 'Troppe richieste. Riprova più tardi.' }, { status: 429 });
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const { name, locale, picture } = await request.json();
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name) updateData.name = name;
    if (locale) updateData.locale = locale;
    // L'avatar è salvato come data URL (o URL immagine OAuth).
    // Permette di essere cancellato esplicitamente impostando picture a null.
    if (picture !== undefined) updateData.picture = picture || null;

    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });
    const { data: updatedUser } = await client
      .from(TABLES.USERS)
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (!updatedUser) {
      return NextResponse.json({ message: 'Utente non trovato' }, { status: 404 });
    }

    const { password: _, ...userWithoutPassword } = updatedUser;
    return NextResponse.json({ ...userWithoutPassword, id: updatedUser.id });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ message: 'Errore nell\'aggiornamento profilo' }, { status: 500 });
  }
}

/**
 * Elimina definitivamente l'account dell'utente autenticato.
 */
export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });
    await client
      .from(TABLES.USERS)
      .delete()
      .eq('id', user.id);

    return NextResponse.json({ message: 'Account eliminato con successo' });
  } catch (error) {
    console.error('Delete profile error:', error);
    return NextResponse.json({ message: 'Errore nell\'eliminazione account' }, { status: 500 });
  }
}
