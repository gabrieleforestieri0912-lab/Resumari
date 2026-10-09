import { describe, it, expect } from 'vitest'
import {
  alignTimestampsInMarkdown,
  alignToTranscript,
  buildTimedTranscript,
  buildTranscriptIndex,
  type TimedSegment,
} from '@/lib/timestamps'

/**
 * Trascrizione più realistica di quella a blocchi sintetici: sezioni distanti
 * 30 secondi, ciascuna con 3-4 frasi da 7s (ritmo del parlato), più una breve
 * pausa prima della sezione successiva. L'invariante verificato è che il
 * timestamp cade nella sezione in cui il contenuto viene davvero detto, non
 * che sia "plausibile".
 */
const SECTIONS: { text: string; queries: string[] }[] = [
  {
    text: 'Buongiorno a tutti, oggi parliamo di come organizzare una giornata di deep work. Il cervello ha bisogno di silenzio per consolidare quello che hai imparato durante la giornata.',
    queries: ['Il cervello ha bisogno di silenzio per consolidare quello che hai imparato'],
  },
  {
    text: 'Cambiamo tema e parliamo di allenamento. Le ripetizioni contano più del carico, e la progressione deve aumentare gradualmente nel corso delle settimane.',
    queries: ['Le ripetizioni contano più del carico e la progressione aumenta gradualmente'],
  },
  {
    text: 'Ora cucina, per la pasta il segreto è l acqua salata e muoverla fino a metà cottura così l amido si rilascia e si lega bene col sugo.',
    queries: ['Per la pasta il segreto è l acqua salata e muoverla fino a metà cottura'],
  },
  {
    text: 'Adesso giardinaggio in balcone. Il terriccio deve essere drenante e la luce conta più dell acqua, perché le radici marciscono se restano bagnate troppo.',
    queries: ['Il terriccio deve essere drenante e la luce conta più dell acqua'],
  },
  {
    text: 'Parliamo di fotografia. L esposizione si decide prima di scattare, e una regola dei terzi già da sola evita le inquadrature banali.',
    queries: ['L esposizione si decide prima di scattare e una regola dei terzi'],
  },
  {
    text: 'Ultimo punto, la memoria. Ripassare attivamente a distanza di qualche giorno sposta l informazione dalla memoria di lavoro a quella a lungo termine.',
    queries: ['Ripassare attivamente a distanza sposta l informazione nella memoria a lungo termine'],
  },
]

const SECTION_GAP = 30;
const SECTION_WORDS = 14;

/** Sezione i: secondi di inizio, i segmenti che la compongono e la sua fine. */
function sectionLayout() {
  return SECTIONS.map((section) => {
    const words = section.text.split(' ');
    const chunks = Math.ceil(words.length / SECTION_WORDS);
    const start = SECTIONS.indexOf(section) * (SECTION_GAP + chunks * 7);
    return { start, end: start + chunks * 7, words, chunks };
  })
}

const layout = sectionLayout();

/** Segmenti in stile timedtext: frasi da 7 secondi, come le cue reali. */
const transcript: TimedSegment[] = layout.flatMap((section) => {
  const segments: TimedSegment[] = [];
  for (let c = 0; c < section.chunks; c++) {
    segments.push({
      text: section.words.slice(c * SECTION_WORDS, (c + 1) * SECTION_WORDS).join(' '),
      time: section.start + c * 7,
      duration: 7,
    });
  }
  return segments;
});

const index = buildTranscriptIndex(transcript)

describe('accuratezza su trascrizione realistica', () => {
  it.each(SECTIONS.map((s, i) => [i, s] as const))(
    'aggancia la sezione %i nel punto giusto',
    (position, section) => {
      const hit = alignToTranscript(index, section.queries[0])
      expect(hit).not.toBeNull()
      const { start, end } = layout[position]
      // Il timestamp deve cadere dentro la sezione che contiene il contenuto.
      expect(hit!.seconds).toBeGreaterThanOrEqual(start)
      expect(hit!.seconds).toBeLessThan(end)
    },
  )

  it('nessuna sezione viene confusa con un’altra', () => {
    const found = SECTIONS.map((section, position) => ({
      position,
      seconds: alignToTranscript(index, section.queries[0])?.seconds ?? -1,
    }))
    expect(new Set(found.map((f) => f.position)).size).toBe(SECTIONS.length)
    const seconds = found.map((f) => f.seconds)
    expect(new Set(seconds).size).toBe(seconds.length)
  })

  it('frase fuori trascrizione: nessun timestamp (meglio nessun link)', () => {
    expect(alignToTranscript(index, 'Il modello diPricing per le criptovalute e la volatilità')).toBeNull()
  })

  it('un timestamp già nella sezione giusta non viene spostato altrove', () => {
    const { text, segments } = buildTimedTranscript(transcript)
    const line = text.split('\n').find((l) => l.includes('terriccio'))!
    const marker = line.match(/^\[(\d+:\d{2})]/)![1]
    const answer = `[${marker} Terriccio] Il terriccio deve essere drenante e la luce conta più dell acqua.`
    const out = alignTimestampsInMarkdown(answer, segments)
    const match = out.match(/\[(\d+):(\d{2})/)!
    const seconds = Number(match[1]) * 60 + Number(match[2])
    const markerSeconds = Number(marker.split(':')[0]) * 60 + Number(marker.split(':')[1])
    const gardening = layout[3]
    // Resta nella sezione corretta; può solo affinare il secondo esatto.
    expect(seconds).toBeGreaterThanOrEqual(gardening.start)
    expect(seconds).toBeLessThan(gardening.end)
    expect(Math.abs(seconds - markerSeconds)).toBeLessThanOrEqual(15)
  })

  it('timestamp inventato: corretto sul punto in cui il video parla', () => {
    const answer = 'Parla di cucina. [0:02 Pasta] Per la pasta il segreto è l acqua salata.'
    const out = alignTimestampsInMarkdown(answer, transcript)
    const seconds = Number(out.match(/\[(\d+):(\d{2})/)![1]) * 60 + Number(out.match(/\[(\d+):(\d{2})/)![2])
    const kitchen = layout[2]
    expect(seconds).toBeGreaterThanOrEqual(kitchen.start)
    expect(seconds).toBeLessThan(kitchen.end)
  })
})
