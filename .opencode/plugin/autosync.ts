/**
 * Plugin opencode: dopo ogni modifica ai file esegue i controlli e, se
 * passano, committa e spinge su GitHub.
 *
 * Configurato da `opencode.json` (plugin auto-rivelato da `.opencode/plugin/`).
 * Documentazione del comportamento in `AGENTS.md`.
 *
 * Scelte deliberate:
 * - i controlli sono typecheck, lint e test: `next build` è lento e non serve
 *   come gate a ogni edit (si esegue a fine intervento);
 * - i file da committare sono quelli toccati dalla singola edit, non
 *   `git add -A`: evita di portare su GitHub lavoro non finito;
 * - se un controllo fallisce non si committa: si limita il file a Git e si
 *   segnala, così la modifica resta locale e non viene pubblicata;
 * - più edit ravvicinate vengono accorpate: un refactor da 10 edit non produce
 *   10 commit (e 10 deploy).
 */

import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

/** Tool che modificano file: è su questi che scatta la sincronizzazione. */
export const EDIT_TOOLS = ["edit", "write", "patch", "multiedit", "apply_patch"]

/** Le edit ravvicinate vengono accorpate entro questa finestra. */
export const DEBOUNCE_MS = 1500

/** Timeout per singolo controllo. */
const CHECK_TIMEOUT_MS = 10 * 60 * 1000
const GIT_TIMEOUT_MS = 3 * 60 * 1000

type Check = { name: string; cmd: string; args: string[] }

/** Controlli in ordine: fail-fast per non perdere tempo quando il primo è rosso. */
export const CHECKS: Check[] = [
  { name: "typecheck", cmd: "npx", args: ["tsc", "--noEmit"] },
  { name: "lint", cmd: "npx", args: ["eslint", "src"] },
  { name: "test", cmd: "npx", args: ["vitest", "run"] },
]

type RunResult = { ok: boolean; output: string }

function isWindows(): boolean {
  return process.platform === "win32"
}

async function run(
  command: string,
  args: string[],
  cwd: string,
  timeout: number,
): Promise<RunResult> {
  // Su Windows i binari npm sono .cmd e vanno invocati con l'estensione.
  const executable = isWindows() && !command.includes(pathSeparator()) ? `${command}.cmd` : command
  try {
    const { stdout, stderr } = await execFileAsync(executable, args, {
      cwd,
      timeout,
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, CI: "1" },
    })
    return { ok: true, output: `${stdout}${stderr}` }
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string }
    return { ok: false, output: `${err.stdout ?? ""}${err.stderr ?? ""}${err.message ?? ""}`.trim() }
  }
}

function pathSeparator(): string {
  return isWindows() ? "\\" : "/"
}

function log(message: string): void {
  console.log(`[autosync] ${message}`)
}

/** `true` se il tool appena eseguito ha modificato un file. */
export function shouldSyncTool(tool: unknown): boolean {
  return typeof tool === "string" && EDIT_TOOLS.includes(tool)
}

/**
 * Percorsi dei file toccati dalla singola chiamata di tool.
 *
 * opencode non espone un contratto unico per gli argomenti dei tool di edit, più
 * nomi sono coperti e il primo trovato viene usato.
 */
export function touchedPaths(input: unknown): string[] {
  const source = (input ?? {}) as Record<string, unknown>
  const args = (source.args ?? source.arguments ?? source.input ?? {}) as Record<string, unknown>
  const candidates = [args.filePath, args.path, args.file, args.fileName, args.file_path]
  const found = candidates.filter((value): value is string => typeof value === "string" && value.length > 0)
  return Array.from(new Set(found))
}

/** Messaggio di commit in stile conventional commits, senza inventare l'intento. */
export function buildCommitMessage(paths: string[]): { subject: string; body: string } {
  const files = paths.length > 0 ? paths : ["(file non identificato)"]
  const subject = `chore(sync): ${files.length} ${files.length === 1 ? "file aggiornato" : "file aggiornati"}`
  const body = ["Aggiornamento automatico dopo una modifica.", "", ...files.map((f) => `- ${f}`)].join("\n")
  return { subject, body }
}

async function git(args: string[], cwd: string): Promise<RunResult> {
  return run("git", args, cwd, GIT_TIMEOUT_MS)
}

/** Stato del repository dove scattareà la sincronizzazione. */
async function repoState(cwd: string): Promise<{ isRepo: boolean; busy: boolean }> {
  const inside = await git(["rev-parse", "--is-inside-work-tree"], cwd)
  if (!inside.ok) return { isRepo: false, busy: false }
  // Durante merge/rebase spingere automatizzatamente è pericoloso: meglio stare fermi.
  const merge = await git(["rev-parse", "--verify", "--quiet", "MERGE_HEAD"], cwd)
  const rebase =
    (await git(["rev-parse", "--verify", "--quiet", "REBASE_HEAD"], cwd)).ok ||
    (await git(["rev-parse", "--git-path", "rebase-merge"], cwd)).output.trim().length > 0
  return { isRepo: true, busy: merge.ok || rebase }
}

export async function runChecks(cwd: string): Promise<{ failed: Check | null; output: string }> {
  for (const check of CHECKS) {
    const result = await run(check.cmd, check.args, cwd, CHECK_TIMEOUT_MS)
    if (!result.ok) return { failed: check, output: result.output }
  }
  return { failed: null, output: "" }
}

/**
 * Committa i file indicati e spinge sul branch corrente.
 * Restituisce un esito leggibile da mostrare all'utente.
 */
export async function commitAndPush(
  cwd: string,
  paths: string[],
): Promise<{ status: "committed" | "nothing" | "blocked"; message: string }> {
  const add = await git(["add", "--", ...paths], cwd)
  if (!add.ok) return { status: "blocked", message: `git add fallito: ${add.output}` }

  const staged = await git(["diff", "--cached", "--name-only"], cwd)
  if (!staged.ok || staged.output.trim().length === 0) {
    return { status: "nothing", message: "nessuna modifica da committare" }
  }

  const changed = staged.output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const { subject, body } = buildCommitMessage(changed)
  const commit = await git(["commit", "-m", subject, "-m", body], cwd)
  if (!commit.ok) {
    // Un commit vuoto o un pre-commit hook fallito non devono fermare nulla.
    return { status: "blocked", message: `git commit fallito: ${commit.output}` }
  }

  const push = await git(["push"], cwd)
  if (!push.ok) {
    return { status: "committed", message: `commit creato, push fallito: ${push.output}` }
  }
  return { status: "committed", message: `${subject} → push ok` }
}

type PluginInput = { directory?: string }

/**
 * Factory del plugin. Lo stato (timer, lock) vive nella closure, così più
 * sessioni non condividono la coda.
 */
export function createAutosync() {
  let timer: ReturnType<typeof setTimeout> | null = null
  let running = false
  let pending = false

  async function sync(paths: string[]): Promise<void> {
    const cwd = process.cwd()
    const state = await repoState(cwd)
    if (!state.isRepo) return
    if (state.busy) {
      log("merge/rebase in corso: sincronizzazione saltata")
      return
    }

    const { failed, output } = await runChecks(cwd)
    if (failed) {
      log(`${failed.name} fallito: nessun commit, la modifica resta locale.`)
      const tail = output.split(/\r?\n/).slice(-12).join("\n")
      if (tail.trim()) log(tail)
      return
    }

    const result = await commitAndPush(cwd, paths.length > 0 ? paths : ["."])
    log(`${result.status}: ${result.message}`)
  }

  return async function autosyncPlugin(input: PluginInput) {
    const directory = input?.directory
    const cwd = directory && directory.length > 0 ? directory : process.cwd()

    async function flush(paths: string[]) {
      if (running) {
        pending = true
        return
      }
      running = true
      try {
        const previous = process.cwd()
        if (cwd !== previous) process.chdir(cwd)
        try {
          await sync(paths)
        } finally {
          if (cwd !== previous) process.chdir(previous)
        }
      } catch (error) {
        log(`errore inatteso: ${error instanceof Error ? error.message : String(error)}`)
      } finally {
        running = false
        if (pending) {
          pending = false
          schedule([])
        }
      }
    }

    function schedule(paths: string[]) {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        void flush(paths)
      }, DEBOUNCE_MS)
    }

    return {
      "tool.execute.after": async (toolInput: unknown) => {
        const source = (toolInput ?? {}) as Record<string, unknown>
        const tool = source.tool ?? source.name
        if (!shouldSyncTool(tool)) return
        schedule(touchedPaths(toolInput))
      },
    }
  }
}

export default createAutosync()
