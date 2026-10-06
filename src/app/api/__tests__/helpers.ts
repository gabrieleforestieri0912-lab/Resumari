import { vi } from 'vitest'

/**
 * Builder Supabase concatenabile che risolve `result` sia con `.single()` /
 * `.maybeSingle()` sia con await diretto della catena. I metodi registrano
 * le chiamate per permettere asserzioni sui filtri applicati.
 */
export function mockTable(result: any = { data: null }) {
  const calls: Record<string, any[][]> = {}
  const builder: any = { __calls: calls }
  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gte', 'lte', 'lt', 'gt', 'match', 'or',
    'order', 'limit', 'head', 'is', 'in',
  ]
  for (const m of chainMethods) {
    calls[m] = []
    builder[m] = vi.fn((...args: any[]) => {
      calls[m].push(args)
      return builder
    })
  }
  builder.single = vi.fn(async () => result)
  builder.maybeSingle = vi.fn(async () => result)
  builder.then = (res: any, rej: any) => Promise.resolve(result).then(res, rej)
  return builder
}

/** Client fake: `from` instradato per tabella con fallback configurabile. */
export function mockClient(tables: Record<string, any> = {}, fallbackResult: any = { data: null }) {
  const builders: Record<string, any> = {}
  const from = vi.fn((table: string) => {
    if (!builders[table]) builders[table] = mockTable(tables[table] ?? fallbackResult)
    return builders[table]
  })
  return { client: { from }, builders, from }
}

export function mockPostRequest(body: unknown, headers: Record<string, string> = {}) {
  const h = new Headers({ 'content-type': 'application/json', ...headers })
  return new Request('http://localhost/api/test', { method: 'POST', headers: h, body: JSON.stringify(body) })
}

export function mockGetRequest(headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/test', { method: 'GET', headers: new Headers(headers) })
}
