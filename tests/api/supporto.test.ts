import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabaseClient } from '../helpers/supabase-mock'

const { getServiceClientMock } = vi.hoisted(() => ({
  getServiceClientMock: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  getServiceClient: getServiceClientMock,
  getSupabaseClient: vi.fn(),
  TABLES: { MESSAGES: 'messages' },
}))

import { POST } from '@/app/api/supporto/route'

const client = createMockSupabaseClient()

describe('POST /api/supporto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServiceClientMock).mockReturnValue(client)
  })

  it('returns 400 when fields are missing', async () => {
    const res = await POST(
      new Request('http://localhost/api/supporto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'Pinco', email: 'pinco@example.com' }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 for an invalid email', async () => {
    const res = await POST(
      new Request('http://localhost/api/supporto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'Pinco', email: 'not-an-email', messaggio: 'Ciao' }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it('stores the message and returns success', async () => {
    const res = await POST(
      new Request('http://localhost/api/supporto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'Pinco', email: 'Pinco@Example.com', messaggio: 'Ciao resumari' }),
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    const rows = client.getData('messages')
    expect(rows).toHaveLength(1)
    expect(rows[0].nome).toBe('Pinco')
    expect(rows[0].email).toBe('pinco@example.com')
    expect(rows[0].messaggio).toBe('Ciao resumari')
    expect(rows[0].created_at).toBeTypeOf('string')
  })
})
