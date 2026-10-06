import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { SupabaseAdapter } from '@/lib/nextauth-adapter';
import bcrypt from 'bcryptjs';
import { getServiceClient, TABLES } from '@/lib/supabase';
import { getPlanLimit } from '@/lib/credits';
import jwt from 'jsonwebtoken';

/**
 * Configurazione di NextAuth per la gestione dell'autenticazione.
 * Supporta l'accesso tramite Google OAuth e credenziali classiche (Email/Password).
 * Utilizza un adapter personalizzato per persistere i dati su Supabase.
 */
export const authOptions = {
  adapter: SupabaseAdapter(),
  providers: [
    // Provider per l'autenticazione tramite account Google
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // Provider per l'autenticazione tramite email e password
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const client = getServiceClient();
        const { data: user } = await client
          .from(TABLES.USERS)
          .select()
          .eq('email', credentials.email.toLowerCase())
          .single();

        if (!user || !user.password) return null;

        // Verifica la validità della password tramite bcrypt
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          credits: user.credits ?? getPlanLimit('free'),
          plan: user.plan || 'free',
        };
      },
    }),
  ],
  callbacks: {
    /**
     * Callback eseguita quando la sessione viene creata o aggiornata.
     * Permette di aggiungere dati personalizzati (come crediti e piano) all'oggetto sessione.
     */
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.id;
        session.user.credits = token.credits;
        session.user.plan = token.plan;
        session.customToken = token.customToken;
      }

      // NOTA: qui NON si interroga il database (es. per l'avatar aggiornato).
      // Questo callback gira a ogni /api/auth/session — anche durante il login
      // Google — e una query lenta appendeva tutto il flusso fino al timeout,
      // ributtando l'utente al login senza sessione. L'avatar si sincronizza
      // al login OAuth tramite adapter.updateUser: basta e avanza.
      return session;
    },
    /**
     * Callback eseguita durante la creazione o l'aggiornamento del token JWT.
     * Utilizzata per includere informazioni dell'utente nel token e generare un token personalizzato.
     */
    async jwt({ token, user, trigger, session }: any) {
      if (user && process.env.JWT_SECRET) {
        token.id = user.id;
        token.credits = user.credits;
        token.plan = user.plan;

        // Genera un token JWT separato per l'uso in API esterne
        token.customToken = jwt.sign(
          { userId: user.id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );
      }

      // Permette l'aggiornamento dei crediti/piano nella sessione senza richiedere il login
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
    maxAge: 30 * 24 * 60 * 60, // Sessione valida per 30 giorni
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

/**
 * Wrapper per l'handler di NextAuth che cattura gli errori a livello globale
 * per evitare crash del server durante l'autenticazione.
 */
async function safeHandler(req: Request, ...args: any[]) {
  try {
    return await handler(req, ...args);
  } catch (e) {
    console.error('NextAuth handler error:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export { safeHandler as GET, safeHandler as POST };
