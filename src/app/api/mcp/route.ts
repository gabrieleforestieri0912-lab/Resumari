import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp'
import { z } from 'zod'
import { createJob, getJob, processJob } from '@/lib/mcp-jobs'

/**
 * Configura il server MCP (Model Context Protocol).
 * L'MCP permette a modelli AI esterni di interagire con le funzionalità di Resumari tramite "tools" definiti.
 */
function createServer() {
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

      const job = createJob(videoId)
      processJob(job)

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

      const job = getJob(jobId)
      if (!job) {
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
            usage: { credits_used: 2 },
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
async function handleRequest(request: Request) {
  const server = createServer()
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })
  await server.connect(transport)
  return transport.handleRequest(request)
}

export async function GET(request: Request) {
  return handleRequest(request)
}

export async function POST(request: Request) {
  return handleRequest(request)
}

export async function DELETE(request: Request) {
  return handleRequest(request)
}
