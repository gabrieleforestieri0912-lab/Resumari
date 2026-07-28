import { getServiceClient, TABLES } from '@/lib/supabase'
import type { User, Chat, VerificationCode, ContactMessage, ApiKey } from '@/lib/types'

// Helper functions to replace MongoDB queries with Supabase

export async function getDb() {
  return getServiceClient()
}

// Users
export async function findUserByEmail(email: string) {
  const { data } = await getServiceClient()
    .from(TABLES.USERS)
    .select()
    .eq('email', email.toLowerCase())
    .single()
  return data as User | null
}

export async function findUserById(id: string) {
  const { data } = await getServiceClient()
    .from(TABLES.USERS)
    .select()
    .eq('id', id)
    .single()
  return data as User | null
}

export async function createUser(userData: Partial<User>) {
  const { data, error } = await getServiceClient()
    .from(TABLES.USERS)
    .insert({ ...userData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data as User
}

export async function updateUser(id: string, updates: Partial<User>) {
  const { data, error } = await getServiceClient()
    .from(TABLES.USERS)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as User
}

export async function deleteUser(id: string) {
  await getServiceClient().from(TABLES.USERS).delete().eq('id', id)
}

export async function incrementCredits(id: string, amount: number) {
  const user = await findUserById(id)
  if (!user) throw new Error('User not found')
  const newCredits = (user.credits || 0) + amount
  return updateUser(id, { credits: Math.max(0, newCredits) })
}

export async function countUsers() {
  const { count } = await getServiceClient()
    .from(TABLES.USERS)
    .select('*', { count: 'exact', head: true })
  return count || 0
}

// Chats
export async function findChatsByUserId(userId: string) {
  const { data } = await getServiceClient()
    .from(TABLES.CHATS)
    .select()
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  return data as Chat[]
}

export async function findChatByUserIdAndChatId(userId: string, chatId: string) {
  const { data } = await getServiceClient()
    .from(TABLES.CHATS)
    .select()
    .eq('user_id', userId)
    .eq('chat_id', chatId)
    .single()
  return data as Chat | null
}

export async function createChat(chatData: Partial<Chat>) {
  const { data, error } = await getServiceClient()
    .from(TABLES.CHATS)
    .insert({
      ...chatData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw error
  return data as Chat
}

export async function updateChat(id: string, updates: Partial<Chat>) {
  const { data, error } = await getServiceClient()
    .from(TABLES.CHATS)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Chat
}

export async function deleteChatByUserIdAndChatId(userId: string, chatId: string) {
  await getServiceClient()
    .from(TABLES.CHATS)
    .delete()
    .eq('user_id', userId)
    .eq('chat_id', chatId)
}

export async function countChats() {
  const { count } = await getServiceClient()
    .from(TABLES.CHATS)
    .select('*', { count: 'exact', head: true })
  return count || 0
}

// Verification Codes
export async function findVerificationCode(email: string, code: string) {
  const { data } = await getServiceClient()
    .from(TABLES.VERIFICATION_CODES)
    .select()
    .eq('email', email.toLowerCase())
    .eq('code', code)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .single()
  return data as VerificationCode | null
}

export async function upsertVerificationCode(email: string, code: string, expiresAt: Date) {
  const existing = await getServiceClient()
    .from(TABLES.VERIFICATION_CODES)
    .select()
    .eq('email', email.toLowerCase())
    .single()

  if (existing.data) {
    const { error } = await getServiceClient()
      .from(TABLES.VERIFICATION_CODES)
      .update({
        code,
        expires_at: expiresAt.toISOString(),
        used: false,
        created_at: new Date().toISOString(),
      })
      .eq('email', email.toLowerCase())
    if (error) throw error
  } else {
    const { error } = await getServiceClient()
      .from(TABLES.VERIFICATION_CODES)
      .insert({
        email: email.toLowerCase(),
        code,
        expires_at: expiresAt.toISOString(),
        used: false,
        created_at: new Date().toISOString(),
      })
    if (error) throw error
  }
}

export async function markCodeAsUsed(id: string) {
  await getServiceClient()
    .from(TABLES.VERIFICATION_CODES)
    .update({ used: true })
    .eq('id', id)
}

// API Keys
export async function findApiKeyByKeyHash(keyHash: string) {
  const { data } = await getServiceClient()
    .from(TABLES.API_KEYS)
    .select()
    .eq('key_hash', keyHash)
    .eq('revoked', false)
    .single()
  return data as ApiKey | null
}

export async function findApiKeysByUserId(userId: string) {
  const { data } = await getServiceClient()
    .from(TABLES.API_KEYS)
    .select()
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data || []) as ApiKey[]
}

export async function createApiKey(keyData: Partial<ApiKey>) {
  const { data, error } = await getServiceClient()
    .from(TABLES.API_KEYS)
    .insert({ ...keyData, created_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data as ApiKey
}

export async function revokeApiKey(id: string) {
  const { data, error } = await getServiceClient()
    .from(TABLES.API_KEYS)
    .update({ revoked: true })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as ApiKey
}

export async function touchApiKey(id: string) {
  await getServiceClient()
    .from(TABLES.API_KEYS)
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', id)
}

// Messages (contact form)
export async function createMessage(messageData: Partial<ContactMessage>) {
  const { error } = await getServiceClient()
    .from(TABLES.MESSAGES)
    .insert({
      ...messageData,
      created_at: new Date().toISOString(),
    })
  if (error) throw error
}

// Stats
export async function countVideos() {
  const { count } = await getServiceClient()
    .from(TABLES.CHATS)
    .select('*', { count: 'exact', head: true })
    .not('video_id', 'is', null)
  return count || 0
}
