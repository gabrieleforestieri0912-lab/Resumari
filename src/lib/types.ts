/**
 * Definizioni dei tipi di dato per l'integrazione con Supabase e l'intera applicazione.
 */

/**
 * Rappresenta un utente registrato nel sistema.
 */
export type User = {
  id: string
  email: string
  password?: string | null
  name?: string | null
  picture?: string | null
  provider?: string | null
  credits: number
  plan: string
  locale?: string | null
  stripe_subscription_id?: string | null
  reset_token?: string | null
  reset_token_expiry?: number | null
  created_at: string
  updated_at: string
}

/**
 * Rappresenta una sessione di chat tra l'utente e l'AI.
 */
export type Chat = {
  id: string
  user_id: string
  chat_id: string
  title: string
  messages: ChatMessage[]
  video_id?: string | null
  created_at: string
  updated_at: string
}

/**
 * Rappresenta un singolo messaggio all'interno di una chat.
 */
export type ChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
  videoId?: string
}

/**
 * Rappresenta una chiave API generata dall'utente per l'accesso programmatico.
 */
export type ApiKey = {
  id: string
  user_id: string
  name: string
  key_prefix: string
  key_hash: string
  created_at: string
  last_used_at: string | null
  revoked: boolean
}

/**
 * Rappresenta un segmento di trascrizione di un video (testo e timestamp).
 */
export type TranscriptSegment = {
  text: string
  time?: number
  start?: number
  duration?: number
}

/**
 * Rappresenta l'intera trascrizione di un video salvata nel database.
 */
export type Transcript = {
  id: string
  user_id: string
  video_id: string
  title: string
  channel?: string | null
  thumbnail?: string | null
  duration_sec?: number
  language?: string | null
  is_generated?: boolean
  transcript: TranscriptSegment[]
  credits_used?: number
  created_at: string
  updated_at: string
}

/**
 * Rappresenta un codice di verifica temporaneo (es. per l'email).
 */
export type VerificationCode = {
  id: string
  email: string
  code: string
  expires_at: string
  used: boolean
  created_at: string
}

/**
 * Rappresenta un messaggio inviato tramite il modulo di contatto.
 */
export type ContactMessage = {
  id: string
  nome: string
  email: string
  messaggio: string
  created_at: string
}

/**
 * Mappatura dei nomi delle tabelle di Supabase per evitare hard-coding in tutto il progetto.
 */
export const TABLES = {
  USERS: 'users',
  CHATS: 'chats',
  VERIFICATION_CODES: 'verification_codes',
  MESSAGES: 'messages',
  ACCOUNTS: 'nextauth_accounts',
  SESSIONS: 'nextauth_sessions',
  VERIFICATION_TOKENS: 'nextauth_verification_tokens',
  API_KEYS: 'api_keys',
  TRANSCRIPTS: 'transcripts',
} as const

/**
 * Tipi di compatibilità per supportare il codice legacy basato su MongoDB
 * che si aspetta i campi _id e id.
 */
export type UserWithMongoCompat = User & { _id: string; id: string }
export type ChatWithMongoCompat = Chat & { _id: string }
