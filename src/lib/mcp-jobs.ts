import crypto from 'crypto'
import { fetchTranscriptForVideo, getVideoDetails, getYouTubeVideoId } from './youtube'
import { getServiceClient, TABLES } from './supabase'
import { CREDIT_COSTS, deductCredits } from './credits'

/**
 * Definizione di un job di trascrizione.
 * Rappresenta lo stato di un'operazione di recupero sottotitoli da YouTube.
 */
export type TranscribeJob = {
  job_id: string
  video_id: string
  /** Utente che ha avviato il job: i crediti vengono scalati dal suo pool. */
  user_id?: string | null
  status: 'processing' | 'completed' | 'failed'
  created_at: number
  result?: {
    title: string
    channel: string
    transcript: { text: string; start: number; duration: number }[]
    text: string
    language: string
  }
  error?: string
  /** Crediti effettivamente addebitati (0 se il job è fallito). */
  credits_charged?: number
}

/**
 * Store in-memory per la gestione dei job (path veloce) + snapshot best-effort
 * su Supabase (`mcp_jobs`) per sopravvivere al recycle serverless tra
 * `youtube.transcribe` e `youtube.get_transcript_job`.
 */
const jobs = new Map<string, TranscribeJob>()

/**
 * Snapshot best-effort su Supabase. Se la tabella non esiste (migration non
 * applicata) l'upsert fallisce in silenzio: la Map resta attiva.
 */
async function persistJobSnapshot(job: TranscribeJob): Promise<void> {
  try {
    await getServiceClient()
      .from(TABLES.MCP_JOBS)
      .upsert(
        {
          job_id: job.job_id,
          video_id: job.video_id,
          user_id: job.user_id ?? null,
          status: job.status,
          result: job.result ?? null,
          error: job.error ?? null,
          credits_charged: job.credits_charged ?? 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'job_id' },
      )
  } catch {
    // no-op: fallback in-memory
  }
}

/**
 * Inizializza e salva un nuovo job di trascrizione.
 */
export function createJob(videoId: string, userId?: string | null): TranscribeJob {
  const job: TranscribeJob = {
    job_id: crypto.randomBytes(8).toString('hex'),
    video_id: videoId,
    user_id: userId ?? null,
    status: 'processing',
    created_at: Date.now(),
  }
  jobs.set(job.job_id, job)
  // Best-effort: snapshot iniziale su Supabase (fire-and-forget).
  void persistJobSnapshot(job).catch(() => {})
  return job
}

/**
 * Recupera lo stato corrente di un job tramite il suo ID.
 *
 * Sincrono per compatibilità con la route MCP (Map in-memory).
 * Per il fallback cross-istanza (recycle serverless) usare `getJobAsync()`.
 */
export function getJob(jobId: string): TranscribeJob | undefined {
  return jobs.get(jobId)
}

/**
 * Variante async con fallback su Supabase (`mcp_jobs`).
 * Se la tabella non esiste, ritorna solo la Map in-memory.
 */
export async function getJobAsync(jobId: string): Promise<TranscribeJob | undefined> {
  const mem = jobs.get(jobId)
  if (mem) return mem
  try {
    const { data } = await getServiceClient()
      .from(TABLES.MCP_JOBS)
      .select()
      .eq('job_id', jobId)
      .single()
    if (!data) return undefined
    const job: TranscribeJob = {
      job_id: data.job_id,
      video_id: data.video_id,
      user_id: data.user_id ?? null,
      status: data.status,
      created_at: new Date(data.created_at).getTime(),
      result: data.result ?? undefined,
      error: data.error ?? undefined,
      credits_charged: data.credits_charged ?? 0,
    }
    jobs.set(job.job_id, job)
    return job
  } catch {
    return undefined
  }
}

/**
 * Segna un job come completato e salva i risultati della trascrizione.
 */
export function completeJob(jobId: string, result: TranscribeJob['result']) {
  const job = jobs.get(jobId)
  if (job) {
    job.status = 'completed'
    job.result = result
    void persistJobSnapshot(job).catch(() => {})
  }
}

/**
 * Segna un job come fallito e registra l'errore riscontrato.
 */
export function failJob(jobId: string, error: string) {
  const job = jobs.get(jobId)
  if (job) {
    job.status = 'failed'
    job.error = error
    job.credits_charged = 0
    void persistJobSnapshot(job).catch(() => {})
  }
}

/**
 * Processo principale di elaborazione di un job di trascrizione.
 * Usa il layer condiviso `@/lib/youtube` (3 fallback: timedtext →
 * pacchetto youtube-transcript → kome.ai) invece della copia locale.
 *
 * I crediti vengono addebitati solo se la trascrizione è andata a buon
 * fine, come per `POST /api/v1/transcript`: un job fallito non consuma nulla.
 */
export async function processJob(job: TranscribeJob) {
  try {
    const videoId = getYouTubeVideoId(job.video_id) || job.video_id
    const [details, transcriptData] = await Promise.all([
      getVideoDetails(videoId),
      fetchTranscriptForVideo(videoId),
    ])

    if (!transcriptData || transcriptData.transcript.length === 0) {
      failJob(job.job_id, 'no_transcript: Il video non ha sottotitoli disponibili')
      return
    }

    const transcript = transcriptData.transcript.map((s) => ({
      text: s.text,
      start: s.time,
      duration: s.duration,
    }))
    const text = transcript.map((s) => s.text).join(' ')

    // Addebito atomico: se nel frattempo i crediti sono finiti non si
    // consegna la trascrizione "in ombra".
    let creditsCharged = 0
    if (job.user_id) {
      const remaining = await deductCredits(job.user_id, CREDIT_COSTS.transcriptionApi)
      if (remaining === null) {
        failJob(job.job_id, 'insufficient_credits: crediti esauriti prima della trascrizione')
        return
      }
      creditsCharged = CREDIT_COSTS.transcriptionApi
    }

    const stored = jobs.get(job.job_id)
    if (stored) stored.credits_charged = creditsCharged

    completeJob(job.job_id, {
      title: details?.title || 'Video',
      channel: details?.channelTitle || 'Canale sconosciuto',
      transcript,
      text,
      language: transcriptData.language,
    })
  } catch (err: unknown) {
    failJob(job.job_id, err instanceof Error ? err.message : 'Errore durante la trascrizione')
  }
}
