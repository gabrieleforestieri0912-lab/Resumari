import { Groq } from 'groq-sdk';

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export async function generateChatCompletion(
  messages: ChatMessage[],
  model = 'llama-3.3-70b-versatile',
) {
  if (!groq) {
    throw new Error('Groq API Key non configurata');
  }

  try {
    const response = await groq.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error in generateChatCompletion:', error);
    throw error;
  }
}

export async function transcribeAudio(file: File) {
  if (!groq) {
    throw new Error('Groq API Key non configurata per la trascrizione');
  }

  try {
    const transcription = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3-turbo',
      response_format: 'verbose_json',
    });
    return transcription;
  } catch (error) {
    console.error('Error in transcribeAudio:', error);
    throw error;
  }
}
