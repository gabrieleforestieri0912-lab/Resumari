import { YoutubeTranscript } from "youtube-transcript";
import {
  extractYouTubeVideoId,
  parseISODuration,
  extractYouTubeChannelRef,
  extractYouTubePlaylistId,
} from "./youtube-ids";

// Re-export degli helper puri (ID/playlist/durate) così le route importano
// tutto da un solo modulo server. Gli alias legacy evitano di riscrivere i
// nomi usati nelle route esistenti.
export {
  extractYouTubeVideoId,
  parseISODuration,
  extractYouTubeChannelRef,
  extractYouTubePlaylistId,
};
export const getYouTubeVideoId = extractYouTubeVideoId;
export const parseDuration = parseISODuration;
export const getYouTubeChannelId = extractYouTubeChannelRef;
export const getYouTubePlaylistId = extractYouTubePlaylistId;

/**
 * YouTube transcript fetching with layered fallbacks.
 *
 * Layer 1 — direct `youtube.com/api/timedtext` (works when captions are
 *   publicly reachable without a signature).
 * Layer 2 — the `youtube-transcript` package, which handles the modern
 *   InnerTube/PO-token dance internally (it → en → any available language).
 * Layer 3 — kome.ai public endpoint (returns plain text, no timestamps:
 *   segment times are estimated from the word count).
 *
 * Every layer must fail before the function reports "no transcript", so a
 * video with captions almost always comes back with a real transcript.
 */

export interface TranscriptSegment {
  text: string;
  time: number;
  duration: number;
}

export interface TranscriptResult {
  transcript: TranscriptSegment[];
  language: string;
}

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
  Referer: "https://www.youtube.com/",
  Origin: "https://www.youtube.com",
};

/** Parse the json3 payload returned by youtube.com/api/timedtext. */
export function parseTimedTextJson(
  data: { events?: Array<{ tStartMs?: number; dDurationMs?: number; segs?: Array<{ utf8?: string }> }> },
): TranscriptSegment[] {
  if (!data?.events) return [];
  return data.events
    .filter((e) => e.segs)
    .map((e) => ({
      // trim each seg: YouTube segs sometimes carry leading spaces, and
      // joining them without trimming would produce double spaces.
      text: e.segs!.map((s) => (s.utf8 || "").trim()).join(" "),
      time: (e.tStartMs || 0) / 1000,
      duration: (e.dDurationMs || 0) / 1000,
    }))
    .filter((s) => s.text.trim().length > 0);
}

/**
 * kome.ai returns a plain text transcript without timestamps: split it into
 * lines and estimate each segment's start from an average speaking rate.
 */
export function parseKomeTranscript(text: string): TranscriptSegment[] {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const WORDS_PER_SECOND = 150 / 60;
  let cursor = 0;
  return lines.map((line) => {
    const words = line.split(/\s+/).filter(Boolean).length;
    const duration = Math.max(1, words / WORDS_PER_SECOND);
    const segment = { text: line, time: cursor, duration };
    cursor += duration;
    return segment;
  });
}

async function getTranscriptTimedText(
  videoId: string,
  signal: AbortSignal,
): Promise<TranscriptResult | null> {
  for (const lang of ["it", "en"]) {
    try {
      const url = `https://youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`;
      const response = await fetch(url, { headers: BROWSER_HEADERS, signal });
      if (!response.ok) continue;
      const data = await response.json();
      const transcript = parseTimedTextJson(data);
      if (transcript.length > 0) {
        return { transcript, language: lang };
      }
    } catch {
      // aborted by the caller, or the layer failed: try the next one
      if (signal.aborted) return null;
    }
  }
  return null;
}

async function getTranscriptViaPackage(
  videoId: string,
  signal: AbortSignal,
): Promise<TranscriptResult | null> {
  // The package accepts a custom fetch function: forward the shared abort
  // signal so a hung YouTube request cannot blow the whole request budget.
  const fetchFn: typeof globalThis.fetch = (input, init) =>
    fetch(input, { ...init, signal });

  // it → en → whatever language is available. The package throws when the
  // requested language is missing, so each attempt must be isolated.
  for (const lang of ["it", "en", undefined]) {
    try {
      const list = await YoutubeTranscript.fetchTranscript(videoId, {
        ...(lang ? { lang } : {}),
        fetch: fetchFn,
      });
      if (list && list.length > 0) {
        return {
          transcript: list.map((s) => ({
            text: s.text || "",
            time: (s.offset || 0) / 1000,
            duration: (s.duration || 0) / 1000,
          })),
          language: list[0].lang || "en",
        };
      }
    } catch {
      if (signal.aborted) return null;
    }
  }
  return null;
}

async function getTranscriptFromKome(
  videoId: string,
  signal: AbortSignal,
): Promise<TranscriptResult | null> {
  try {
    const response = await fetch("https://kome.ai/api/transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_id: videoId, format: true }),
      signal,
    });
    if (!response.ok) return null;
    const data = await response.json();
    const text = data?.transcript;
    if (typeof text !== "string" || !text.trim()) return null;
    return { transcript: parseKomeTranscript(text), language: "en" };
  } catch {
    return null;
  }
}

export interface VideoDetails {
  title: string;
  description: string;
  channelTitle: string;
  channelId?: string;
  thumbnail?: string | null;
  viewCount?: string;
  likeCount?: string;
  publishedAt?: string;
  durationSec?: number;
}

function getYouTubeApiKey(): string {
  return process.env.YOUTUBE_API_KEY || "";
}

/**
 * Dettagli di un video tramite YouTube Data API v3. La chiave viene letta
 * a ogni chiamata (non a import-time) così un cambio env non richiede fix.
 * Ritorna `null` se la chiave manca o il video non esiste.
 */
export async function getVideoDetails(videoId: string): Promise<VideoDetails | null> {
  const apiKey = getYouTubeApiKey();
  if (!apiKey) return null;
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails,statistics`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const item = data?.items?.[0];
    if (!item) return null;
    return {
      title: item.snippet.title,
      description: item.snippet.description,
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      thumbnail: item.snippet.thumbnails?.high?.url,
      viewCount: item.statistics?.viewCount || "0",
      likeCount: item.statistics?.likeCount || "0",
      publishedAt: item.snippet.publishedAt,
      durationSec: parseISODuration(item.contentDetails?.duration || "PT0S"),
    };
  } catch (error) {
    console.error("Error fetching video details:", error);
    return null;
  }
}

/**
 * Risolve un handle/canale in channelId. Accetta URL completi o handle grezzi.
 */
export async function resolveChannelId(channelUrlOrHandle: string): Promise<string | null> {
  const apiKey = getYouTubeApiKey();
  if (!apiKey || !channelUrlOrHandle) return null;
  const ref = extractYouTubeChannelRef(channelUrlOrHandle);
  if (ref?.type === "id") return ref.value;
  const query = ref?.type === "handle" ? ref.value : channelUrlOrHandle.replace(/^@/, "");
  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&key=${apiKey}&maxResults=1`;
    const res = await fetch(searchUrl);
    const data = await res.json();
    return data?.items?.[0]?.id?.channelId || null;
  } catch {
    return null;
  }
}

export interface ChannelVideosResult {
  channelId: string;
  channelTitle: string;
  channelThumbnail: string | null;
  channelDescription: string;
  uploadsPlaylistId: string;
  videos: Array<{ videoId: string; title: string; publishedAt: string }>;
}

/**
 * Canale + ultimi video (via playlist uploads). Centralizza la logica oggi
 * duplicata in `/api/channel-videos`, `/api/channel-info` e bulk transcript.
 */
export async function fetchChannelVideos(
  channelUrlOrHandle: string,
  maxVideos = 50,
): Promise<ChannelVideosResult | null> {
  const apiKey = getYouTubeApiKey();
  if (!apiKey) return null;
  const channelId = await resolveChannelId(channelUrlOrHandle);
  if (!channelId) return null;

  const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${channelId}&key=${apiKey}`;
  const channelRes = await fetch(channelUrl);
  const channelData = await channelRes.json();
  const channel = channelData?.items?.[0];
  if (!channel) return null;

  const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;
  const videos: ChannelVideosResult["videos"] = [];
  let nextPageToken = "";
  do {
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50&pageToken=${nextPageToken}&key=${apiKey}`;
    const playlistRes = await fetch(playlistUrl);
    const playlistData = await playlistRes.json();
    if (!playlistData?.items) break;
    for (const item of playlistData.items) {
      const vid = item?.snippet?.resourceId?.videoId;
      if (vid) videos.push({ videoId: vid, title: item.snippet.title, publishedAt: item.snippet.publishedAt });
      if (videos.length >= maxVideos) break;
    }
    nextPageToken = playlistData.nextPageToken || "";
  } while (nextPageToken && videos.length < maxVideos);

  return {
    channelId,
    channelTitle: channel.snippet.title,
    channelThumbnail:
      channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.default?.url || null,
    channelDescription: channel.snippet.description || "",
    uploadsPlaylistId,
    videos: videos.slice(0, maxVideos),
  };
}

export interface PlaylistVideosResult {
  playlistId: string;
  playlistTitle: string;
  videos: Array<{ videoId: string; title: string }>;
}

/** Video di una playlist pubblica (fino a `maxVideos`, paginati a 50). */
export async function fetchPlaylistVideos(
  playlistUrlOrId: string,
  maxVideos = 50,
): Promise<PlaylistVideosResult | null> {
  const apiKey = getYouTubeApiKey();
  if (!apiKey) return null;
  const playlistId = extractYouTubePlaylistId(playlistUrlOrId) || playlistUrlOrId;
  if (!playlistId) return null;

  const videos: PlaylistVideosResult["videos"] = [];
  let playlistTitle = "";
  let nextPageToken = "";
  do {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&pageToken=${nextPageToken}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data?.items) break;
    playlistTitle = playlistTitle || data.items[0]?.snippet?.title || "";
    for (const item of data.items) {
      const vid = item?.snippet?.resourceId?.videoId;
      if (vid) videos.push({ videoId: vid, title: item.snippet.title });
      if (videos.length >= maxVideos) break;
    }
    nextPageToken = data.nextPageToken || "";
  } while (nextPageToken && videos.length < maxVideos);

  if (videos.length === 0) return null;
  return { playlistId, playlistTitle, videos: videos.slice(0, maxVideos) };
}

/**
 * Fetch a video transcript through every available layer.
 *
 * Order matters: the direct timedtext layer is kept first because it is cheap
 * and works from some networks/regions; the package layer handles the modern
 * PO-token dance; kome.ai is the last-resort plain-text source. The whole
 * chain shares a timeout so a hanging YouTube request cannot exceed the
 * serverless budget (default 25s).
 */
export async function fetchTranscriptForVideo(
  videoId: string,
  timeoutMs = 25_000,
): Promise<TranscriptResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return (
      (await getTranscriptTimedText(videoId, controller.signal)) ||
      (await getTranscriptViaPackage(videoId, controller.signal)) ||
      (await getTranscriptFromKome(videoId, controller.signal))
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Cache in memoria di trascrizione + dettagli per video, con TTL.
 *
 * Senza, ogni messaggio di una chat riscattrica da YouTube la trascrizione
 * del video attivo: su un video da 40 minuti sono secondi di attesa *prima*
 * ancora di iniziare a generare la risposta. Il contenuto di un video non
 * cambia, quindi pochi minuti di cache tolgono quel costo da ogni turno.
 */
const VIDEO_CONTEXT_TTL_MS = 10 * 60 * 1000;
const VIDEO_CONTEXT_MAX = 20;
const videoContextCache = new Map<string, { expires: number; value: VideoContext }>();

export type VideoContext = {
  transcript: TranscriptResult | null;
  details: VideoDetails | null;
};

/** Svuota la cache (test e cambi di contenuto forzati). */
export function clearVideoContextCache(): void {
  videoContextCache.clear();
}

/** Trascrizione + dettagli di un video, con cache breve per non rifarli a ogni turno. */
export async function getVideoContext(videoId: string): Promise<VideoContext> {
  const cached = videoContextCache.get(videoId);
  if (cached && cached.expires > Date.now()) {
    // Riordina: il più usato di recente resta in fondo alla mappa.
    videoContextCache.delete(videoId);
    videoContextCache.set(videoId, cached);
    return cached.value;
  }

  const [transcript, details] = await Promise.all([
    fetchTranscriptForVideo(videoId),
    getVideoDetails(videoId),
  ]);
  const value: VideoContext = { transcript, details };

  videoContextCache.set(videoId, { expires: Date.now() + VIDEO_CONTEXT_TTL_MS, value });
  while (videoContextCache.size > VIDEO_CONTEXT_MAX) {
    const oldest = videoContextCache.keys().next().value;
    if (oldest === undefined) break;
    videoContextCache.delete(oldest);
  }
  return value;
}
