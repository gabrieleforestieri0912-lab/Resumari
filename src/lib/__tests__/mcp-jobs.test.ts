import { describe, it, expect } from 'vitest'
import { createJob, getJob, getJobAsync, completeJob, failJob } from '@/lib/mcp-jobs'

describe('mcp-jobs lifecycle', () => {
  it('createJob crea un job processing con id univoco', () => {
    const a = createJob('VID12345678')
    const b = createJob('VID12345678')
    expect(a.status).toBe('processing')
    expect(a.video_id).toBe('VID12345678')
    expect(a.job_id).not.toBe(b.job_id)
    expect(getJob(a.job_id)).toBe(a)
  })

  it('getJob ritorna undefined per id sconosciuti', () => {
    expect(getJob('inesistente')).toBeUndefined()
  })

  it('completeJob salva risultato e stato', () => {
    const job = createJob('VID12345678')
    const result = {
      title: 'Titolo',
      channel: 'Canale',
      transcript: [{ text: 'ciao', start: 0, duration: 1 }],
      text: 'ciao',
      language: 'it',
    }
    completeJob(job.job_id, result)
    const stored = getJob(job.job_id)!
    expect(stored.status).toBe('completed')
    expect(stored.result).toEqual(result)
  })

  it('failJob registra errore e stato failed', () => {
    const job = createJob('VID12345678')
    failJob(job.job_id, 'no_transcript: niente sottotitoli')
    const stored = getJob(job.job_id)!
    expect(stored.status).toBe('failed')
    expect(stored.error).toMatch(/no_transcript/)
  })

  it('complete/fail su id inesistenti non lanciano', () => {
    expect(() => completeJob('xxx', undefined as any)).not.toThrow()
    expect(() => failJob('xxx', 'err')).not.toThrow()
  })

  it('getJobAsync ritrova i job in memoria senza Supabase', async () => {
    const job = createJob('VID12345678')
    await expect(getJobAsync(job.job_id)).resolves.toBe(job)
    await expect(getJobAsync('sconosciuto')).resolves.toBeUndefined()
  })
})
