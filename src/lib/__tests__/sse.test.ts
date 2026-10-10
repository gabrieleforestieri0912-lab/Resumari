import { describe, it, expect } from 'vitest'
import { createSseStream, readSseStream, type SseEvent } from '@/lib/sse'

/** Costruisce uno stream SSE a partire dai frame, senza passare dalla rete. */
function fakeSse(frames: string[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      for (const frame of frames) c.enqueue(encoder.encode(frame))
      c.close()
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
}

describe('createSseStream', () => {
  it('scrive i frame nel formato atteso dal client', async () => {
    const res = createSseStream(async ({ send, close }) => {
      send('delta', { text: 'ciao' })
      send('done', { response: 'ciao' })
      close()
    })

    expect(res.headers.get('Content-Type')).toMatch(/text\/event-stream/)
    const events: SseEvent[] = []
    await readSseStream(res, (e) => events.push(e))
    expect(events).toEqual([
      { event: 'delta', data: { text: 'ciao' } },
      { event: 'done', data: { response: 'ciao' } },
    ])
  })

  it('chiude lo stream anche se il gestore fallisce', async () => {
    const res = createSseStream(async () => {
      throw new Error('boom')
    })
    const events: SseEvent[] = []
    await expect(readSseStream(res, (e) => events.push(e))).resolves.toBeUndefined()
    expect(events).toEqual([])
  })
})

describe('readSseStream', () => {
  it('ricostruisce i frame spezzati fra più chunk', async () => {
    const events: SseEvent[] = []
    await readSseStream(fakeSse(['event: delta\ndata: {"te', 'xt":"a"}\n\nevent: delta\ndata: {"text":"b"}\n\n']), (e) =>
      events.push(e),
    )
    expect(events).toEqual([
      { event: 'delta', data: { text: 'a' } },
      { event: 'delta', data: { text: 'b' } },
    ])
  })

  it('ignora i commenti keep-alive', async () => {
    const events: SseEvent[] = []
    await readSseStream(fakeSse([': keep-alive\n\ndata: {"ok":true}\n\n']), (e) => events.push(e))
    expect(events).toEqual([{ event: 'message', data: { ok: true } }])
  })

  it('recupera anche l’ultimo frame senza terminatore', async () => {
    const events: SseEvent[] = []
    await readSseStream(fakeSse(['event: done\ndata: {"response":"x"}']), (e) => events.push(e))
    expect(events).toEqual([{ event: 'done', data: { response: 'x' } }])
  })
})
