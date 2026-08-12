import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabaseClient } from '../helpers/supabase-mock'

const { getAuthenticatedUserMock, getServiceClientMock, transcribeAudioMock } = vi.hoisted(() => ({
  getAuthenticatedUserMock: vi.fn(),
  getServiceClientMock: vi.fn(),
  transcribeAudioMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ getAuthenticatedUser: getAuthenticatedUserMock }))

vi.mock('@/lib/supabase', () => ({
  getServiceClient: getServiceClientMock,
  getSupabaseClient: vi.fn(),
  TABLES: { USERS: 'users' },
}))

vi.mock('@/lib/ai', () => ({ transcribeAudio: transcribeAudioMock }))

import { POST } from '@/app/api/video/transcribe/route'

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

function postForm() {
  const form = new FormData()
  form.append('file', new Blob(['audio'], { type: 'audio/mp3' }), 'audio.mp3')
  return POST(
    new Request('http://localhost/api/video/transcribe', {
      method: 'POST',
      body: form,
    }),
  )
}

describe('POST /api/video/transcribe (credits)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServiceClientMock).mockReturnValue(client)
    getAuthenticatedUserMock.mockResolvedValue({ ...user })
    client.setData('users', [{ ...user }])
    transcribeAudioMock.mockResolvedValue({ text: 'Testo trascritto', language: 'it' })
  })

  it('returns 403 for free users with no credits', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ ...user, credits: 0 })
    const res = await postForm()
    expect(res.status).toBe(403)
    expect(transcribeAudioMock).not.toHaveBeenCalled()
  })

  it('returns 403 for pro users with no credits (pool model)', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ ...user, credits: 0, plan: 'pro' })
    const res = await postForm()
    expect(res.status).toBe(403)
  })

  it('returns 403 for business users with no credits (pool model)', async () => {
    getAuthenticatedUserMock.mockResolvedValue({ ...user, credits: 0, plan: 'business' })
    const res = await postForm()
    expect(res.status).toBe(403)
  })

  it('returns 401 when not authenticated', async () => {
    getAuthenticatedUserMock.mockResolvedValue(null)
    const res = await postForm()
    expect(res.status).toBe(401)
  })

  it('transcribes and deducts 1 credit on success', async () => {
    const res = await postForm()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.text).toBe('Testo trascritto')
    expect(body.language).toBe('it')
    expect(body.credits).toBe(4)
    expect(client.getData('users')[0].credits).toBe(4)
  })
})
