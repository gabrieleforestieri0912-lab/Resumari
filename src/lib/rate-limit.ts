/**
 * Rate limit con doppio backend: Supabase (`rate_limits`) quando disponibile,
 * Map in-memory come fallback (dev / tabella mancante / single-instance).
 *
 * Perché: su Vercel ogni istanza serverless ha la propria memoria, quindi il
 * vecchio store solo in-memory non limitava davvero. La tabella condivisa
 * rende il limite globale; il fallback evita di rompere il flusso se la
 * migration non è stata applicata.
 */

type RateLimitResult = { success: boolean; remaining: number; resetTime?: number }

// Fallback in-memory (stessa semantica sliding-window del DB)
const memoryStore = new Map<string, { timestamps: number[] }>();

// Finestra temporale per il limite di velocità (60 secondi)
const WINDOW_MS = 60 * 1000;
// Massimo numero di richieste consentite all'interno della finestra temporale
const MAX_REQUESTS = 50;

/**
 * Rimuove i timestamp obsoleti che sono fuori dalla finestra temporale corrente per un dato IP.
 * Questo evita che la memoria cresca indefinitamente.
 */
function cleanupOldEntries(ip: string) {
  const now = Date.now();
  const record = memoryStore.get(ip);
  if (!record) return;

  const validTimestamps = record.timestamps.filter(
    (ts) => now - ts < WINDOW_MS
  );

  if (validTimestamps.length === 0) {
    memoryStore.delete(ip);
  } else {
    record.timestamps = validTimestamps;
  }
}

function memoryRateLimit(ip: string): RateLimitResult {
  const now = Date.now();

  if (!memoryStore.has(ip)) {
    memoryStore.set(ip, { timestamps: [now] });
    return { success: true, remaining: MAX_REQUESTS - 1 };
  }

  cleanupOldEntries(ip);

  const record = memoryStore.get(ip);
  if (!record || !record.timestamps || record.timestamps.length === 0) {
    memoryStore.set(ip, { timestamps: [now] });
    return { success: true, remaining: MAX_REQUESTS - 1 };
  }

  const timeSinceFirstRequest = now - record.timestamps[0];

  // Se siamo all'interno della finestra e abbiamo raggiunto il limite, neghiamo la richiesta
  if (timeSinceFirstRequest < WINDOW_MS && record.timestamps.length >= MAX_REQUESTS) {
    return {
      success: false,
      remaining: 0,
      resetTime: record.timestamps[0] + WINDOW_MS
    };
  }

  record.timestamps.push(now);

  return {
    success: true,
    remaining: MAX_REQUESTS - record.timestamps.length
  };
}

/**
 * Tenta il rate limit su Supabase (condiviso tra istanze). Ritorna `null`
 * quando il DB non è raggiungibile o la tabella manca → il caller usa il
 * fallback in-memory invece di bloccare la richiesta.
 */
async function supabaseRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult | null> {
  try {
    const { getServiceClient } = await import('./supabase');
    const client = getServiceClient();
    const now = Date.now();
    const windowStart = new Date(now - windowMs).toISOString();

    // Prune best-effort (fire-and-forget, nessuna attesa).
    void client.from('rate_limits').delete().lt('created_at', windowStart).then(
      () => {},
      () => {},
    );

    const { count } = await client
      .from('rate_limits')
      .select('id', { count: 'exact', head: true })
      .eq('key', key)
      .gte('created_at', windowStart);

    const used = count || 0;
    if (used >= maxRequests) {
      const { data } = await client
        .from('rate_limits')
        .select('created_at')
        .eq('key', key)
        .gte('created_at', windowStart)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      return {
        success: false,
        remaining: 0,
        resetTime: data ? new Date(data.created_at).getTime() + windowMs : now + windowMs,
      };
    }

    const { error } = await client.from('rate_limits').insert({ key });
    if (error) return null; // tabella mancante? fallback memoria
    return { success: true, remaining: maxRequests - used - 1 };
  } catch {
    return null;
  }
}

/**
 * Verifica se un IP ha superato il limite di richieste consentite.
 * Sliding window condivisa via Supabase con fallback in-memory.
 *
 * Resta SINCRONA per compatibilità con i caller esistenti (auth, demo):
 * usa il fallback memoria. Per il check globale cross-istanza usare
 * `rateLimitAsync()`.
 *
 * @param ip L'indirizzo IP del client da controllare.
 */
export function rateLimit(ip: string): RateLimitResult {
  return memoryRateLimit(ip);
}

/**
 * Variante async: prova prima Supabase (globale), poi memoria.
 * Da preferire nelle route nuove o ad alto rischio (login, send-code).
 */
export async function rateLimitAsync(ip: string): Promise<RateLimitResult> {
  return (
    (await supabaseRateLimit(`ip:${ip}`, MAX_REQUESTS, WINDOW_MS)) ||
    memoryRateLimit(ip)
  );
}

/**
 * Estrae l'indirizzo IP del client dagli header della richiesta HTTP.
 * Gestisce proxy e load balancer comuni (come x-forwarded-for).
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0] ||
    headers.get('x-real-ip') ||
    'unknown'
  );
}
