/**
 * Allineamento dei timestamp citati dall'AI alla trascrizione reale.
 *
 * Il modello riceve la trascrizione senza tempi (`s.text` concatenate) e
 * quindi ogni `[MM:SS Titolo]` che produce è inventato: cliccando si finisce
 * in un punto del video che non parla di quel contenuto.
 *
 * Qui i timestamp vengono ricalcolati dal testo della frase rispetto ai
 * segmenti reali della trascrizione. Regola: si mostra solo ciò che si può
 * verificare. Un timestamp che non trova riscontro viene rimosso, così nel
 * messaggio non c'è mai un link che porta al posto sbagliato.
 *
 * Modulo senza import server-only: usato sia dai route sia dai client.
 */

export type TimedSegment = {
  text: string;
  /** Secondi dall'inizio del video. */
  time: number;
  duration?: number;
};

/** `M:SS` oppure `H:MM:SS` oltre un'ora. */
export function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Converte `MM:SS` / `HH:MM:SS` in secondi. Restituisce `null` se invalido. */
export function parseTimeToSeconds(value: string): number | null {
  const m = value.trim().match(/^(\d{1,3}):([0-5]?\d)(?::([0-5]?\d))?$/);
  if (!m) return null;
  if (m[3] !== undefined) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  return Number(m[1]) * 60 + Number(m[2]);
}

// Parole funzionali: non portano informazione sul contenuto del segmento.
const STOPWORDS = new Set(
  (
    "a ad al allo ai all agl alla alle allo agli all agl con col coi da dal dallo dai dagl dagli dall dagl di del dello dei degli dell degl della delle dello " +
    "degli dell degl della delle in nel nello nei negli nell negl nella nelle nello in sul sullo sui sugli sull sugl sulla sulle sul sullo " +
    "tra e ed o ma che chi cui non per po piu quale quanto quanti quanta quante come dove quando perche perché cosa cosa' cosa’ " +
    "io tu lui lei noi voi loro mio mia miei mie tuo tua tuoi tue suo sua suoi sue nostro nostra nostri nostre vostro vostra " +
    "ecco già già' gia quindi allora cosi così se gli ne le ci vi si ne ho ha hai hanno aveva avevano ho fare faccio facciamo " +
    "the a an of to in on for and or but is are was were be been being it its this that these those with as at by from " +
    "you your we our they their he she his her i me my not no so if then than there here what which who whom how why when"
  ).split(/\s+/),
);

/** Minuscole, senza accenti, solo lettere/cifre: "Perché" → "perche". */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Token significanti di un testo (stopword e token < 3 caratteri esclusi). */
export function tokenize(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

type Window = {
  /** Secondi di inizio della finestra. */
  start: number;
  /** Token presenti nella finestra con il loro peso. */
  counts: Map<string, number>;
};

export type TranscriptIndex = {
  segments: TimedSegment[];
  windows: Window[];
  /** idf di ogni token: i termini rari contano più di quelli comuni. */
  idf: Map<string, number>;
  /** Token indicizzati per segmento, per il raffinamento finale. */
  segmentTokens: string[][];
};

/**
 * Durata della finestra di ricerca. 45s ≈ un paragrafo di parlato: abbastanza
 * larga da non spezzare il contesto, stretta da non mescolare due argomenti.
 */
const WINDOW_SECONDS = 45;
const WINDOW_STEP_SECONDS = 15;
/**
 * Due finestre sono considerate "zone diverse" della trascrizione solo se
 * distano almeno questo valore. Le finestre da 45s si sovrappongono e lo stesso
 * argomento occupa spesso un minuto o più di parlato: senza questo margine il
 * controllo di ambiguità scambierebbe la finestra vicina per un'altra sezione.
 */
const DISTINCT_REGION_SECONDS = 120;

/** Costruisce l'indice di ricerca su una trascrizione con tempi. */
export function buildTranscriptIndex(segments: TimedSegment[]): TranscriptIndex {
  const ordered = [...(segments || [])]
    .filter((s) => s && typeof s.text === "string" && Number.isFinite(s.time))
    .sort((a, b) => a.time - b.time);

  const segmentTokens = ordered.map((s) => tokenize(s.text));
  const windows: Window[] = [];

  if (ordered.length > 0) {
    const totalTime = Math.max(
      ordered[ordered.length - 1].time + (ordered[ordered.length - 1].duration || 0),
      ordered[ordered.length - 1].time + 1,
    );
    for (let start = 0; start < Math.max(totalTime, WINDOW_SECONDS); start += WINDOW_STEP_SECONDS) {
      const end = start + WINDOW_SECONDS;
      const counts = new Map<string, number>();
      for (let i = 0; i < ordered.length; i++) {
        const t = ordered[i].time;
        if (t < start) continue;
        if (t >= end) break;
        for (const token of segmentTokens[i]) counts.set(token, (counts.get(token) || 0) + 1);
      }
      if (counts.size > 0) windows.push({ start, counts });
    }
  }

  // idf sui documenti-finestra: un termine che compare in quasi tutte le
  // finestre (es. "video", "today") non serve a distinguere nulla.
  const df = new Map<string, number>();
  for (const w of windows) {
    for (const token of w.counts.keys()) df.set(token, (df.get(token) || 0) + 1);
  }
  const total = Math.max(1, windows.length);
  const idf = new Map<string, number>();
  for (const [token, count] of df) idf.set(token, Math.log(1 + total / count));

  return { segments: ordered, windows, idf, segmentTokens };
}

function weightOf(index: TranscriptIndex, token: string): number {
  return index.idf.get(token) || 1;
}

/** Copertura ponderata di `tokens` dentro una finestra (0..1). */
function windowScore(index: TranscriptIndex, tokens: string[], counts: Map<string, number>): number {
  if (tokens.length === 0) return 0;
  let hit = 0;
  let total = 0;
  const unique = new Set(tokens);
  for (const token of unique) {
    const w = weightOf(index, token);
    total += w;
    if (counts.has(token)) hit += w;
  }
  return total > 0 ? hit / total : 0;
}

/**
 * Secondo esatto (inizio del segmento) più pertinente per un testo.
 *
 * Prima individua la finestra migliore, poi dentro la finestra scorre i
 * segmenti e sceglie quello in cui la copertura dei termini è più alta: il
 * risultato è il punto in cui l'agente inizia davvero a parlare di quel tema.
 */
export function alignToTranscript(
  index: TranscriptIndex,
  text: string,
  options: { minScore?: number; minMargin?: number } = {},
): { seconds: number; score: number } | null {
  const tokens = tokenize(text);
  if (tokens.length < 2 || index.windows.length === 0) return null;

  const minScore = options.minScore ?? 0.22;
  const minMargin = options.minMargin ?? 1.15;

  let best = { window: -1, score: 0 };
  for (let i = 0; i < index.windows.length; i++) {
    const score = windowScore(index, tokens, index.windows[i].counts);
    if (score > best.score) best = { window: i, score };
  }

  if (best.window < 0 || best.score < minScore) return null;

  // Le finestre si sovrappongono: quella successiva contiene quasi gli stessi
  // segmenti e ha di conseguenza lo stesso punteggio. Il confronto con il
  // "secondo classificato" vale solo con zone distanti della trascrizione:
  // altrimenti ogni frase it'd 45 secondi e il controllo non servirebbe a nulla.
  let second = 0;
  for (let i = 0; i < index.windows.length; i++) {
    if (i === best.window) continue;
    if (Math.abs(index.windows[i].start - index.windows[best.window].start) < DISTINCT_REGION_SECONDS) continue;
    const score = windowScore(index, tokens, index.windows[i].counts);
    if (score > second) second = score;
  }
  // Due zone del video plausibili allo stesso modo: meglio nessun timestamp
  // che uno casuale fra i due.
  if (second > 0 && best.score < second * minMargin) return null;

  const target = uniqueWeighted(index, tokens);
  const start = index.windows[best.window].start;
  const startIdx = firstSegmentIndexAtOrAfter(index, start);

  // Dentro la finestra: allineamento cumulativo, si sceglie l'inizio che
  // copre meglio i termini cercati (il resto è rumore di contesto).
  let bestSeconds = index.segments[startIdx]?.time ?? start;
  let bestCoverage = -1;
  const maxSpan = Math.min(index.segments.length, startIdx + 60);
  const seen = new Set<string>();
  for (let i = startIdx; i < maxSpan; i++) {
    for (const token of index.segmentTokens[i]) seen.add(token);
    if (i - startIdx > 3 && seen.size >= target.size) break;
    let hit = 0;
    let total = 0;
    for (const token of target.keys()) {
      const w = target.get(token)!;
      total += w;
      if (seen.has(token)) hit += w;
    }
    const coverage = total > 0 ? hit / total : 0;
    if (coverage > bestCoverage) {
      bestCoverage = coverage;
      bestSeconds = index.segments[i].time;
    }
  }

  return { seconds: Math.max(0, Math.round(bestSeconds)), score: best.score };
}

function uniqueWeighted(index: TranscriptIndex, tokens: string[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const token of new Set(tokens)) out.set(token, weightOf(index, token));
  return out;
}

function firstSegmentIndexAtOrAfter(index: TranscriptIndex, seconds: number): number {
  const segments = index.segments;
  let lo = 0;
  let hi = segments.length - 1;
  let found = segments.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].time >= seconds) {
      found = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return found;
}

// `[MM:SS Titolo]`, `[HH:MM:SS Titolo]` o un `MM:SS` spaiato.
const BRACKET_TS = /\[(\d{1,3}:[0-5]?\d(?::[0-5]?\d)?)([^\]]*)\]/g;
const BARE_TS = /(^|[^\d:[])\b(\d{1,3}:[0-5]?\d)\b(?![\]":])/g;

/** Marker di timestamp: usati per non far trapelare i timestamp vicini nel contesto. */
const TS_MARKER_GLOBAL = /\[\d{1,3}:[0-5]?\d(?::[0-5]?\d)?[^\]]*\]/g;

/**
 * Testo da usare come query per il timestamp in `offset`.
 *
 * L'etichetta scritta dal modello ("Introduzione", "Pasta") è generica: il
 * contenuto vero è nella frase che *precede* il marker, e a volte anche in
 * quella successiva. Si prendono le ultime due frasi prima e la prima dopo,
 * fermandosi al marker successivo o a fine riga.
 */
function contextAround(text: string, offset: number, markerLength: number): string {
  const beforeRaw = text.slice(Math.max(0, offset - 240), offset).replace(TS_MARKER_GLOBAL, " ");
  const sentences = beforeRaw.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  const before = sentences.slice(-2).join(" ");

  const rest = text.slice(offset + markerLength, offset + markerLength + 200);
  const stop = rest.indexOf("\n");
  const after = (stop === -1 ? rest : rest.slice(0, stop)).replace(TS_MARKER_GLOBAL, " ");

  return `${before} ${after}`;
}

/** Toglie il markdown per non influenzare il confronto con la trascrizione. */
function plain(text: string): string {
  return text
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[*_`#>]/g, " ")
    .replace(/https?:\/\/\S+/g, " ");
}

/**
 * Prepara la trascrizione per il prompt, **mantenendo i tempi**.
 *
 * Prima il modello riceveva solo il testo concatenato: i secondi non esistevano
 * nel contesto, quindi ogni timestamp era inventato. Qui ogni riga è preceduta
 * dal suo `[MM:SS]` reale, così il modello può solo citare tempi che ha visto.
 *
 * I segmenti sono raggruppati in blocchi da `windowSeconds` per non occupare
 * il contesto con un timestamp ogni due parole.
 */
export function buildTimedTranscript(
  segments: TimedSegment[] | null | undefined,
  options: { windowSeconds?: number; maxChars?: number } = {},
): { text: string; segments: TimedSegment[] } {
  const windowSeconds = options.windowSeconds ?? 15;
  const maxChars = options.maxChars ?? 14000;

  const ordered = [...(segments || [])]
    .filter((s) => s && typeof s.text === "string" && Number.isFinite(s.time))
    .sort((a, b) => a.time - b.time);

  if (ordered.length === 0) return { text: '', segments: [] };

  const lines: string[] = [];
  const kept: TimedSegment[] = [];
  let bucket: TimedSegment[] = [];
  let bucketStart = ordered[0].time;

  const flush = () => {
    if (bucket.length === 0) return;
    const text = bucket.map((s) => s.text.trim()).join(' ').replace(/\s+/g, ' ').trim();
    if (!text) return;
    const line = `[${formatTimestamp(bucketStart)}] ${text}`;
    if (lines.join('\n').length + line.length > maxChars) return;
    lines.push(line);
    kept.push(...bucket);
  };

  for (const segment of ordered) {
    if (bucket.length > 0 && segment.time - bucketStart >= windowSeconds) {
      flush();
      bucket = [];
      bucketStart = segment.time;
    }
    if (bucket.length === 0) bucketStart = segment.time;
    bucket.push(segment);
  }
  flush();

  return { text: lines.join('\n'), segments: kept };
}

/**
 * Regole da aggiungere al prompt quando la trascrizione è già stata passata
 * con i tempi (`buildTimedTranscript`).
 */
export const TS_PROMPT_RULES =
  '\nI timestamp sono parte della trascrizione: ogni riga è preceduta dal suo tempo reale [MM:SS]. ' +
  'Puoi citare SOLO tempi che compaiono già in quelle righe: non inventarli, non arrotondarli, non stimarli dal punto del video.' +
  ' Se la riga non indica chiaramente quando inizia quanto stai descrivendo, scrivi il momento solo per i passaggi di cui sei sicuro.' +
  ' Meglio nessun timestamp che uno sbagliato: un link che porta nel punto sbagliato fa perdere tempo alla persona che legge.';

// L'indice costa O(segmenti × finestre): su una trascrizione lunga rifarlo a
// ogni render di ogni messaggio sarebbe inutilmente pesante. La cache è su
// WeakMap, quindi si libera da sola quando la trascrizione non serve più.
const indexCache = new WeakMap<TimedSegment[], TranscriptIndex>();

/** Indice di una trascrizione, riusato finché lo stesso array resta valido. */
export function getTranscriptIndex(segments: TimedSegment[]): TranscriptIndex {
  const cached = indexCache.get(segments);
  if (cached) return cached;
  const built = buildTranscriptIndex(segments);
  indexCache.set(segments, built);
  return built;
}

export type AlignOptions = {
  /** Soglia sotto la quale il timestamp viene rimosso. */
  minScore?: number;
};

/**
 * Riscrive i timestamp di un messaggio AI usando la trascrizione reale.
 *
 * - timestamp con riscontro → tempo ricalcolato (il tempo dell'AI viene
 *   ignorato: è quello inventato);
 * - timestamp senza riscontro → rimosso, insieme all'etichetta, così non
 *   resta un link che porta nel posto sbagliato;
 * - senza trascrizione → tutti i timestamp vengono rimossi: è preferibile
 *   nessun link a un link bugiardo.
 */
export function alignTimestampsInMarkdown(
  markdown: string,
  segments: TimedSegment[] | null | undefined,
  options: AlignOptions = {},
): string {
  if (!markdown) return markdown;
  const hasTranscript = Array.isArray(segments) && segments.length > 0;
  const index = hasTranscript ? getTranscriptIndex(segments!) : null;

  const replaceMarker = (marker: string, label: string, offset: number) => {
    if (!index) return "";
    const query = plain(`${label} ${contextAround(markdown, offset, marker.length)}`);
    const hit = alignToTranscript(index, query, { minScore: options.minScore });
    if (!hit) return "";
    const cleanLabel = label.trim();
    return `[${formatTimestamp(hit.seconds)}${cleanLabel ? ` ${cleanLabel}` : ""}]`;
  };

  let out = markdown.replace(BRACKET_TS, (full, timeStr, label, offset) =>
    replaceMarker(full, label || "", offset),
  );

  out = out.replace(BARE_TS, (full, beforeChar, timeStr, offset) => {
    const rewritten = replaceMarker(timeStr, "", offset);
    return `${beforeChar}${rewritten}`;
  });

  // Spaziature residui lasciati dalla rimozione dei marker.
  return out
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .trim();
}
