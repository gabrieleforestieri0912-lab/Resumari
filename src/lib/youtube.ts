import { YoutubeTranscript } from "youtube-transcript";

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
