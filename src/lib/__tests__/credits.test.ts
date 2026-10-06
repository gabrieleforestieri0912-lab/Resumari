import { describe, it, expect } from 'vitest'
import { hasEnoughCredits, CREDIT_COSTS } from '@/lib/credits'

describe('credits', () => {
  it('catalogo costi per operazione', () => {
    expect(CREDIT_COSTS.transcription).toBe(1)
    expect(CREDIT_COSTS.transcriptionApi).toBe(2)
    expect(CREDIT_COSTS.chat).toBe(1)
  })

  it('hasEnoughCredits: true con saldo sufficiente o esatto', () => {
    expect(hasEnoughCredits({ credits: 5, plan: 'free' }, 1)).toBe(true)
    expect(hasEnoughCredits({ credits: 1, plan: 'free' }, 1)).toBe(true)
  })

  it('hasEnoughCredits: false senza utente, saldo zero o insufficiente', () => {
    expect(hasEnoughCredits(null, 1)).toBe(false)
    expect(hasEnoughCredits(undefined, 1)).toBe(false)
    expect(hasEnoughCredits({ credits: 0, plan: 'free' }, 1)).toBe(false)
    expect(hasEnoughCredits({ credits: 1, plan: 'free' }, 2)).toBe(false)
  })

  it('hasEnoughCredits: tollera valori mancanti o stringa', () => {
    expect(hasEnoughCredits({ plan: 'free' } as any, 1)).toBe(false)
    expect(hasEnoughCredits({ credits: '3' as any, plan: 'free' }, 2)).toBe(true)
  })
})
