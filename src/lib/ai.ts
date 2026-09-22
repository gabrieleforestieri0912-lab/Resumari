import { Groq } from 'groq-sdk';

/**
 * Provider AI dell'applicazione (Groq).
 *
 * I modelli Groq vengono ritirati nel tempo: nomi come `llama-3.3-70b-versatile`
 * o `llama-3.2-11b-vision-preview` rispondono ormai con 404 `model_not_found` /
 * 400 `decommissioned`. Per questo il modello è configurabile via variabile
 * d'ambiente: si aggiorna la configurazione senza toccare il codice.
 */

// Modello di default per le risposte testuali (chat, demo, suggerimenti).
export const DEFAULT_AI_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

// Modello per l'analisi delle immagini (vision). Se vuoto, la vision non è disponibile.
export const VISION_AI_MODEL = process.env.GROQ_VISION_MODEL || '';

// Modello per la trascrizione audio.
export const TRANSCRIPTION_MODEL =
  process.env.GROQ_TRANSCRIPTION_MODEL || 'whisper-large-v3-turbo';

// Messaggio condiviso quando la chiave API non è configurata.
export const AI_CONFIG_ERROR =
  "Servizio AI non configurato: manca la variabile d'ambiente GROQ_API_KEY.";

type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: any;
};

// Client Groq creato in modo lazy: la chiave viene letta al primo utilizzo, così
// l'errore in caso di chiave mancante è esplicito e il client segue i cambi di env.
let groqClient: Groq | null = null;
let groqClientKey: string | null = null;

function getGroq(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error(AI_CONFIG_ERROR);

  if (!groqClient || groqClientKey !== apiKey) {
    groqClient = new Groq({ apiKey });
    groqClientKey = apiKey;
  }
  return groqClient;
}

/**
 * Trasforma gli errori del provider in un messaggio comprensibile per l'utente,
 * così un modello ritirato o una chiave non valida non diventano un generico
 * "Errore durante l'elaborazione".
 */
export function aiErrorMessage(
  error: unknown,
  fallback = "Errore durante l'elaborazione",
): string {
  const message = error instanceof Error ? error.message : String(error ?? '');

  if (!message) return fallback;
  if (message.includes(AI_CONFIG_ERROR) || message.includes('GROQ_API_KEY')) {
    return AI_CONFIG_ERROR;
  }
  if (/model_not_found|does not exist|decommissioned|unknown model|invalid model/i.test(message)) {
    return 'Il modello AI configurato non è più disponibile su Groq: aggiorna GROQ_MODEL con un modello attivo.';
  }
  if (/invalid api key|unauthorized|401/i.test(message)) {
    return 'Chiave API Groq non valida: controlla la variabile GROQ_API_KEY.';
  }
  if (/quota|rate.?limit|429/i.test(message)) {
    return 'Limite di utilizzo AI superato. Riprova tra qualche istante.';
  }
  return fallback;
}

/**
 * Rimuove le emoji da una stringa per pulire il testo.
 *
 * NOTA: non usare mai \p{Emoji_Component} da solo: quella classe Unicode
 * include anche cifre ASCII, "*" e "#" (sono componenti di sequenze emoji
 * come 1️⃣ o #️⃣), quindi cancellerebbe numeri e formattazione markdown.
 * Si rimuovono solo i pittogrammi veri (Extended_Pictographic), più i
 * modificatori di tono della pelle e i selettori di variazione quando
 * seguono un pittogramma.
 */
export function removeEmojis(text: string) {
  if (!text) return text;
  return text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}]/gu, '')
    .replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '')
    .replace(/\uFE0F/gu, '');
}

export async function generateChatCompletion(
  messages: ChatMessage[],
  model: string = DEFAULT_AI_MODEL,
) {
  try {
    const response = await getGroq().chat.completions.create({
      model,
      messages: messages as any,
      temperature: 0.7,
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error in generateChatCompletion:', error);
    throw error;
  }
}

export async function transcribeAudio(file: File) {
  try {
    const transcription = await getGroq().audio.transcriptions.create({
      file,
      model: TRANSCRIPTION_MODEL,
      response_format: 'verbose_json',
    });
    return transcription;
  } catch (error) {
    console.error('Error in transcribeAudio:', error);
    throw error;
  }
}
