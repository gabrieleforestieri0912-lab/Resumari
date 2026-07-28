import { Groq } from 'groq-sdk';
import { OpenAI } from 'openai';

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export async function generateChatCompletion(messages: ChatMessage[], model = 'gpt-4o-mini') {
  if (!openai && !groq) {
    throw new Error('Nessuna API Key configurata per OpenAI o Groq');
  }

  try {
    if (openai) {
      try {
        const response = await openai.chat.completions.create({
          model: model,
          messages: messages,
          temperature: 0.7,
        });
        return response.choices[0].message.content;
      } catch (openaiError: any) {
        console.error('OpenAI failed, trying Groq fallback:', openaiError.message);
        if (groq) {
          const response = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: messages,
          });
          return response.choices[0].message.content;
        }
        throw openaiError;
      }
    } else if (groq) {
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: messages,
      });
      return response.choices[0].message.content;
    } else {
      throw new Error('Nessuna API Key configurata per OpenAI o Groq');
    }
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
      file: file,
      model: 'whisper-large-v3-turbo',
      response_format: 'verbose_json',
    });
    return transcription;
  } catch (error) {
    console.error('Error in transcribeAudio:', error);
    throw error;
  }
}
