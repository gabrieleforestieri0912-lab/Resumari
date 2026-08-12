import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'
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

import { GET, POST } from '@/app/api/chats/route'
import { DELETE } from '@/app/api/chats/[id]/route'

const client = createMockSupabaseClient()

const secret = 'test-jwt-secret'
const token = jwt.sign({ userId: 'user-1' }, secret, { expiresIn: '7d' })

function authRequest(url: string, init: RequestInit = {}) {
  return new Request(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  })
}

const baseChat = {
  id: 'chat-1',
  user_id: 'user-1',
  chat_id: 'chat-abc',
  title: 'Conversazione',
  messages: [],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
}

describe('GET /api/chats', () => {
  beforeEach(() => {
    vi.mocked(getServiceClientMock).mockReturnValue(client)
    client.setData('chats', [
      { ...baseChat, updated_at: '2026-01-02T00:00:00.000Z' },
      { ...baseChat, id: 'chat-2', chat_id: 'chat-xyz', updated_at: '2026-01-03T00:00:00.000Z' },
    ])
  })

  it('returns 401 without a bearer token', async () => {
    const res = await GET(new Request('http://localhost/api/chats'))
    expect(res.status).toBe(401)
  })

  it('returns 401 with an invalid token', async () => {
    const res = await GET(
      new Request('http://localhost/api/chats', { headers: { Authorization: 'Bearer invalid.token.here' } }),
    )
    expect(res.status).toBe(401)
  })

  it('returns only the chats belonging to the authenticated user', async () => {
    const res = await GET(authRequest('http://localhost/api/chats'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(2)
    expect(body[0].chat_id).toBe('chat-xyz')
  })
})

describe('POST /api/chats', () => {
  beforeEach(() => {
    vi.mocked(getServiceClientMock).mockReturnValue(client)
    client.setData('chats', [])
  })

  it('returns 401 without a bearer token', async () => {
    const res = await POST(
      new Request('http://localhost/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: 'x', title: 'T', messages: [] }),
      }),
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 when chatId is missing', async () => {
    const res = await POST(
      authRequest('http://localhost/api/chats', {
        method: 'POST',
        body: JSON.stringify({ title: 'T', messages: [] }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it('creates a new chat when it does not exist', async () => {
    const res = await POST(
      authRequest('http://localhost/api/chats', {
        method: 'POST',
        body: JSON.stringify({ chatId: 'chat-new', title: 'Nuova', messages: [{ role: 'user', content: 'ciao' }] }),
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(client.getData('chats')).toHaveLength(1)
    expect(client.getData('chats')[0].title).toBe('Nuova')
  })

  it('upserts an existing chat instead of duplicating', async () => {
    client.setData('chats', [{ ...baseChat }])
    const res = await POST(
      authRequest('http://localhost/api/chats', {
        method: 'POST',
        body: JSON.stringify({ chatId: 'chat-abc', title: 'Aggiornata', messages: [] }),
      }),
    )
    expect(res.status).toBe(200)
    const rows = client.getData('chats')
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toBe('Aggiornata')
  })

  it('uses a default title when none is provided', async () => {
    await POST(
      authRequest('http://localhost/api/chats', {
        method: 'POST',
        body: JSON.stringify({ chatId: 'chat-new', messages: [] }),
      }),
    )
    expect(client.getData('chats')[0].title).toBe('Nuova Conversazione')
  })
})

describe('DELETE /api/chats/[id]', () => {
  beforeEach(() => {
    vi.mocked(getServiceClientMock).mockReturnValue(client)
    client.setData('chats', [
      { ...baseChat },
      { ...baseChat, id: 'chat-2', chat_id: 'chat-keep' },
    ])
  })

  it('returns 401 without a bearer token', async () => {
    const res = await DELETE(new Request('http://localhost/api/chats/chat-abc', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'chat-abc' }),
    })
    expect(res.status).toBe(401)
  })

  it('deletes the chat belonging to the user', async () => {
    const res = await DELETE(authRequest('http://localhost/api/chats/chat-abc', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'chat-abc' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(client.getData('chats')).toHaveLength(1)
    expect(client.getData('chats')[0].chat_id).toBe('chat-keep')
  })
})
