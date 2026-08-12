import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabaseClient } from '../helpers/supabase-mock'

const { getAuthenticatedUserMock, getServiceClientMock, generateChatCompletionMock } = vi.hoisted(() => ({
  getAuthenticatedUserMock: vi.fn(),
  getServiceClientMock: vi.fn(),
  generateChatCompletionMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ getAuthenticatedUser: getAuthenticatedUserMock }))

vi.mock('@/lib/supabase', () => ({
  getServiceClient: getServiceClientMock,
  getSupabaseClient: vi.fn(),
  TABLES: { USERS: 'users', CHATS: 'chats' },
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: () => ({ success: true }),
  getClientIp: () => '1.2.3.4',
}))

vi.mock('@/lib/ai', () => ({ generateChatCompletion: generateChatCompletionMock }))

import { POST } from '@/app/api/ai/chat/route'

const client = createMockSupabaseClient()
vi.mocked(getServiceClientMock).mockReturnValue(client)

const user = {
  id: 'user-1',
  email: 'test@example.com',
  credits: 5,
  plan: 'free',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

function post(message: string) {
  return POST(
    new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    }),
  )
}

describe('POST /api/ai/chat (credits)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServiceClientMock).mockReturnValue(client)
    getAuthenticatedUserMock.mockResolvedValue({ ...user })
    client.setData('users', [{ ...user }])
    generateChatCompletionMock.mockResolvedValue('Risposta AI')
  })

  it('returns 403 for free users with no credits', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ ...user, credits: 0 })
    const res = await post('Ciao')
    expect(res.status).toBe(403)
    expect(generateChatCompletionMock).not.toHaveBeenCalled()
  })

  it('returns 403 for pro users with no credits (pool model)', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ ...user, credits: 0, plan: 'pro' })
    const res = await post('Ciao')
    expect(res.status).toBe(403)
  })

  it('returns 403 for business users with no credits (pool model)', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ ...user, credits: 0, plan: 'business' })
    const res = await post('Ciao')
    expect(res.status).toBe(403)
  })

  it('returns 401 when not authenticated', async () => {
    getAuthenticatedUserMock.mockResolvedValue(null)
    const res = await post('Ciao')
    expect(res.status).toBe(401)
  })

  it('answers and deducts 1 credit on success', async () => {
    const res = await post('Ciao')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.response).toBe('Risposta AI')
    expect(body.credits).toBe(4)

    const stored = client.getData('users')[0]
    expect(stored.credits).toBe(4)
    expect(client.getFromCalls()).toContain('chats')
  })
})
