import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { TranscribeJob } from '@/lib/mcp-jobs'

vi.mock('@/lib/mcp-jobs', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/mcp-jobs')>()
  return {
    ...mod,
    processJob: vi.fn(),
  }
})

import { POST } from '@/app/api/mcp/route'
import { createJob, completeJob, getJob, processJob } from '@/lib/mcp-jobs'
import type { MockInstance } from 'vitest'

const BASE_URL = 'http://localhost/api/mcp'

const MCP_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
}

function mcpRequest(body: unknown, extraHeaders: Record<string, string> = {}, protocolVersion = '2025-06-18') {
  return new Request(BASE_URL, {
    method: 'POST',
    headers: {
      ...MCP_HEADERS,
      'Mcp-Protocol-Version': protocolVersion,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  })
}

async function postJson(body: unknown, extraHeaders: Record<string, string> = {}) {
  const res = await POST(mcpRequest(body, extraHeaders))
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null }
}

describe('MCP server (/api/mcp)', () => {
  let processJobMock: MockInstance

  beforeEach(() => {
    processJobMock = vi.mocked(processJob)
    processJobMock.mockClear()
  })

  it('rejects POSTs that do not accept application/json and text/event-stream', async () => {
    const res = await POST(
      new Request(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
      }),
    )
    expect(res.status).toBe(406)
  })

  it('rejects non-JSON content', async () => {
    const res = await POST(
      new Request(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain', Accept: 'application/json, text/event-stream' },
        body: 'not json',
      }),
    )
    expect(res.status).toBe(415)
  })

  it('completes a full JSON-RPC flow: initialize, initialize notification, list tools', async () => {
    const init = await postJson({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'vitest', version: '1.0.0' },
      },
    })

    expect(init.status).toBe(200)
    expect(init.body.result.serverInfo.name).toBe('Resumari YouTube Transcript')
    expect(init.body.result.serverInfo.version).toBe('1.0.0')

    const notif = await POST(
      mcpRequest({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    )
    expect(notif.status).toBe(202)

    const tools = await postJson({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
    expect(tools.status).toBe(200)
    const names = tools.body.result.tools.map((t: any) => t.name)
    expect(names).toEqual(['youtube.transcribe', 'youtube.get_transcript_job'])
  })

  it('returns an error when calling youtube.transcribe without video_id', async () => {
    const res = await postJson({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'youtube.transcribe', arguments: { video_id: '' } },
    })
    expect(res.status).toBe(200)
    const content = res.body.result.content[0].text
    expect(content).toContain('video_id richiesto')
  })

  it('creates a processing job for a valid video id', async () => {
    const res = await postJson({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'youtube.transcribe', arguments: { video_id: 'abc123def45' } },
    })
    expect(res.status).toBe(200)
    const content = JSON.parse(res.body.result.content[0].text)
    expect(content.status).toBe('processing')
    expect(content.job_id).toBeTypeOf('string')
    expect(getJob(content.job_id)).toBeDefined()
    expect(processJobMock).toHaveBeenCalledTimes(1)
  })

  it('returns a completed job with markdown transcript', async () => {
    const job: TranscribeJob = createJob('abc123def45')
    completeJob(job.job_id, {
      title: 'Il mio video',
      channel: 'Il mio canale',
      transcript: [{ text: 'Ciao', start: 0, duration: 1 }],
      text: 'Ciao',
      language: 'it',
    })

    const res = await postJson({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: 'youtube.get_transcript_job', arguments: { job_id: job.job_id } },
    })
    expect(res.status).toBe(200)
    const content = JSON.parse(res.body.result.content[0].text)
    expect(content.status).toBe('completed')
    expect(content.video.title).toBe('Il mio video')
    expect(content.transcript.format).toBe('markdown')
    expect(content.transcript.text).toContain('# Il mio video')
    expect(content.usage.credits_used).toBe(2)
  })

  it('returns an error for an unknown job', async () => {
    const res = await postJson({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: { name: 'youtube.get_transcript_job', arguments: { job_id: 'does-not-exist' } },
    })
    const content = JSON.parse(res.body.result.content[0].text)
    expect(content.error).toBe('Job non trovato')
  })
})
