/**
 * Store in-memory per il tracciamento delle richieste per IP.
 * Mappa l'indirizzo IP a un array di timestamp delle richieste effettuate.
 */
const rateLimitStore = new Map<string, { timestamps: number[] }>();

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
  const record = rateLimitStore.get(ip);
  if (!record) return;

  const validTimestamps = record.timestamps.filter(
    (ts) => now - ts < WINDOW_MS
  );

  if (validTimestamps.length === 0) {
    rateLimitStore.delete(ip);
  } else {
    record.timestamps = validTimestamps;
  }
}

/**
 * Verifica se un IP ha superato il limite di richieste consentite.
 * Implementa un algoritmo di "sliding window" semplice per il controllo del traffico.
 *
 * @param ip L'indirizzo IP del client da controllare.
 * @returns Un oggetto contenente l'esito (success), le richieste rimanenti (remaining) e l'eventuale tempo di reset.
 */
export function rateLimit(ip: string) {
  const now = Date.now();

  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, { timestamps: [now] });
    return { success: true, remaining: MAX_REQUESTS - 1 };
  }

  cleanupOldEntries(ip);

  const record = rateLimitStore.get(ip);
  if (!record || !record.timestamps || record.timestamps.length === 0) {
    rateLimitStore.set(ip, { timestamps: [now] });
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
