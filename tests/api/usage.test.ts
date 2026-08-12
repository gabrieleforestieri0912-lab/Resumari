import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabaseClient } from '../helpers/supabase-mock'

const { getAuthenticatedUserMock, getServiceClientMock } = vi.hoisted(() => ({
  getAuthenticatedUserMock: vi.fn(),
  getServiceClientMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getAuthenticatedUser: getAuthenticatedUserMock,
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
    TRANSCRIPTS: 'transcripts',
  },
}))

import { GET } from '@/app/api/usage/route'

const client = createMockSupabaseClient()

const user = {
  id: 'user-1',
  email: 'test@example.com',
  credits: 10,
  plan: 'free',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

function authRequest(url: string) {
  return new Request(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token',
    },
  })
}

describe('GET /api/usage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAuthenticatedUserMock.mockResolvedValue(user)
    vi.mocked(getServiceClientMock).mockReturnValue(client)
    client.setData('transcripts', [
      {
        id: 'tr-1',
        user_id: 'user-1',
        video_id: 'abc123def45',
        title: 'Primo video',
        channel: 'Canale A',
        credits_used: 1,
        created_at: '2026-01-02T10:00:00.000Z',
      },
      {
        id: 'tr-2',
        user_id: 'user-1',
        video_id: 'zzz999yyy11',
        title: 'Secondo video',
        channel: 'Canale B',
        credits_used: 1,
        created_at: '2026-01-04T09:00:00.000Z',
      },
    ])
    client.setData('chats', [
      {
        id: 'chat-1',
        user_id: 'user-1',
        chat_id: 'ai-123',
        title: 'AI Chat',
        video_id: 'abc123def45',
        created_at: '2026-01-03T15:00:00.000Z',
      },
      {
        id: 'chat-2',
        user_id: 'user-1',
        chat_id: 'ai-456',
        title: 'AI Chat',
        video_id: 'xyz000aaa22',
        created_at: '2026-01-05T12:00:00.000Z',
      },
      // chat without a video — must be excluded
      {
        id: 'chat-3',
        user_id: 'user-1',
        chat_id: 'ai-789',
        title: 'AI Chat senza video',
        video_id: null,
        created_at: '2026-01-06T12:00:00.000Z',
      },
    ])
  })

  it('returns 401 when not authenticated', async () => {
    getAuthenticatedUserMock.mockResolvedValue(null)
    const res = await GET(new Request('http://localhost/api/usage'))
    expect(res.status).toBe(401)
  })

  it('merges transcripts and video chats into a chronological feed', async () => {
    const res = await GET(authRequest('http://localhost/api/usage'))
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.events).toHaveLength(4)
    // newest first
    expect(body.events[0].type).toBe('chat')
    expect(body.events[0].videoId).toBe('xyz000aaa22')
    expect(body.events[3].type).toBe('transcript')
    expect(body.events[3].videoId).toBe('abc123def45')
  })

  it('computes totals across both sources', async () => {
    const res = await GET(authRequest('http://localhost/api/usage'))
    const body = await res.json()

    expect(body.totals.events).toBe(4)
    expect(body.totals.transcripts).toBe(2)
    expect(body.totals.chats).toBe(2)
    expect(body.totals.videos).toBe(3)
    // 2 transcripts × 1 credit + 2 chats × 1 credit
    expect(body.totals.creditsUsed).toBe(4)
  })

  it('returns empty totals when there is no activity', async () => {
    client.setData('transcripts', [])
    client.setData('chats', [])
    const res = await GET(authRequest('http://localhost/api/usage'))
    const body = await res.json()
    expect(body.events).toEqual([])
    expect(body.totals).toEqual({
      events: 0,
      transcripts: 0,
      chats: 0,
      videos: 0,
      creditsUsed: 0,
    })
  })
})
