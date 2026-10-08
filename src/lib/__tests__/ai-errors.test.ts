import { describe, it, expect } from 'vitest'
import { aiErrorMessage, AI_CONFIG_ERROR, TRANSCRIPTION_CONFIG_ERROR } from '@/lib/ai'

describe('aiErrorMessage', () => {
  it('riconosce la chiave xKiro mancante', () => {
    expect(aiErrorMessage(new Error(AI_CONFIG_ERROR))).toBe(AI_CONFIG_ERROR)
    expect(aiErrorMessage(new Error('missing XKIRO_API_KEY here'))).toBe(AI_CONFIG_ERROR)
  })

  it('riconosce la trascrizione non configurata (Groq)', () => {
    expect(aiErrorMessage(new Error(TRANSCRIPTION_CONFIG_ERROR))).toBe(TRANSCRIPTION_CONFIG_ERROR)
    expect(aiErrorMessage(new Error('missing GROQ_API_KEY here'))).toBe(TRANSCRIPTION_CONFIG_ERROR)
  })

  it('riconosce il modello ritirato / sconosciuto', () => {
    expect(aiErrorMessage(new Error('model_not_found: openai/gpt-oss'))).toMatch(/non è disponibile/)
    expect(aiErrorMessage(new Error('The model has been decommissioned'))).toMatch(/non è disponibile/)
    expect(aiErrorMessage(new Error('Unknown model requested'))).toMatch(/non è disponibile/)
  })

  it('riconosce chiave invalida / 401', () => {
    expect(aiErrorMessage(new Error('Invalid API Key provided'))).toMatch(/non valida/)
    expect(aiErrorMessage(new Error('401 Unauthorized'))).toMatch(/non valida/)
    expect(aiErrorMessage(new Error('authentication_error'))).toMatch(/non valida/)
  })

  it('riconosce quota / rate limit', () => {
    expect(aiErrorMessage(new Error('Rate limit reached, 429'))).toMatch(/Riprova tra qualche istante/)
    expect(aiErrorMessage(new Error('quota exceeded for model'))).toMatch(/Riprova tra qualche istante/)
  })

  it('riconosce modello premium non coperto dal piano Free (403 xKiro)', () => {
    expect(
      aiErrorMessage(new Error('This premium model requires an active paid plan or real deposited balance.')),
    ).toMatch(/piano xKiro a pagamento/)
    expect(aiErrorMessage(new Error('This is a paid model. The Free plan only allows free models'))).toMatch(
      /piano xKiro a pagamento/,
    )
    expect(aiErrorMessage(new Error('permission_denied'))).toMatch(/piano Free/)
    expect(
      aiErrorMessage(new Error('403 This premium model requires an active paid plan or real deposited balance')),
    ).toMatch(/qwen\/qwen3.8-max:free/)
  })

  it('fallback generico per errori sconosciuti o vuoti', () => {
    expect(aiErrorMessage(new Error('boom'))).toBe('Errore durante l\'elaborazione')
    expect(aiErrorMessage(undefined)).toBe('Errore durante l\'elaborazione')
    expect(aiErrorMessage(new Error('strano'), 'custom')).toBe('custom')
  })

  it('accetta anche stringhe non-Error', () => {
    expect(aiErrorMessage('model_not_found')).toMatch(/non è disponibile/)
  })
})
