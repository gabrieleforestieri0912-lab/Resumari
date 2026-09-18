import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
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
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Endpoint API per l'eliminazione di una specifica chat.
 * Verifica che l'utente richiedente sia il proprietario della chat prima di procedere.
 *
 * Parametro URL: id (il chat_id della conversazione da eliminare).
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Autenticazione tramite token
  const decoded = getUserFromToken(request);
  if (!decoded) {
    return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });

    // Elimina la chat solo se appartiene all'utente autenticato (sicurezza)
    await client
      .from(TABLES.CHATS)
      .delete()
      .eq('user_id', decoded.userId)
      .eq('chat_id', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete chat error:', error);
    return NextResponse.json({ message: 'Errore nell\'eliminazione chat' }, { status: 500 });
  }
}
