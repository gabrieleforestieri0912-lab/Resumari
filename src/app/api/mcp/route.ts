import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp'
import { z } from 'zod'
import { createJob, getJobAsync, processJob } from '@/lib/mcp-jobs'
import { authenticateApiRequest } from '@/lib/api-auth'
import { CREDIT_COSTS } from '@/lib/credits'
import type { User } from '@/lib/types'

/** Utente autenticato della richiesta MCP corrente. */
type McpUser = User & { id: string }

/**
 * Configura il server MCP (Model Context Protocol).
 * L'MCP permette a modelli AI esterni di interagire con le funzionalità di
 * Resumari tramite "tools" definiti. Ogni tool è associato all'utente che ha
 * autenticato la richiesta: i crediti vengono scalati dal suo pool.
 */
function createServer(user: McpUser) {
  const server = new McpServer({
    name: 'Resumari',
    version: '1.0.0',
  })

  /**
   * Tool: youtube.transcribe
   * Avvia un job asincrono per recuperare e pulire la trascrizione di un video YouTube.
   * Restituisce un job_id che può essere utilizzato per monitorare lo stato dell'operazione.
   */
  server.registerTool('youtube.transcribe', {
    title: 'youtube.transcribe',
    description: 'Invia un URL di YouTube o un video ID per avviare un job di trascrizione asincrono. Restituisce un job_id per il monitoraggio tramite youtube.get_transcript_job.',
    inputSchema: z.object({
      video_id: z.string().describe('URL del video YouTube o video ID'),
    }),
  }, async (args) => {
    try {
      const videoId = (args.video_id || '').trim()
      if (!videoId) {
        return { content: [{ type: 'text', text: 'Errore: video_id richiesto' }] }
      }

      // Stessa regola dell'API REST: niente crediti, niente job.
      if ((user.credits ?? 0) < CREDIT_COSTS.transcriptionApi) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Crediti insufficienti: servono ${CREDIT_COSTS.transcriptionApi} crediti, disponibili ${user.credits ?? 0}.` }],
        }
      }

      const job = createJob(videoId, user.id)
      // Fire-and-forget sullo stesso event loop: lo snapshot sync va su
      // Supabase, ma l'elaborazione resta locale (fallback Map + DB in lettura).
      void processJob(job).catch((err) => console.error('MCP job failed:', err))

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ job_id: job.job_id, status: 'processing' }),
        }],
      }
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Errore: ${err.message}` }] }
    }
  })

  /**
   * Tool: youtube.get_transcript_job
   * Monitora lo stato di un job di trascrizione.
   * Quando il job è completato, restituisce la trascrizione formattata in markdown.
   */
  server.registerTool('youtube.get_transcript_job', {
    title: 'youtube.get_transcript_job',
    description: 'Monitora il job e ricevi la trascrizione markdown quando è pronta.',
    inputSchema: z.object({
      job_id: z.string().describe('L\'ID del job restituito da youtube.transcribe'),
    }),
  }, async (args) => {
    try {
      const jobId = (args.job_id || '').trim()
      if (!jobId) {
        return { content: [{ type: 'text', text: 'Errore: job_id richiesto' }] }
      }

      const job = await getJobAsync(jobId)
      if (!job) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Job non trovato' }) }] }
      }

      // I job sono privati: un altro utente non può leggere la trascrizione
      // di qualcun altro indovinandone l'id.
      if (job.user_id && job.user_id !== user.id) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Job non trovato' }) }] }
      }

      if (job.status === 'processing') {
        return {
          content: [{ type: 'text', text: JSON.stringify({ job_id: job.job_id, status: 'processing' }) }],
        }
      }

      if (job.status === 'failed') {
        return {
          content: [{ type: 'text', text: JSON.stringify({ job_id: job.job_id, status: 'failed', error: job.error }) }],
        }
      }

      // Formattazione della trascrizione finale in Markdown per l'AI
      const markdown = `# ${job.result!.title}\n\nCanale: ${job.result!.channel}\nLingua: ${job.result!.language}\n\n${job.result!.text}`

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            job_id: job.job_id,
            status: 'completed',
            video: { title: job.result!.title, channel: job.result!.channel },
            transcript: { format: 'markdown', text: markdown },
            usage: { credits_used: job.credits_charged ?? CREDIT_COSTS.transcriptionApi },
          }),
        }],
      }
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Errore: ${err.message}` }] }
    }
  })

  return server
}

/**
 * Gestisce le richieste HTTP in entranti convertendole in comunicazioni MCP.
 * Poiché il trasporto stateless non può essere riutilizzato, viene creato
 * un nuovo server e un nuovo trasporto per ogni singola richiesta.
 */
async function handleRequest(request: Request, user: McpUser) {
  const server = createServer(user)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })
  await server.connect(transport)
  return transport.handleRequest(request)
}

/**
 * Ogni richiesta MCP deve essere autenticata (chiave API `X-API-Key` o token
 * OAuth `Authorization: Bearer`). Senza autenticazione la trascrizione sarebbe
 *-gratuita e illimitata per chiunque.
 */
async function authorized(request: Request) {
  const auth = await authenticateApiRequest(request)
  if (!auth.authenticated) {
    const origin = new URL(request.url).origin
    return {
      response: Response.json(
        {
          jsonrpc: '2.0',
          error: { code: -32001, message: 'Autenticazione richiesta: usa una chiave API Resumari (X-API-Key) o il token OAuth (Authorization: Bearer).' },
          id: null,
        },
        {
          status: auth.status,
          headers: {
            'WWW-Authenticate': `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource", error="${auth.error}"`,
          },
        },
      ),
      user: null,
    }
  }
  return { response: null, user: auth.user }
}

export async function GET(request: Request) {
  const { response, user } = await authorized(request)
  if (response) return response
  return handleRequest(request, user!)
}

export async function POST(request: Request) {
  const { response, user } = await authorized(request)
  if (response) return response
  return handleRequest(request, user!)
}

export async function DELETE(request: Request) {
  const { response, user } = await authorized(request)
  if (response) return response
  return handleRequest(request, user!)
}
