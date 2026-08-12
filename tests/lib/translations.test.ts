import { describe, it, expect } from 'vitest'
import { getTranslations, t, locales, defaultLocale } from '@/lib/translations'

describe('translations', () => {
  it('exposes italian and english locales', () => {
    expect(locales).toEqual(['it', 'en'])
    expect(defaultLocale).toBe('it')
  })

  it('returns italian translations for the it locale', () => {
    expect(t('it', 'save')).toBe('Salva')
    expect(t('it', 'dashboard')).toBe('Dashboard')
    expect(t('it', 'login')).toBe('Accedi')
  })

  it('returns english translations for the en locale', () => {
    expect(t('en', 'save')).toBe('Save')
    expect(t('en', 'dashboard')).toBe('Dashboard')
    expect(t('en', 'login')).toBe('Login')
  })

  it('falls back to italian for unknown locales', () => {
    expect(getTranslations('de')).toBe(getTranslations('it'))
    expect(t('xx', 'save')).toBe('Salva')
  })

  it('returns the key when the translation is missing', () => {
    expect(t('it', 'nonexistent_key')).toBe('nonexistent_key')
    expect(t('en', 'nonexistent_key')).toBe('nonexistent_key')
  })

  it('contains the same set of keys in both locales', () => {
    const itKeys = Object.keys(getTranslations('it')).sort()
    const enKeys = Object.keys(getTranslations('en')).sort()
    expect(itKeys).toEqual(enKeys)
  })
})
