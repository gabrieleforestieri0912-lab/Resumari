// Database types for Supabase

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

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
  videoId?: string
}

export type VerificationCode = {
  id: string
  email: string
  code: string
  expires_at: string
  used: boolean
  created_at: string
}

export type ContactMessage = {
  id: string
  nome: string
  email: string
  messaggio: string
  created_at: string
}

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

// Supabase table names
export const TABLES = {
  USERS: 'users',
  CHATS: 'chats',
  VERIFICATION_CODES: 'verification_codes',
  MESSAGES: 'messages',
  ACCOUNTS: 'nextauth_accounts',
  SESSIONS: 'nextauth_sessions',
  VERIFICATION_TOKENS: 'nextauth_verification_tokens',
  API_KEYS: 'api_keys',
} as const

// For backward compatibility with existing MongoDB-based code
// that expects _id and id fields
export type UserWithMongoCompat = User & { _id: string; id: string }
export type ChatWithMongoCompat = Chat & { _id: string }
