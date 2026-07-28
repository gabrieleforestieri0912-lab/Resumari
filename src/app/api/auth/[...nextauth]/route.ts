import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { SupabaseAdapter } from '@/lib/nextauth-adapter';
import bcrypt from 'bcryptjs';
import { getServiceClient, TABLES } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

export const authOptions = {
  adapter: SupabaseAdapter(),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const client = getServiceClient();
        if (!client) return null;
        const { data: user } = await client
          .from(TABLES.USERS)
          .select()
          .eq('email', credentials.email.toLowerCase())
          .single();

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          credits: user.credits ?? 10,
          plan: user.plan || 'free',
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.id;
        session.user.credits = token.credits;
        session.user.plan = token.plan;
        session.customToken = token.customToken;
      }
      return session;
    },
    async jwt({ token, user, trigger, session }: any) {
      if (user && process.env.JWT_SECRET) {
        token.id = user.id;
        token.credits = user.credits;
        token.plan = user.plan;

        token.customToken = jwt.sign(
          { userId: user.id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );
      }

      if (trigger === "update" && session?.credits !== undefined) {
        token.credits = session.credits;
        token.plan = session.plan;
      }

      return token;
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 giorni
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

async function safeHandler(req: Request, ...args: any[]) {
  try {
    return await handler(req, ...args);
  } catch (e) {
    console.error('NextAuth handler error:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export { safeHandler as GET, safeHandler as POST };
