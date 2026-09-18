import type { Adapter, AdapterUser, AdapterAccount, AdapterSession, VerificationToken } from 'next-auth/adapters'
import { getServiceClient, TABLES } from '@/lib/supabase'

/**
 * Implementazione di un Adapter NextAuth per Supabase.
 * Questo adapter permette a NextAuth di gestire utenti, sessioni, account e token di verifica
 * interagendo direttamente con le tabelle del database Supabase.
 */
export function SupabaseAdapter(): Adapter {
  return {
    /**
     * Crea un nuovo utente nel database.
     * Assegna i crediti iniziali (10) e il piano 'free' per default.
     */
    async createUser(user: any) {
      const { data, error } = await getServiceClient()
        .from(TABLES.USERS)
        .insert({
          email: user.email,
          name: user.name,
          picture: user.image,
          credits: 10,
          plan: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error || !data) throw new Error(`Failed to create user: ${error?.message}`)
      return mapUser(data)
    },

    /**
     * Recupera un utente tramite il suo ID unico.
     */
    async getUser(id: string) {
      const { data } = await getServiceClient()
        .from(TABLES.USERS)
        .select()
        .eq('id', id)
        .single()

      return data ? mapUser(data) : null
    },

    /**
     * Recupera un utente tramite il suo indirizzo email.
     */
    async getUserByEmail(email: string) {
      const { data } = await getServiceClient()
        .from(TABLES.USERS)
        .select()
        .eq('email', email.toLowerCase())
        .single()

      return data ? mapUser(data) : null
    },

    /**
     * Recupera un utente collegato a un account di un provider esterno (es. Google).
     */
    async getUserByAccount({ provider, providerAccountId }: { provider: string; providerAccountId: string }) {
      const { data: account } = await getServiceClient()
        .from(TABLES.ACCOUNTS)
        .select('user_id')
        .eq('provider', provider)
        .eq('provider_account_id', providerAccountId)
        .single()

      if (!account) return null

      const { data: user } = await getServiceClient()
        .from(TABLES.USERS)
        .select()
        .eq('id', account.user_id)
        .single()

      return user ? mapUser(user) : null
    },

    /**
     * Aggiorna i dati di base di un utente.
     */
    async updateUser(user: any) {
      const { data, error } = await getServiceClient()
        .from(TABLES.USERS)
        .update({
          name: user.name,
          picture: user.image,
          email: user.email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id!)
        .select()
        .single()

      if (error || !data) throw new Error(`Failed to update user: ${error?.message}`)
      return mapUser(data)
    },

    /**
     * Elimina un utente dal database.
     */
    async deleteUser(userId: string) {
      await getServiceClient().from(TABLES.USERS).delete().eq('id', userId)
    },

    /**
     * Collega un account di un provider esterno a un utente esistente.
     */
    async linkAccount(account: any) {
      const { data, error } = await getServiceClient()
        .from(TABLES.ACCOUNTS)
        .insert({
          user_id: account.userId,
          type: account.type,
          provider: account.provider,
          provider_account_id: account.providerAccountId,
          refresh_token: account.refresh_token,
          access_token: account.access_token,
          expires_at: account.expires_at,
          token_type: account.token_type,
          scope: account.scope,
          id_token: account.id_token,
          session_state: account.session_state,
        })
        .select()
        .single()

      if (error || !data) throw new Error(`Failed to link account: ${error?.message}`)
      return mapAccount(data)
    },

    /**
     * Rimuove il collegamento tra un utente e un account provider.
     */
    async unlinkAccount({ provider, providerAccountId }: { provider: string; providerAccountId: string }) {
      await getServiceClient()
        .from(TABLES.ACCOUNTS)
        .delete()
        .eq('provider', provider)
        .eq('provider_account_id', providerAccountId)
    },

    /**
     * Crea una nuova sessione utente.
     */
    async createSession({ sessionToken, userId, expires }: { sessionToken: string; userId: string; expires: Date }) {
      const { data, error } = await getServiceClient()
        .from(TABLES.SESSIONS)
        .insert({
          session_token: sessionToken,
          user_id: userId,
          expires: expires.toISOString(),
        })
        .select()
        .single()

      if (error || !data) throw new Error(`Failed to create session: ${error?.message}`)
      return mapSession(data)
    },

    /**
     * Recupera una sessione e l'utente ad essa associato.
     */
    async getSessionAndUser(sessionToken: string) {
      const { data: session } = await getServiceClient()
        .from(TABLES.SESSIONS)
        .select()
        .eq('session_token', sessionToken)
        .single()

      if (!session) return null

      const { data: user } = await getServiceClient()
        .from(TABLES.USERS)
        .select()
        .eq('id', session.user_id)
        .single()

      if (!user) return null

      return {
        session: mapSession(session),
        user: mapUser(user),
      }
    },

    /**
     * Aggiorna la data di scadenza di una sessione.
     */
    async updateSession(session: any) {
      const { data, error } = await getServiceClient()
        .from(TABLES.SESSIONS)
        .update({
          expires: session.expires.toISOString(),
        })
        .eq('session_token', session.sessionToken)
        .select()
        .single()

      if (error || !data) throw new Error(`Failed to update session: ${error?.message}`)
      return mapSession(data)
    },

    /**
     * Elimina una sessione (es. durante il logout).
     */
    async deleteSession(sessionToken: string) {
      await getServiceClient().from(TABLES.SESSIONS).delete().eq('session_token', sessionToken)
    },

    /**
     * Crea un token di verifica (es. per il reset password).
     */
    async createVerificationToken({ identifier, token, expires }: { identifier: string; token: string; expires: Date }) {
      const { data, error } = await getServiceClient()
        .from(TABLES.VERIFICATION_TOKENS)
        .insert({
          identifier,
          token,
          expires: expires.toISOString(),
        })
        .select()
        .single()

      if (error || !data) throw new Error(`Failed to create verification token: ${error?.message}`)
      return mapVerificationToken(data)
    },

    /**
     * Utilizza e rimuove un token di verifica.
     */
    async useVerificationToken({ identifier, token }: { identifier: string; token: string }) {
      const { data, error } = await getServiceClient()
        .from(TABLES.VERIFICATION_TOKENS)
        .delete()
        .eq('identifier', identifier)
        .eq('token', token)
        .select()
        .single()

      return data ? mapVerificationToken(data) : null
    },
  }
}

/**
 * Funzioni di mapping per convertire i dati grezzi di Supabase nei tipi richiesti da NextAuth.
 */
function mapUser(data: any): AdapterUser {
  return {
    id: data.id,
    name: data.name || null,
    email: data.email,
    emailVerified: null,
    image: data.picture || null,
  }
}

function mapAccount(data: any): AdapterAccount {
  return {
    id: data.id,
    userId: data.user_id,
    type: data.type,
    provider: data.provider,
    providerAccountId: data.provider_account_id,
    refresh_token: data.refresh_token,
    access_token: data.access_token,
    expires_at: data.expires_at,
    token_type: data.token_type,
    scope: data.scope,
    id_token: data.id_token,
    session_state: data.session_state,
  }
}

function mapSession(data: any): AdapterSession {
  return {
    sessionToken: data.session_token,
    userId: data.user_id,
    expires: new Date(data.expires),
  }
}

function mapVerificationToken(data: any): VerificationToken {
  return {
    identifier: data.identifier,
    token: data.token,
    expires: new Date(data.expires),
  }
}
