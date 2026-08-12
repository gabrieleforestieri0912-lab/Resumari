import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabaseClient } from '../helpers/supabase-mock'

const { getServiceClientMock } = vi.hoisted(() => ({
  getServiceClientMock: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  getServiceClient: getServiceClientMock,
  getSupabaseClient: vi.fn(),
  TABLES: {
    USERS: 'users',
    CHATS: 'chats',
    VERIFICATION_CODES: 'verification_codes',
    MESSAGES: 'messages',
    ACCOUNTS: 'nextauth_accounts',
    SESSIONS: 'nextauth_sessions',
    VERIFICATION_TOKENS: 'nextauth_verification_tokens',
    API_KEYS: 'api_keys',
  },
}))

import {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  deleteUser,
  incrementCredits,
  countUsers,
  findChatsByUserId,
  findChatByUserIdAndChatId,
  createChat,
  updateChat,
  deleteChatByUserIdAndChatId,
  countChats,
  findVerificationCode,
  upsertVerificationCode,
  markCodeAsUsed,
  findApiKeyByKeyHash,
  findApiKeysByUserId,
  createApiKey,
  revokeApiKey,
  touchApiKey,
  createMessage,
  countVideos,
} from '@/lib/db'

const client = createMockSupabaseClient()

const user = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test',
  credits: 10,
  plan: 'free',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const chat = {
  id: 'chat-1',
  user_id: 'user-1',
  chat_id: 'chat-abc',
  title: 'Conversazione',
  messages: [],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

beforeEach(() => {
  vi.mocked(getServiceClientMock).mockReturnValue(client)
})

describe('db users', () => {
  beforeEach(() => {
    client.setData('users', [{ ...user }])
  })

  it('finds a user by email (lowercased)', async () => {
    const found = await findUserByEmail('TEST@Example.com')
    expect(found).not.toBeNull()
    expect(found!.email).toBe('test@example.com')
  })

  it('returns null when email does not exist', async () => {
    expect(await findUserByEmail('nobody@example.com')).toBeNull()
  })

  it('finds a user by id', async () => {
    const found = await findUserById('user-1')
    expect(found!.id).toBe('user-1')
  })

  it('creates a user with timestamps', async () => {
    const created = await createUser({ email: 'new@example.com', credits: 0, plan: 'free' })
    expect(created.email).toBe('new@example.com')
    expect(created.created_at).toBeTypeOf('string')
    expect(created.updated_at).toBeTypeOf('string')
  })

  it('updates a user', async () => {
    const updated = await updateUser('user-1', { credits: 42 })
    expect(updated.credits).toBe(42)
    expect(updated.updated_at).toBeTypeOf('string')
  })

  it('deletes a user', async () => {
    await deleteUser('user-1')
    expect(client.getData('users')).toHaveLength(0)
  })

  it('increments credits without going below zero', async () => {
    const incremented = await incrementCredits('user-1', 5)
    expect(incremented.credits).toBe(15)
    const floored = await incrementCredits('user-1', -100)
    expect(floored.credits).toBe(0)
  })

  it('counts users', async () => {
    client.setData('users', [{ ...user }, { ...user, id: 'user-2' }])
    expect(await countUsers()).toBe(2)
  })
})

describe('db chats', () => {
  beforeEach(() => {
    client.setData('chats', [
      { ...chat, updated_at: '2026-01-02T00:00:00.000Z' },
      { ...chat, id: 'chat-2', chat_id: 'chat-xyz', updated_at: '2026-01-03T00:00:00.000Z' },
    ])
  })

  it('lists chats for a user ordered by updated_at desc', async () => {
    const chats = await findChatsByUserId('user-1')
    expect(chats).toHaveLength(2)
    expect(chats[0].chat_id).toBe('chat-xyz')
    expect(chats[1].chat_id).toBe('chat-abc')
  })

  it('finds a chat by user and chat id', async () => {
    const found = await findChatByUserIdAndChatId('user-1', 'chat-abc')
    expect(found).not.toBeNull()
    expect(found!.chat_id).toBe('chat-abc')
  })

  it('creates a chat', async () => {
    const created = await createChat({ user_id: 'user-1', chat_id: 'chat-new', title: 'New', messages: [] })
    expect(created.chat_id).toBe('chat-new')
    expect(created.created_at).toBeTypeOf('string')
  })

  it('updates a chat', async () => {
    const updated = await updateChat('chat-1', { title: 'Renamed' })
    expect(updated.title).toBe('Renamed')
  })

  it('deletes a chat for a user', async () => {
    await deleteChatByUserIdAndChatId('user-1', 'chat-abc')
    const chats = await findChatsByUserId('user-1')
    expect(chats).toHaveLength(1)
  })

  it('counts chats', async () => {
    expect(await countChats()).toBe(2)
  })

  it('counts videos (chats with video_id)', async () => {
    client.setData('chats', [
      { ...chat, video_id: 'vid1' },
      { ...chat, id: 'chat-2', chat_id: 'chat-xyz' },
    ])
    expect(await countVideos()).toBe(1)
  })
})

describe('db verification codes', () => {
  beforeEach(() => {
    client.setData('verification_codes', [
      {
        id: 'vc-1',
        email: 'test@example.com',
        code: '123456',
        expires_at: new Date(Date.now() + 600000).toISOString(),
        used: false,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ])
  })

  it('finds a valid unused code', async () => {
    const found = await findVerificationCode('test@example.com', '123456')
    expect(found).not.toBeNull()
    expect(found!.code).toBe('123456')
  })

  it('returns null for a wrong code', async () => {
    expect(await findVerificationCode('test@example.com', '000000')).toBeNull()
  })

  it('upserts a new code', async () => {
    await upsertVerificationCode('other@example.com', '654321', new Date(Date.now() + 600000))
    const rows = client.getData('verification_codes')
    expect(rows).toHaveLength(2)
  })

  it('updates an existing code on re-send', async () => {
    await upsertVerificationCode('test@example.com', '999999', new Date(Date.now() + 600000))
    const rows = client.getData('verification_codes')
    expect(rows).toHaveLength(1)
    expect(rows[0].code).toBe('999999')
    expect(rows[0].used).toBe(false)
  })

  it('marks a code as used', async () => {
    await markCodeAsUsed('vc-1')
    const rows = client.getData('verification_codes')
    expect(rows[0].used).toBe(true)
  })
})

describe('db api keys', () => {
  const apiKey = {
    id: 'key-1',
    user_id: 'user-1',
    name: 'Test key',
    key_prefix: 'rsm_live_ab12...',
    key_hash: 'abc123',
    created_at: '2026-01-01T00:00:00.000Z',
    last_used_at: null,
    revoked: false,
  }

  beforeEach(() => {
    client.setData('api_keys', [{ ...apiKey }])
  })

  it('finds a non-revoked key by hash', async () => {
    const found = await findApiKeyByKeyHash('abc123')
    expect(found).not.toBeNull()
    expect(found!.id).toBe('key-1')
  })

  it('does not find revoked keys', async () => {
    client.setData('api_keys', [{ ...apiKey, revoked: true }])
    expect(await findApiKeyByKeyHash('abc123')).toBeNull()
  })

  it('lists keys for a user', async () => {
    const keys = await findApiKeysByUserId('user-1')
    expect(keys).toHaveLength(1)
  })

  it('creates an api key', async () => {
    const created = await createApiKey({ user_id: 'user-1', name: 'New', key_prefix: 'rsm_live_ff...', key_hash: 'def456' })
    expect(created.name).toBe('New')
    expect(created.created_at).toBeTypeOf('string')
  })

  it('revokes an api key', async () => {
    const revoked = await revokeApiKey('key-1')
    expect(revoked.revoked).toBe(true)
  })

  it('touches an api key to record usage', async () => {
    await touchApiKey('key-1')
    expect(client.getData('api_keys')[0].last_used_at).toBeTypeOf('string')
  })
})

describe('db messages', () => {
  it('creates a contact message', async () => {
    await createMessage({ nome: 'Pinco', email: 'pinco@example.com', messaggio: 'Ciao' })
    const rows = client.getData('messages')
    expect(rows).toHaveLength(1)
    expect(rows[0].email).toBe('pinco@example.com')
    expect(rows[0].created_at).toBeTypeOf('string')
  })
})
