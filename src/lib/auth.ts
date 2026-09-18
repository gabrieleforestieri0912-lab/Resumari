import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServiceClient, TABLES } from '@/lib/supabase';
import jwt from 'jsonwebtoken';
import type { User } from '@/lib/types';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Identifica e restituisce l'utente autenticato effettuando il controllo su due canali:
 * 1. Sessione NextAuth (utilizzata principalmente per le richieste lato client/browser).
 * 2. Token JWT Bearer (utilizzato per richieste API esterne o programmatiche).
 *
 * @param request L'oggetto request della chiamata API.
 * @returns L'oggetto utente recuperato dal database o null se l'utente non è autenticato.
 */
export async function getAuthenticatedUser(request: Request): Promise<(User & { id: string }) | null> {
  // 1. Tentativo di recupero tramite sessione NextAuth
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const { data: user } = await getServiceClient()
        .from(TABLES.USERS)
        .select()
        .eq('id', session.user.id)
        .single();
      if (user) {
        return user as User & { id: string };
      }
    }
  } catch (e) {
    console.error('Error fetching NextAuth session:', e);
  }

  // 2. Tentativo di recupero tramite Token JWT Bearer (header Authorization)
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token && JWT_SECRET) {
        // Verifica la validità del token utilizzando il segreto JWT
        const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string; id?: string };
        const userId = decoded.userId || decoded.id;

        if (userId) {
          const { data: user } = await getServiceClient()
            .from(TABLES.USERS)
            .select()
            .eq('id', userId)
            .single();
          if (user) {
            return user as User & { id: string };
          }
        }
      }
    }
  } catch (e) {
    console.error('Error verifying JWT Bearer token:', e);
  }

  return null;
}
