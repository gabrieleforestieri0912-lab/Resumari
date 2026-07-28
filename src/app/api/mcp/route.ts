import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp'
import { z } from 'zod'
import { createJob, getJob, processJob } from '@/lib/mcp-jobs'

let serverInstance: McpServer | null = null
let transportInstance: WebStandardStreamableHTTPServerTransport | null = null

function getOrCreateServer() {
  if (serverInstance && transportInstance) return { server: serverInstance, transport: transportInstance }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })

  const server = new McpServer({
    name: 'Resumari YouTube Transcript',
    version: '1.0.0',
  })

  server.registerTool('youtube.transcribe', {
    title: 'youtube.transcribe',
    description: 'Submit a single YouTube URL or video ID and start an async cleanup job. Returns a job_id to poll with youtube.get_transcript_job.',
    inputSchema: z.object({
      video_id: z.string().describe('YouTube video URL or video ID'),
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

  server.registerTool('youtube.get_transcript_job', {
    title: 'youtube.get_transcript_job',
    description: 'Poll the job and receive the cleaned markdown transcript when it is ready.',
    inputSchema: z.object({
      job_id: z.string().describe('The job ID returned by youtube.transcribe'),
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

  serverInstance = server
  transportInstance = transport

  return { server, transport }
}

export async function GET(request: Request) {
  const { transport } = getOrCreateServer()
  return transport.handleRequest(request)
}

export async function POST(request: Request) {
  const { transport } = getOrCreateServer()
  return transport.handleRequest(request)
}

export async function DELETE(request: Request) {
  const { transport } = getOrCreateServer()
  return transport.handleRequest(request)
}
