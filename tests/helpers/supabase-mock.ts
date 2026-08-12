type Row = Record<string, any>
type Op = 'eq' | 'gt' | 'not.is' | 'is'

type Filter = { col: string; op: Op; val: any }

type ResolveResult = {
  data?: Row | Row[] | null
  count?: number | null
  error?: { message: string } | null
}

const defaultFields = () => ({ id: 'auto-id', created_at: new Date().toISOString(), updated_at: new Date().toISOString() })

export class MockSupabaseClient {
  private tables = new Map<string, Row[]>()
  private fromCalls: string[] = []
  private operations: Array<{ table: string; op: string; data?: any }> = []

  setData(table: string, rows: Row[]) {
    this.tables.set(table, [...rows])
  }

  pushRow(table: string, row: Row) {
    const current = this.tables.get(table) || []
    current.push(row)
    this.tables.set(table, current)
  }

  getData(table: string): Row[] {
    return this.tables.get(table) || []
  }

  getFromCalls(): string[] {
    return this.fromCalls
  }

  getOperations(): Array<{ table: string; op: string; data?: any }> {
    return this.operations
  }

  clearOps() {
    this.fromCalls = []
    this.operations = []
  }

  from(table: string) {
    this.fromCalls.push(table)
    const filters: Filter[] = []
    let pendingInsert: Row | null = null
    let pendingUpdate: Row | null = null
    let pendingDelete = false
    let countQuery: { exact: boolean; head: boolean } | null = null
    let orderCol: string | null = null
    let orderAscending = true
    let hasSingle = false
    let hasSelect = false

    const applyFilters = (rows: Row[]) =>
      rows.filter((r) =>
        filters.every((f) => {
          if (f.op === 'eq') return r[f.col] === f.val
          if (f.op === 'gt') return r[f.col] > f.val
          if (f.op === 'not.is') return r[f.col] != null
          if (f.op === 'is') return r[f.col] === f.val
          return true
        }),
      )

    const sorted = (rows: Row[]) => {
      if (!orderCol) return rows
      return [...rows].sort((a, b) => {
        const av = a[orderCol!]
        const bv = b[orderCol!]
        if (av == null) return 1
        if (bv == null) return -1
        const cmp = av < bv ? -1 : av > bv ? 1 : 0
        return orderAscending ? cmp : -cmp
      })
    }

    const resolve = (): ResolveResult => {
      if (countQuery) {
        const n = applyFilters(this.getData(table)).length
        return { count: n }
      }
      if (pendingInsert) {
        const row = { ...defaultFields(), ...pendingInsert }
        this.pushRow(table, row)
        this.operations.push({ table, op: 'insert', data: pendingInsert })
        return hasSingle ? { data: row, error: null } : { data: row, error: null }
      }
      if (pendingUpdate) {
        const matches = applyFilters(this.getData(table))
        matches.forEach((r) => Object.assign(r, pendingUpdate))
        this.operations.push({ table, op: 'update', data: pendingUpdate })
        const first = matches[0] || null
        return hasSingle ? { data: first, error: null } : { data: matches, error: null }
      }
      if (pendingDelete) {
        const matches = applyFilters(this.getData(table))
        const matchIds = new Set(matches.map((r) => r.id))
        this.tables.set(table, this.getData(table).filter((r) => !matchIds.has(r.id)))
        this.operations.push({ table, op: 'delete' })
        return { data: null, error: null }
      }
      const rows = sorted(applyFilters(this.getData(table)))
      return hasSingle
        ? { data: rows[0] || null, error: null }
        : { data: rows, error: null }
    }

    const builder: any = {
      select(...args: any[]) {
        hasSelect = true
        if (args[1] && args[1].count === 'exact' && args[1].head) {
          countQuery = { exact: true, head: true }
        }
        return builder
      },
      eq(col: string, val: any) {
        filters.push({ col, op: 'eq', val })
        return builder
      },
      gt(col: string, val: any) {
        filters.push({ col, op: 'gt', val })
        return builder
      },
      not(col: string, op: string, val: any) {
        filters.push({ col, op: 'not.is', val })
        return builder
      },
      is(col: string, val: any) {
        filters.push({ col, op: 'is', val })
        return builder
      },
      order(col: string, opts?: { ascending?: boolean }) {
        orderCol = col
        orderAscending = opts?.ascending ?? true
        return builder
      },
      single() {
        hasSingle = true
        return Promise.resolve(resolve())
      },
      maybeSingle() {
        hasSingle = true
        return Promise.resolve(resolve())
      },
      insert(data: Row) {
        pendingInsert = { ...data }
        return builder
      },
      update(data: Row) {
        pendingUpdate = { ...data }
        return builder
      },
      delete() {
        pendingDelete = true
        return builder
      },
      then(resolveFn: (v: ResolveResult) => any) {
        return Promise.resolve(resolve()).then(resolveFn)
      },
      throw: () => {
        throw new Error('no result')
      },
    }

    return builder
  }
}

export function createMockSupabaseClient(): MockSupabaseClient {
  return new MockSupabaseClient()
}
