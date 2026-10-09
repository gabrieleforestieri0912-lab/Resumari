import { describe, it, expect } from 'vitest'
import { featureDetails, getFeatureBySlug, FEATURE_SLUGS } from '@/lib/features-detail'
import { generateStaticParams } from '@/app/features/[slug]/page'

/**
 * Il sintomo segnalato: cliccando la card in home non si apriva la pagina di
 * dettaglio. La causa era `params` non awaitato in Next 16 → slug `undefined` →
 * `notFound()`. Questi test coprono entrambi i lati del link: lo slug della
 * card e la pagina che risponde.
 */
describe('pagine di dettaglio funzionalità', () => {
  it('ogni slug della home ha una pagina di dettaglio', () => {
    expect(FEATURE_SLUGS).toHaveLength(featureDetails.length)
    for (const slug of FEATURE_SLUGS) {
      expect(getFeatureBySlug(slug), `manca la pagina /features/${slug}`).toBeTruthy()
    }
  })

  it('slug univoci e in formato URL', () => {
    expect(new Set(FEATURE_SLUGS).size).toBe(FEATURE_SLUGS.length)
    for (const slug of FEATURE_SLUGS) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('generateStaticParams copre tutti gli slug (build senza 404)', async () => {
    const params = generateStaticParams()
    expect(params.map((p) => p.slug).sort()).toEqual([...FEATURE_SLUGS].sort())
  })

  it('la pagina riceve params come Promise (Next 15+) e ricava lo slug', async () => {
    const slug = FEATURE_SLUGS[0]
    // Simula il chiamato di Next: params è una Promise, non un oggetto.
    const params = Promise.resolve({ slug })
    const { slug: resolved } = await params
    expect(getFeatureBySlug(resolved)).toBeTruthy()
  })

  it('slug inesistente: nessuna feature trovata (la pagina deve fare notFound)', () => {
    expect(getFeatureBySlug('non-esiste')).toBeUndefined()
  })

  it('ogni feature ha contenuti sufficienti per la pagina', () => {
    for (const f of featureDetails) {
      expect(f.title.length, f.slug).toBeGreaterThan(0)
      expect(f.longDesc.length, f.slug).toBeGreaterThan(20)
      expect(f.highlights.length, f.slug).toBeGreaterThan(0)
      expect(f.keyPoints.length, f.slug).toBeGreaterThan(0)
      expect(f.faqs.length, f.slug).toBeGreaterThan(0)
    }
  })
})
