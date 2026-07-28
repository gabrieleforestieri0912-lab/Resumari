const rateLimitStore = new Map<string, { timestamps: number[] }>();

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 50;

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

export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0] ||
    headers.get('x-real-ip') ||
    'unknown'
  );
}
