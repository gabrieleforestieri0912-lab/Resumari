import { NextResponse } from 'next/server';
import { getServiceClient, TABLES } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * Endpoint API per l'eliminazione di una specifica trascrizione.
 * Verifica che la trascrizione appartenga all'utente autenticato prima di procedere.
 *
 * Parametro URL: id (l'ID univoco della trascrizione da eliminare).
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Autenticazione dell'utente
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });

    // Elimina la trascrizione solo se l'ID utente corrisponde (sicurezza)
    await client
      .from(TABLES.TRANSCRIPTS)
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete transcript error:', error);
    return NextResponse.json({ message: 'Errore nell\'eliminazione trascrizione' }, { status: 500 });
  }
}
