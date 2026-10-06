import { describe, it, expect } from 'vitest'
import { getTranslations, t, locales, defaultLocale } from '@/lib/translations'

describe('translations', () => {
  it('espone le lingue supportate con default italiano', () => {
    expect(locales).toContain('it')
    expect(locales).toContain('en')
    expect(defaultLocale).toBe('it')
  })

  it('risolve chiavi esistenti in entrambe le lingue', () => {
    const itKeys = Object.keys(getTranslations('it'))
    expect(itKeys.length).toBeGreaterThan(0)
    const sample = itKeys[0]
    expect(t('it', sample)).toBe(getTranslations('it')[sample])
    expect(typeof t('en', sample)).toBe('string')
  })

  it('fallback: locale sconosciuto -> inglese, chiave mancante -> chiave stessa', () => {
    expect(getTranslations('xx')).toEqual(getTranslations('en'))
    expect(t('it', '__chiave_inesistente__')).toBe('__chiave_inesistente__')
  })
})
