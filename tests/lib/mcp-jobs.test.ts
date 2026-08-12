import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createJob, getJob, completeJob, failJob, processJob } from '@/lib/mcp-jobs'

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('mcp-jobs', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('job lifecycle', () => {
    it('creates a processing job with a generated id', () => {
      const job = createJob('abc123def45')
      expect(job.job_id).toBeTruthy()
      expect(job.video_id).toBe('abc123def45')
      expect(job.status).toBe('processing')
      expect(job.created_at).toBeTypeOf('number')
    })

    it('stores the job and retrieves it by id', () => {
      const job = createJob('vid12345678')
      expect(getJob(job.job_id)).toEqual(job)
    })

    it('returns undefined for unknown job ids', () => {
      expect(getJob('does-not-exist')).toBeUndefined()
    })

    it('marks a job as completed with a result', () => {
      const job = createJob('vid12345678')
      const result = {
        title: 'Test video',
        channel: 'Test channel',
        transcript: [{ text: 'ciao', start: 0, duration: 2 }],
        text: 'ciao',
        language: 'it',
      }
      completeJob(job.job_id, result)
      const updated = getJob(job.job_id)!
      expect(updated.status).toBe('completed')
      expect(updated.result).toEqual(result)
    })

    it('marks a job as failed with an error', () => {
      const job = createJob('vid12345678')
      failJob(job.job_id, 'no_transcript')
      const updated = getJob(job.job_id)!
      expect(updated.status).toBe('failed')
      expect(updated.error).toBe('no_transcript')
    })

    it('ignores complete/fail for unknown jobs', () => {
      expect(() => completeJob('nope', { title: 'x', channel: 'y', transcript: [], text: '', language: 'it' })).not.toThrow()
      expect(() => failJob('nope', 'boom')).not.toThrow()
    })
  })

  describe('processJob', () => {
    it('completes a job when transcript and video details are available', async () => {
      fetchMock.mockImplementation((url: string) => {
        if (url.startsWith('https://www.googleapis.com/youtube/v3/videos')) {
          return Promise.resolve(
            jsonResponse({
              items: [{ snippet: { title: 'Il video', channelTitle: 'Il canale' } }],
            }),
          )
        }
        if (url.startsWith('https://youtube.com/api/timedtext')) {
          return Promise.resolve(
            jsonResponse({
              events: [
                { tStartMs: 0, dDurationMs: 2000, segs: [{ utf8: 'Ciao ' }, { utf8: 'mondo' }] },
                { tStartMs: 2000, dDurationMs: 1000, segs: [{ utf8: 'bello' }] },
              ],
            }),
          )
        }
        return Promise.resolve(jsonResponse({}, false, 404))
      })

      const job = createJob('https://www.youtube.com/watch?v=abc123def45')
      await processJob(job)

      const updated = getJob(job.job_id)!
      expect(updated.status).toBe('completed')
      expect(updated.result!.title).toBe('Il video')
      expect(updated.result!.channel).toBe('Il canale')
      expect(updated.result!.language).toBe('it')
      expect(updated.result!.text).toBe('Ciao  mondo bello')
      expect(updated.result!.transcript).toHaveLength(2)
      expect(updated.result!.transcript[0].start).toBe(0)
      expect(updated.result!.transcript[0].duration).toBe(2)
    })

    it('falls back to english captions when italian is unavailable', async () => {
      fetchMock.mockImplementation((url: string) => {
        if (url.startsWith('https://youtube.com/api/timedtext')) {
          const lang = new URL(url).searchParams.get('lang')
          if (lang === 'it') {
            return Promise.resolve(jsonResponse({ events: [] }))
          }
          return Promise.resolve(
            jsonResponse({ events: [{ tStartMs: 1000, segs: [{ utf8: 'Hello' }] }] }),
          )
        }
        return Promise.resolve(jsonResponse({ items: [] }))
      })

      const job = createJob('abc123def45')
      await processJob(job)

      const updated = getJob(job.job_id)!
      expect(updated.status).toBe('completed')
      expect(updated.result!.language).toBe('en')
      expect(updated.result!.text).toBe('Hello')
    })

    it('fails the job when there is no transcript', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(jsonResponse({ events: [] })),
      )

      const job = createJob('abc123def45')
      await processJob(job)

      const updated = getJob(job.job_id)!
      expect(updated.status).toBe('failed')
      expect(updated.error).toContain('no_transcript')
    })

    it('fails the job when the network throws', async () => {
      fetchMock.mockRejectedValue(new Error('network down'))
      const job = createJob('abc123def45')
      await processJob(job)
      const updated = getJob(job.job_id)!
      expect(updated.status).toBe('failed')
      expect(updated.error).toContain('no_transcript')
    })
  })
})
