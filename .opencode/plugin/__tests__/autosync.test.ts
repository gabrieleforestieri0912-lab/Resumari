import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  buildCommitMessage,
  createAutosync,
  EDIT_TOOLS,
  shouldSyncTool,
  touchedPaths,
} from '../autosync'

/**
 * Il plugin autosync gira fuori dal processo di test: qui si verificano le
 * decisioni pure (quale tool scatta, quali file, come si chiama il commit) e il
 * fatto che l'hook non si attivi per i tool che non modificano file.
 */
describe('autosync: individuazione delle modifiche', () => {
  it('scatta solo sui tool che modificano file', () => {
    for (const tool of EDIT_TOOLS) expect(shouldSyncTool(tool)).toBe(true)
    for (const tool of ['read', 'bash', 'grep', 'glob', 'webfetch', 'task', undefined, 42]) {
      expect(shouldSyncTool(tool)).toBe(false)
    }
  })

  it('estrae il percorso del file dalle forme note degli argomenti', () => {
    expect(touchedPaths({ args: { filePath: 'src/app/page.tsx' } })).toEqual(['src/app/page.tsx'])
    expect(touchedPaths({ args: { path: 'src/lib/db.ts' } })).toEqual(['src/lib/db.ts'])
    expect(touchedPaths({ arguments: { file: 'README.md' } })).toEqual(['README.md'])
    expect(touchedPaths({ args: { filePath: 'a.ts', path: 'a.ts' } })).toEqual(['a.ts'])
  })

  it('non inventare percorsi quando gli argomenti non li contengono', () => {
    expect(touchedPaths({})).toEqual([])
    expect(touchedPaths(undefined)).toEqual([])
    expect(touchedPaths({ args: { filePath: '' } })).toEqual([])
  })

  it('messaggio di commit in conventional commits, con i file nel corpo', () => {
    const one = buildCommitMessage(['src/app/page.tsx'])
    expect(one.subject).toBe('chore(sync): 1 file aggiornato')
    expect(one.body).toContain('- src/app/page.tsx')

    const two = buildCommitMessage(['a.ts', 'b.ts'])
    expect(two.subject).toBe('chore(sync): 2 file aggiornati')
    expect(two.body).toContain('- a.ts')
    expect(two.body).toContain('- b.ts')
  })
})

describe('autosync: hook', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('registra tool.execute.after', async () => {
    const plugin = await createAutosync()({})
    expect(typeof plugin['tool.execute.after']).toBe('function')
  })

  it('non lancia nessun processo per i tool di lettura', async () => {
    const plugin = await createAutosync()({})
    await plugin['tool.execute.after']({ tool: 'read', args: { filePath: 'src/app/page.tsx' } })
    // Nessun sync schedulato: se lo ci fosse stato, i timer pendenti avrebbero
    // provato a lanciare tsc/eslint/vitest.
    expect(vi.getTimerCount()).toBe(0)
  })

  it('accorpa più edit ravvicinate in un solo sync', async () => {
    const plugin = await createAutosync()({ directory: process.cwd() })
    await plugin['tool.execute.after']({ tool: 'edit', args: { filePath: 'src/app/page.tsx' } })
    await plugin['tool.execute.after']({ tool: 'edit', args: { filePath: 'src/app/chat/page.tsx' } })
    // Un solo timer: le due edit sono vicine e vengono unite.
    expect(vi.getTimerCount()).toBe(1)
  })
})