import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { mockPostRequest } from './helpers'

const { supabaseState } = vi.hoisted(() => ({ supabaseState: { client: null as any } }))

vi.mock('@/lib/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supabase')>()
  return { ...actual, getServiceClient: () => supabaseState.client }
})

// JWT_SECRET è letto a import-time dalle route: stub prima dell'import dinamico.
vi.stubEnv('JWT_SECRET', 'test-secret-x'.padEnd(32, 'x'))

const { POST: registerPOST } = await import('@/app/api/auth/register/route')
const { POST: loginPOST } = await import('@/app/api/auth/login/route')

const ip = () => `172.16.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`

beforeEach(() => {
  vi.clearAllMocks()
})

function setUsersTable(usersResult: any, insertResult?: any) {
  const selectBuilder = () => {
    const b: any = {}
    b.select = vi.fn(() => b)
    b.eq = vi.fn(() => b)
    b.single = vi.fn(async () => usersResult)
    return b
  }
  const insertBuilder = () => {
    const b: any = {}
    b.insert = vi.fn(() => b)
    b.select = vi.fn(() => b)
    b.single = vi.fn(async () => insertResult ?? { data: null, error: new Error('db') })
    return b
  }
  let mode: 'select' | 'insert' = 'select'
  const from = vi.fn(() => {
    // la prima catena di ogni request è la select di esistenza, la seconda l'insert
    if (mode === 'select') {
      mode = 'insert'
      return selectBuilder()
    }
    return insertBuilder()
  })
  supabaseState.client = { from }
}

describe('POST /api/auth/register', () => {
  it('400 senza email/password', async () => {
    const res = await registerPOST(mockPostRequest({ email: '' }, { 'x-forwarded-for': ip() }))
    expect(res.status).toBe(400)
  })

  it('400 se email già registrata', async () => {
    setUsersTable({ data: { id: 'u1' } })
    const res = await registerPOST(
      mockPostRequest({ email: 'a@b.c', password: 'segreta12', name: 'A' }, { 'x-forwarded-for': ip() }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('USER_EXISTS')
  })

  it('200 crea utente: token valido, password mai esposta, email normalizzata', async () => {
    const created = { id: 'u2', email: 'nuovo@x.it', name: 'Nuovo', credits: 10, plan: 'free', password: 'HASH' }
    setUsersTable({ data: null }, { data: created, error: null })
    const res = await registerPOST(
      mockPostRequest({ email: 'NUOVO@x.it', password: 'segreta12' }, { 'x-forwarded-for': ip() }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.password).toBeUndefined()
    expect(body.user.email).toBe('nuovo@x.it')
    const decoded = jwt.verify(body.token, process.env.JWT_SECRET!) as any
    expect(decoded.userId).toBe('u2')
  })
})

describe('POST /api/auth/login', () => {
  it('401 con utente sconosciuto', async () => {
    setUsersTable({ data: null })
    const res = await loginPOST(
      mockPostRequest({ email: 'ghost@x.it', password: 'qualcosa' }, { 'x-forwarded-for': ip() }),
    )
    expect(res.status).toBe(401)
  })

  it('401 con password errata (hash vero, compare vero)', async () => {
    const hash = await bcrypt.hash('corretta123', 4)
    setUsersTable({ data: { id: 'u1', email: 'a@b.c', password: hash } })
    const res = await loginPOST(
      mockPostRequest({ email: 'a@b.c', password: 'sbagliata' }, { 'x-forwarded-for': ip() }),
    )
    expect(res.status).toBe(401)
  })

  it('401 con account senza password (OAuth-only)', async () => {
    setUsersTable({ data: { id: 'u1', email: 'a@b.c', password: null } })
    const res = await loginPOST(
      mockPostRequest({ email: 'a@b.c', password: 'x' }, { 'x-forwarded-for': ip() }),
    )
    expect(res.status).toBe(401)
  })

  it('200 con credenziali corrette: token firmato e niente password', async () => {
    const hash = await bcrypt.hash('corretta123', 4)
    setUsersTable({ data: { id: 'u1', email: 'a@b.c', name: 'A', credits: 7, plan: 'free', password: hash } })
    const res = await loginPOST(
      mockPostRequest({ email: 'A@B.C', password: 'corretta123' }, { 'x-forwarded-for': ip() }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.password).toBeUndefined()
    expect(body.user.credits).toBe(7)
    const decoded = jwt.verify(body.token, process.env.JWT_SECRET!) as any
    expect(decoded.email).toBe('a@b.c')
  })
})
