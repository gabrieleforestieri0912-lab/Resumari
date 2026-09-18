import { getServiceClient, TABLES } from '@/lib/supabase'
import type { User, Chat, VerificationCode, ContactMessage, ApiKey } from '@/lib/types'

/**
 * Funzioni helper per l'interazione con il database Supabase.
 * Questo modulo funge da livello di astrazione (DAO) per centralizzare le query
 * e facilitare la manutenzione del database.
 */

/**
 * Restituisce il client di servizio di Supabase per l'esecuzione di query lato server.
 */
export async function getDb() {
  return getServiceClient()
}

// --- Gestione Utenti ---

/**
 * Cerca un utente nel database tramite l'indirizzo email.
 */
export async function findUserByEmail(email: string) {
  const { data } = await getServiceClient()
    .from(TABLES.USERS)
    .select()
    .eq('email', email.toLowerCase())
    .single()
  return data as User | null
}

/**
 * Recupera i dettagli di un utente tramite il suo ID univoco.
 */
export async function findUserById(id: string) {
  const { data } = await getServiceClient()
    .from(TABLES.USERS)
    .select()
    .eq('id', id)
    .single()
  return data as User | null
}

/**
 * Crea un nuovo profilo utente nel database.
 */
export async function createUser(userData: Partial<User>) {
  const { data, error } = await getServiceClient()
    .from(TABLES.USERS)
    .insert({ ...userData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data as User
}

/**
 * Aggiorna i dati di un utente esistente.
 */
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

/**
 * Elimina definitivamente un utente dal sistema.
 */
export async function deleteUser(id: string) {
  await getServiceClient().from(TABLES.USERS).delete().eq('id', id)
}

/**
 * Incrementa o decrementa il saldo crediti di un utente.
 * Assicura che il saldo non diventi mai negativo.
 */
export async function incrementCredits(id: string, amount: number) {
  const user = await findUserById(id)
  if (!user) throw new Error('User not found')
  const newCredits = (user.credits || 0) + amount
  return updateUser(id, { credits: Math.max(0, newCredits) })
}

/**
 * Restituisce il numero totale di utenti registrati.
 */
export async function countUsers() {
  const { count } = await getServiceClient()
    .from(TABLES.USERS)
    .select('*', { count: 'exact', head: true })
  return count || 0
}

// --- Gestione Chat ---

/**
 * Recupera tutte le conversazioni associate a un determinato utente, ordinate per data di aggiornamento.
 */
export async function findChatsByUserId(userId: string) {
  const { data } = await getServiceClient()
    .from(TABLES.CHATS)
    .select()
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  return data as Chat[]
}

/**
 * Recupera una specifica chat verificando l'appartenenza all'utente.
 */
export async function findChatByUserIdAndChatId(userId: string, chatId: string) {
  const { data } = await getServiceClient()
    .from(TABLES.CHATS)
    .select()
    .eq('user_id', userId)
    .eq('chat_id', chatId)
    .single()
  return data as Chat | null
}

/**
 * Crea una nuova sessione di chat nel database.
 */
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

/**
 * Aggiorna i metadati di una chat (es. titolo o data di aggiornamento).
 */
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

/**
 * Elimina una chat specifica per un determinato utente.
 */
export async function deleteChatByUserIdAndChatId(userId: string, chatId: string) {
  await getServiceClient()
    .from(TABLES.CHATS)
    .delete()
    .eq('user_id', userId)
    .eq('chat_id', chatId)
}

/**
 * Restituisce il numero totale di chat presenti nel sistema.
 */
export async function countChats() {
  const { count } = await getServiceClient()
    .from(TABLES.CHATS)
    .select('*', { count: 'exact', head: true })
  return count || 0
}

// --- Codici di Verifica ---

/**
 * Verifica se esiste un codice di validazione valido per un'email specifica.
 * Il codice deve essere inutilizzato e non scaduto.
 */
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

/**
 * Crea un nuovo codice di verifica o aggiorna uno esistente per un'email.
 */
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

/**
 * Segna un codice di verifica come utilizzato per impedirne l'uso ripetuto.
 */
export async function markCodeAsUsed(id: string) {
  await getServiceClient()
    .from(TABLES.VERIFICATION_CODES)
    .update({ used: true })
    .eq('id', id)
}

// --- API Keys ---

/**
 * Cerca una chiave API valida tramite il suo hash.
 */
export async function findApiKeyByKeyHash(keyHash: string) {
  const { data } = await getServiceClient()
    .from(TABLES.API_KEYS)
    .select()
    .eq('key_hash', keyHash)
    .eq('revoked', false)
    .single()
  return data as ApiKey | null
}

/**
 * Recupera tutte le chiavi API associate a un utente.
 */
export async function findApiKeysByUserId(userId: string) {
  const { data } = await getServiceClient()
    .from(TABLES.API_KEYS)
    .select()
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data || []) as ApiKey[]
}

/**
 * Genera e salva una nuova chiave API per l'utente.
 */
export async function createApiKey(keyData: Partial<ApiKey>) {
  const { data, error } = await getServiceClient()
    .from(TABLES.API_KEYS)
    .insert({ ...keyData, created_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data as ApiKey
}

/**
 * Revoca una chiave API, rendendola inutilizzabile.
 */
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

/**
 * Aggiorna la data dell'ultimo utilizzo di una chiave API.
 */
export async function touchApiKey(id: string) {
  await getServiceClient()
    .from(TABLES.API_KEYS)
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', id)
}

// --- Messaggi Contatto ---

/**
 * Salva un messaggio inviato tramite il modulo di contatto.
 */
export async function createMessage(messageData: Partial<ContactMessage>) {
  const { error } = await getServiceClient()
    .from(TABLES.MESSAGES)
    .insert({
      ...messageData,
      created_at: new Date().toISOString(),
    })
  if (error) throw error
}

// --- Statistiche ---

/**
 * Restituisce il numero di video unici presenti nelle chat.
 */
export async function countVideos() {
  const { count } = await getServiceClient()
    .from(TABLES.CHATS)
    .select('*', { count: 'exact', head: true })
    .not('video_id', 'is', null)
  return count || 0
}
