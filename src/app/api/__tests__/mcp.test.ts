import { describe, it, expect, vi, beforeEach } from 'vitest'

const { apiAuthMocks, jobsMocks, creditsMocks } = vi.hoisted(() => ({
  apiAuthMocks: { authenticateApiRequest: vi.fn() },
  jobsMocks: { createJob: vi.fn(), getJobAsync: vi.fn(), processJob: vi.fn() },
  creditsMocks: { CREDIT_COSTS: { transcriptionApi: 2 } },
}))

vi.mock('@/lib/api-auth', () => apiAuthMocks)
vi.mock('@/lib/mcp-jobs', () => jobsMocks)
vi.mock('@/lib/credits', () => creditsMocks)

import { POST as mcpPOST, GET as mcpGET } from '@/app/api/mcp/route'

const rpcBody = (method: string, params: unknown = {}) =>
  JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })

function mcpRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://resumari.vercel.app/api/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const authed = (credits = 10) => ({
  authenticated: true,
  user: { id: 'u1', email: 'a@b.c', credits, plan: 'free' },
  creditsRemaining: credits,
  rateLimitRemaining: 29,
})

describe('POST /api/mcp (auth)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 senza credenziali, con WWW-Authenticate verso i metadati', async () => {
    apiAuthMocks.authenticateApiRequest.mockResolvedValue({ authenticated: false, error: 'missing_api_key', status: 401 })
    const res = await mcpPOST(mcpRequest(rpcBody('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'x', version: '1' } })))
    expect(res.status).toBe(401)
    expect(res.headers.get('www-authenticate')).toContain('/.well-known/oauth-protected-resource')
    const body = await res.json()
    expect(body.error.code).toBe(-32001)
  })

  it('401 anche su GET (non basta il POST per bypassare)', async () => {
    apiAuthMocks.authenticateApiRequest.mockResolvedValue({ authenticated: false, error: 'invalid_token', status: 401 })
    const res = await mcpGET(new Request('https://resumari.vercel.app/api/mcp', { headers: {} }))
    expect(res.status).toBe(401)
  })

  it('con credenziali risponde al handshake MCP', async () => {
    apiAuthMocks.authenticateApiRequest.mockResolvedValue(authed())
    const res = await mcpPOST(mcpRequest({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'x', version: '1' } } }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.result.serverInfo.name).toBe('Resumari')
  })

  it('rifiuta youtube.transcribe senza crediti e non crea il job', async () => {
    apiAuthMocks.authenticateApiRequest.mockResolvedValue(authed(1))
    const res = await mcpPOST(mcpRequest(rpcBody('tools/call', { name: 'youtube.transcribe', arguments: { video_id: 'DHjqpvDnNGE' } })))
    const body = await res.json()
    expect(body.result.isError).toBe(true)
    expect(body.result.content[0].text).toMatch(/Crediti insufficienti/)
    expect(jobsMocks.createJob).not.toHaveBeenCalled()
  })

  it('con crediti crea il job associato all utente autenticato', async () => {
    apiAuthMocks.authenticateApiRequest.mockResolvedValue(authed())
    jobsMocks.createJob.mockReturnValue({ job_id: 'job1', status: 'processing' })
    jobsMocks.processJob.mockResolvedValue(undefined)
    const res = await mcpPOST(mcpRequest(rpcBody('tools/call', { name: 'youtube.transcribe', arguments: { video_id: 'https://youtu.be/DHjqpvDnNGE' } })))
    const body = await res.json()
    expect(JSON.parse(body.result.content[0].text).job_id).toBe('job1')
    expect(jobsMocks.createJob).toHaveBeenCalledWith('https://youtu.be/DHjqpvDnNGE', 'u1')
  })

  it('non lascia leggere a un altro utente il job di qualcun altro', async () => {
    apiAuthMocks.authenticateApiRequest.mockResolvedValue(authed())
    jobsMocks.getJobAsync.mockResolvedValue({ job_id: 'job1', user_id: 'altro', status: 'processing' })
    const res = await mcpPOST(mcpRequest(rpcBody('tools/call', { name: 'youtube.get_transcript_job', arguments: { job_id: 'job1' } })))
    const body = await res.json()
    expect(JSON.parse(body.result.content[0].text).error).toBe('Job non trovato')
  })

  it('reporta i crediti realmente addebitati sul job', async () => {
    apiAuthMocks.authenticateApiRequest.mockResolvedValue(authed())
    jobsMocks.getJobAsync.mockResolvedValue({
      job_id: 'job1',
      user_id: 'u1',
      status: 'completed',
      credits_charged: 2,
      result: { title: 'T', channel: 'C', language: 'it', text: 'testo', transcript: [] },
    })
    const res = await mcpPOST(mcpRequest(rpcBody('tools/call', { name: 'youtube.get_transcript_job', arguments: { job_id: 'job1' } })))
    const payload = JSON.parse((await res.json()).result.content[0].text)
    expect(payload.status).toBe('completed')
    expect(payload.usage.credits_used).toBe(2)
  })
})
