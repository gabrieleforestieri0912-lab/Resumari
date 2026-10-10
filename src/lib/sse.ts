/**
 * Server-Sent Events minimale, senza dipendenze.
 *
 * Le API AI inviano la risposta token per token: senza streaming l'utente
 * aspetta la risposta intera e poi la vede comparire tutta insieme. Con SSE il
 * primo pezzo di testo arriva in meno di un secondo e il resto scorre mentre
 * viene generato.
 *
 * Formato dei frame (identico a quello che il client legge):
 *   event: delta
 *   data: {"text":"..."}
 *
 * Righe che iniziano con `:` sono commenti (keep-alive) e vengono ignorate.
 * Modulo senza import server-only: contiene anche il parser lato client.
 */

export type SseSender = {
  /** Invia un frame. No-op dopo `close()` o se il client ha abbandonato. */
  send: (event: string, data: unknown) => void;
  /** Chiude lo stream. Idempotente. */
  close: () => void;
};

export function createSseStream(run: (s: SseSender) => Promise<void>): Response {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel() {
      // Il client ha chiuso la connessione: niente più enqueue.
      closed = true;
      controller = null;
    },
  });

  const sender: SseSender = {
    send(event, data) {
      if (closed || !controller) return;
      try {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      } catch {
        closed = true;
        controller = null;
      }
    },
    close() {
      if (closed || !controller) return;
      closed = true;
      try {
        controller.close();
      } catch {
        /* già chiuso */
      }
      controller = null;
    },
  };

  // `run` gestisce i propri errori (frame `error`): qui si chiude e basta.
  void Promise.resolve()
    .then(() => run(sender))
    .catch(() => sender.close());

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Nginx/Vercel possono bufferizzare: senza questo gli eventi arrivano
      // tutti insieme alla fine e lo streaming non serve a nulla.
      'X-Accel-Buffering': 'no',
    },
  });
}

export type SseEvent = { event: string; data: unknown };

/**
 * Legge uno stream SSE dalla `Response` e invoca `onEvent` per ogni frame.
 * Funziona sia in Node (test) sia nel browser.
 */
export async function readSseStream(
  response: Response,
  onEvent: (event: SseEvent) => void,
): Promise<void> {
  const body = response.body;
  if (!body) return;

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let split = buffer.indexOf('\n\n');
      while (split !== -1) {
        const frame = buffer.slice(0, split);
        buffer = buffer.slice(split + 2);
        const parsed = parseSseFrame(frame);
        if (parsed) onEvent(parsed);
        split = buffer.indexOf('\n\n');
      }
    }
    // Ultimo frame senza terminatore finale.
    const tail = parseSseFrame(buffer);
    if (tail) onEvent(tail);
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* reader già liberato */
    }
  }
}

function parseSseFrame(frame: string): SseEvent | null {
  let event = 'message';
  const data: string[] = [];
  let hasData = false;

  for (const line of frame.split('\n')) {
    if (!line || line.startsWith(':')) continue;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') event = value;
    else if (field === 'data') {
      data.push(value);
      hasData = true;
    }
  }

  if (!hasData) return null;
  const raw = data.join('\n');
  try {
    return { event, data: JSON.parse(raw) };
  } catch {
    return { event, data: raw };
  }
}
