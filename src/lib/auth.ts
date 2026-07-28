import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServiceClient, TABLES } from '@/lib/supabase';
import jwt from 'jsonwebtoken';
import type { User } from '@/lib/types';

const JWT_SECRET = process.env.JWT_SECRET;

export async function getAuthenticatedUser(request: Request): Promise<(User & { id: string }) | null> {
  // 1. Try NextAuth session
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

  // 2. Try JWT Bearer Token
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token && JWT_SECRET) {
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
