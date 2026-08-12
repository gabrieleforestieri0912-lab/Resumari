import { describe, it, expect } from 'vitest'
import { generateChatCompletion, transcribeAudio } from '@/lib/ai'

describe('ai lib (no API keys configured)', () => {
  it('throws when no OpenAI or Groq key is configured', async () => {
    await expect(generateChatCompletion([{ role: 'user', content: 'ciao' }])).rejects.toThrow(
      'Nessuna API Key configurata per OpenAI o Groq',
    )
  })

  it('throws when no Groq key is configured for audio transcription', async () => {
    const file = new File(['audio'], 'audio.mp3', { type: 'audio/mp3' })
    await expect(transcribeAudio(file)).rejects.toThrow(
      'Groq API Key non configurata per la trascrizione',
    )
  })
})
