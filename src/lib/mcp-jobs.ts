import crypto from 'crypto'

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
 * Store in-memory per la gestione dei job.
 * In produzione, questo dovrebbe essere sostituito da un database o Redis.
 */
const jobs = new Map<string, TranscribeJob>()

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
  return job
}

/**
 * Recupera lo stato corrente di un job tramite il suo ID.
 */
export function getJob(jobId: string): TranscribeJob | undefined {
  return jobs.get(jobId)
}

/**
 * Segna un job come completato e salva i risultati della trascrizione.
 */
export function completeJob(jobId: string, result: TranscribeJob['result']) {
  const job = jobs.get(jobId)
  if (job) {
    job.status = 'completed'
    job.result = result
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
  }
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || ''

/**
 * Estrae l'ID di un video YouTube da un URL o da una stringa.
 */
function getYouTubeVideoId(input: string): string | null {
  if (!input) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match && match[1].length === 11) return match[1]
  }
  return null
}

/**
 * Recupera i dettagli di un video tramite l'API ufficiale di YouTube.
 */
async function getVideoDetails(videoId: string) {
  if (!YOUTUBE_API_KEY) return null
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet,contentDetails`
    const response = await fetch(url)
    const data = await response.json()
    if (data.items && data.items.length > 0) {
      const item = data.items[0]
      return {
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Tenta di recuperare la trascrizione di un video YouTube in italiano o inglese.
 */
async function getTranscript(videoId: string): Promise<{ transcript: { text: string; start: number; duration: number }[]; language: string } | null> {
  const languages = ['it', 'en']
  for (const lang of languages) {
    try {
      const url = `https://youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`
      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (response.ok) {
        const captionData = await response.json()
        if (captionData.events && captionData.events.length > 0) {
          const segments = captionData.events
            .filter((e: any) => e.segs)
            .map((e: any) => ({
              text: e.segs.map((s: any) => s.utf8).join(' '),
              start: (e.tStartMs || 0) / 1000,
              duration: (e.dDurationMs || 0) / 1000,
            }))
          return { transcript: segments, language: lang }
        }
      }
    } catch {
      // continua al prossimo linguaggio
    }
  }
  return null
}

/**
 * Processo principale di elaborazione di un job di trascrizione.
 * Recupera i dettagli del video e la trascrizione, aggiornando poi lo stato del job.
 */
export async function processJob(job: TranscribeJob) {
  try {
    const videoId = getYouTubeVideoId(job.video_id) || job.video_id
    const [details, transcriptData] = await Promise.all([
      getVideoDetails(videoId),
      getTranscript(videoId),
    ])

    if (!transcriptData || transcriptData.transcript.length === 0) {
      failJob(job.job_id, 'no_transcript: Il video non ha sottotitoli disponibili')
      return
    }

    const text = transcriptData.transcript.map(s => s.text).join(' ')

    completeJob(job.job_id, {
      title: details?.title || 'Video',
      channel: details?.channelTitle || 'Canale sconosciuto',
      transcript: transcriptData.transcript,
      text,
      language: transcriptData.language,
    })
  } catch (err: any) {
    failJob(job.job_id, err.message || 'Errore durante la trascrizione')
  }
}
