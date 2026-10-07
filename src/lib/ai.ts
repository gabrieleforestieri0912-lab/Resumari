import OpenAI from 'openai';
import { Groq } from 'groq-sdk';

/**
 * Provider AI: xKiro (gateway OpenAI-compatible) per chat/vision.
 * Trascrizione audio: ancora Groq (xKiro non espone speech-to-text).
 *
 * Docs: https://docs.xkiro.com/guides/sdk-openai/
 */

const XKIRO_BASE_URL =
  process.env.XKIRO_BASE_URL || 'https://api.xkiro.com/v1';

// Model ID con prefisso vendor obbligatorio (es. openai/gpt-5.6-sol).
export const DEFAULT_AI_MODEL =
  process.env.XKIRO_MODEL || process.env.GROQ_MODEL || 'openai/gpt-5.6-sol';

// Vision: con xKiro i modelli chat spesso accettano image_url; default = modello chat.
export const VISION_AI_MODEL =
  process.env.XKIRO_VISION_MODEL || DEFAULT_AI_MODEL;

export const TRANSCRIPTION_MODEL =
  process.env.GROQ_TRANSCRIPTION_MODEL || 'whisper-large-v3-turbo';

export const AI_CONFIG_ERROR =
  "Servizio AI non configurato: manca la variabile d'ambiente XKIRO_API_KEY.";

export const TRANSCRIPTION_CONFIG_ERROR =
  "Trascrizione audio non configurata: manca GROQ_API_KEY (xKiro non offre speech-to-text).";

type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: unknown;
};

let xkiroClient: OpenAI | null = null;
let xkiroClientKey: string | null = null;

function getXkiro(): OpenAI {
  const apiKey = process.env.XKIRO_API_KEY;
  if (!apiKey) throw new Error(AI_CONFIG_ERROR);

  if (!xkiroClient || xkiroClientKey !== apiKey) {
    xkiroClient = new OpenAI({
      apiKey,
      baseURL: XKIRO_BASE_URL,
      timeout: 120_000,
      maxRetries: 2,
    });
    xkiroClientKey = apiKey;
  }
  return xkiroClient;
}

let groqClient: Groq | null = null;
let groqClientKey: string | null = null;

function getGroq(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error(TRANSCRIPTION_CONFIG_ERROR);

  if (!groqClient || groqClientKey !== apiKey) {
    groqClient = new Groq({ apiKey });
    groqClientKey = apiKey;
  }
  return groqClient;
}

/**
 * Trasforma gli errori del provider in un messaggio comprensibile per l'utente.
 */
export function aiErrorMessage(
  error: unknown,
  fallback = "Errore durante l'elaborazione",
): string {
  const message = error instanceof Error ? error.message : String(error ?? '');

  if (!message) return fallback;
  if (
    message.includes(AI_CONFIG_ERROR) ||
    message.includes('XKIRO_API_KEY') ||
    message.includes('GROQ_API_KEY')
  ) {
    return message.includes('GROQ_API_KEY') || message.includes(TRANSCRIPTION_CONFIG_ERROR)
      ? TRANSCRIPTION_CONFIG_ERROR
      : AI_CONFIG_ERROR;
  }
  if (message.includes(TRANSCRIPTION_CONFIG_ERROR)) {
    return TRANSCRIPTION_CONFIG_ERROR;
  }
  if (/model_not_found|does not exist|decommissioned|unknown model|invalid model|not_found/i.test(message)) {
    return 'Il modello AI configurato non è disponibile: aggiorna XKIRO_MODEL con un modello attivo (formato vendor/model).';
  }
  if (/invalid api key|unauthorized|401|authentication_error/i.test(message)) {
    return 'Chiave API xKiro non valida: controlla la variabile XKIRO_API_KEY.';
  }
  if (/quota|rate.?limit|429/i.test(message)) {
    return 'Limite di utilizzo AI superato. Riprova tra qualche istante.';
  }
  return fallback;
}

export async function generateChatCompletion(
  messages: ChatMessage[],
  model: string = DEFAULT_AI_MODEL,
) {
  try {
    const response = await getXkiro().chat.completions.create({
      model,
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      temperature: 0.7,
    });
    return response.choices[0]?.message?.content ?? '';
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
