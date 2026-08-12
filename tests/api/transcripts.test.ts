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

import { GET, POST } from '@/app/api/transcripts/route'
import { DELETE } from '@/app/api/transcripts/[id]/route'

const client = createMockSupabaseClient()

const user = {
  id: 'user-1',
  email: 'test@example.com',
  credits: 10,
  plan: 'free',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const transcript = {
  id: 'tr-1',
  user_id: 'user-1',
  video_id: 'abc123def45',
  title: 'Video di prova',
  channel: 'Canale Test',
  thumbnail: null,
  duration_sec: 120,
  language: 'it',
  is_generated: false,
  transcript: [
    { text: 'Ciao mondo', time: 0, duration: 2 },
    { text: 'Seconda riga', time: 2, duration: 3 },
  ],
  credits_used: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

function authRequest(url: string, init: RequestInit = {}) {
  return new Request(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token',
      ...(init.headers || {}),
    },
  })
}

describe('GET /api/transcripts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAuthenticatedUserMock.mockResolvedValue(user)
    vi.mocked(getServiceClientMock).mockReturnValue(client)
    client.setData('transcripts', [
      { ...transcript, created_at: '2026-01-02T00:00:00.000Z' },
      { ...transcript, id: 'tr-2', video_id: 'zzz999yyy11', created_at: '2026-01-03T00:00:00.000Z' },
    ])
  })

  it('returns 401 when not authenticated', async () => {
    getAuthenticatedUserMock.mockResolvedValue(null)
    const res = await GET(new Request('http://localhost/api/transcripts'))
    expect(res.status).toBe(401)
  })

  it('lists only the transcripts of the authenticated user, newest first', async () => {
    const res = await GET(authRequest('http://localhost/api/transcripts'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(2)
    expect(body[0].video_id).toBe('zzz999yyy11')
    expect(body[1].video_id).toBe('abc123def45')
  })

  it('returns an empty list when the user has no transcripts', async () => {
    client.setData('transcripts', [])
    const res = await GET(authRequest('http://localhost/api/transcripts'))
    const body = await res.json()
    expect(body).toEqual([])
  })
})

describe('POST /api/transcripts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAuthenticatedUserMock.mockResolvedValue(user)
    vi.mocked(getServiceClientMock).mockReturnValue(client)
    client.setData('transcripts', [])
  })

  it('returns 401 when not authenticated', async () => {
    getAuthenticatedUserMock.mockResolvedValue(null)
    const res = await POST(
      new Request('http://localhost/api/transcripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: 'abc', transcript: [] }),
      }),
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 when videoId is missing', async () => {
    const res = await POST(
      authRequest('http://localhost/api/transcripts', {
        method: 'POST',
        body: JSON.stringify({ transcript: [] }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when transcript is not an array', async () => {
    const res = await POST(
      authRequest('http://localhost/api/transcripts', {
        method: 'POST',
        body: JSON.stringify({ videoId: 'abc', transcript: 'not-array' }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it('creates a new transcript owned by the user', async () => {
    const res = await POST(
      authRequest('http://localhost/api/transcripts', {
        method: 'POST',
        body: JSON.stringify({
          videoId: 'abc123def45',
          title: 'Video di prova',
          channel: 'Canale Test',
          transcript: transcript.transcript,
          language: 'it',
        }),
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user_id).toBe('user-1')
    expect(body.video_id).toBe('abc123def45')
    const rows = client.getData('transcripts')
    expect(rows).toHaveLength(1)
    expect(rows[0].user_id).toBe('user-1')
    expect(rows[0].credits_used).toBe(1)
  })

  it('upserts instead of duplicating when the video already exists', async () => {
    client.setData('transcripts', [{ ...transcript }])
    const res = await POST(
      authRequest('http://localhost/api/transcripts', {
        method: 'POST',
        body: JSON.stringify({
          videoId: 'abc123def45',
          title: 'Titolo aggiornato',
          transcript: transcript.transcript,
        }),
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.title).toBe('Titolo aggiornato')
    const rows = client.getData('transcripts')
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toBe('Titolo aggiornato')
  })

  it('uses a default title and 1 credit when not provided', async () => {
    const res = await POST(
      authRequest('http://localhost/api/transcripts', {
        method: 'POST',
        body: JSON.stringify({ videoId: 'abc123def45', transcript: [] }),
      }),
    )
    const body = await res.json()
    expect(body.title).toBe('Video')
    expect(body.credits_used).toBe(1)
  })
})

describe('DELETE /api/transcripts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAuthenticatedUserMock.mockResolvedValue(user)
    vi.mocked(getServiceClientMock).mockReturnValue(client)
    client.setData('transcripts', [
      { ...transcript },
      { ...transcript, id: 'tr-2', video_id: 'zzz999yyy11' },
    ])
  })

  it('returns 401 when not authenticated', async () => {
    getAuthenticatedUserMock.mockResolvedValue(null)
    const res = await DELETE(new Request('http://localhost/api/transcripts/tr-1', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'tr-1' }),
    })
    expect(res.status).toBe(401)
  })

  it('deletes only the transcript belonging to the user', async () => {
    const res = await DELETE(authRequest('http://localhost/api/transcripts/tr-1', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'tr-1' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    const rows = client.getData('transcripts')
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('tr-2')
  })
})
