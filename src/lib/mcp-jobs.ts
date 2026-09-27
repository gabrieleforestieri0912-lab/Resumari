import crypto from 'crypto'
import { fetchTranscriptForVideo, getVideoDetails, getYouTubeVideoId } from './youtube'
import { getServiceClient } from './supabase'

/**
 * Definizione di un job di trascrizione.
 * Rappresenta lo stato di un'operazione di recupero sottotitoli da YouTube.
 */
export type TranscribeJob = {
  job_id: string
  video_id: string
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
      .from('mcp_jobs')
      .upsert(
        {
          job_id: job.job_id,
          video_id: job.video_id,
          status: job.status,
          result: job.result ?? null,
          error: job.error ?? null,
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
export function createJob(videoId: string): TranscribeJob {
  const job: TranscribeJob = {
    job_id: crypto.randomBytes(8).toString('hex'),
    video_id: videoId,
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
      .from('mcp_jobs')
      .select()
      .eq('job_id', jobId)
      .single()
    if (!data) return undefined
    const job: TranscribeJob = {
      job_id: data.job_id,
      video_id: data.video_id,
      status: data.status,
      created_at: new Date(data.created_at).getTime(),
      result: data.result ?? undefined,
      error: data.error ?? undefined,
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
    void persistJobSnapshot(job).catch(() => {})
  }
}

/**
 * Processo principale di elaborazione di un job di trascrizione.
 * Usa il layer condiviso `@/lib/youtube` (3 fallback: timedtext →
 * pacchetto youtube-transcript → kome.ai) invece della copia locale.
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
