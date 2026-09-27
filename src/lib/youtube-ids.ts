/**
 * Helper puri per gli ID YouTube (senza dipendenze server).
 *
 * Vive in un modulo separato da `@/lib/youtube` così può essere importato
 * anche dai componenti client (chat, Transcription) senza trascinare nel
 * bundle il pacchetto `youtube-transcript` (solo server).
 */

/** Estrae l'ID video (11 char) da URL YouTube o stringa grezza. */
export function extractYouTubeVideoId(input: string): string | null {
  if (!input) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1].length === 11) return match[1];
  }
  return null;
}

/** Converte una durata ISO 8601 (`PT1H2M3S`) in secondi. */
export function parseISODuration(iso: string): number {
  if (!iso) return 0;
  const match = iso.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] || '0', 10) || 0;
  const m = parseInt(match[2] || '0', 10) || 0;
  const s = parseInt(match[3] || '0', 10) || 0;
  return h * 3600 + m * 60 + s;
}

export type YouTubeChannelRef =
  | { type: 'handle'; value: string }
  | { type: 'id'; value: string };

/**
 * Estrae il riferimento al canale da un URL (`/@handle`, `/channel/ID`,
 * `/user/nome`, `/c/nome`).
 */
export function extractYouTubeChannelRef(url: string): YouTubeChannelRef | null {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/@([a-zA-Z0-9_-]+)/,
    /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        type: pattern.source.includes('@') ? 'handle' : 'id',
        value: match[1],
      };
    }
  }
  return null;
}

/** Estrae l'ID playlist (`?list=...`) da un URL. */
export function extractYouTubePlaylistId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}
