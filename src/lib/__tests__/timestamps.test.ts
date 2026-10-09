import { describe, it, expect } from 'vitest'
import {
  alignTimestampsInMarkdown,
  alignToTranscript,
  buildTimedTranscript,
  buildTranscriptIndex,
  formatTimestamp,
  getTranscriptIndex,
  parseTimeToSeconds,
  tokenize,
  type TimedSegment,
} from '@/lib/timestamps'

/**
 * Trascrizione di prova: 4 blocchi tematici da 60 secondi, parole chiave
 * diverse in ognuno (è quello che rende distinguibili le finestre).
 */
function makeTranscript(): TimedSegment[] {
  const blocks = [
    { at: 0, text: 'Benvenuti in questo video sulla gestione del tempo e sulla produttività personale di ogni giorno.' },
    { at: 60, text: 'Ora parliamo del machine learning: le reti neurali imparano dai dati e generalizzano.' },
    { at: 120, text: 'Passiamo alla cucina: come cuocere la pasta perfetta con il metodo del sale nell acqua.' },
    { at: 180, text: 'Ultimo argomento, il giardinaggio in balcone: terriccio, luce e annaffiature delle piante.' },
  ]
  const segments: TimedSegment[] = []
  for (const b of blocks) {
    for (let i = 0; i < 6; i++) {
      segments.push({ text: `${b.text} (parte ${i + 1})`, time: b.at + i * 10, duration: 10 })
    }
  }
  return segments
}

const transcript = makeTranscript()
const index = buildTranscriptIndex(transcript)

describe('formattazione timestamp', () => {
  it('formatta M:SS e H:MM:SS', () => {
    expect(formatTimestamp(0)).toBe('0:00')
    expect(formatTimestamp(65)).toBe('1:05')
    expect(formatTimestamp(605)).toBe('10:05')
    expect(formatTimestamp(3725)).toBe('1:02:05')
  })

  it('parsa MM:SS e HH:MM:SS', () => {
    expect(parseTimeToSeconds('1:05')).toBe(65)
    expect(parseTimeToSeconds('01:05')).toBe(65)
    expect(parseTimeToSeconds('1:02:05')).toBe(3725)
    expect(parseTimeToSeconds('pippo')).toBeNull()
    expect(parseTimeToSeconds('1:99')).toBeNull()
  })
})

describe('tokenize', () => {
  it('scarta accenti, punteggiatura e parole funzionali', () => {
    expect(tokenize('Perché il Perché? La produzione, quindi...')).toEqual(['produzione'])
    expect(tokenize('the and of neural networks')).toEqual(['neural', 'networks'])
  })
})

describe('alignToTranscript', () => {
  it('trova il blocco giusto e restituisce un secondo plausibile', () => {
    const hit = alignToTranscript(index, 'Le reti neurali imparano dai dati e generalizzano')
    expect(hit).not.toBeNull()
    expect(hit!.seconds).toBeGreaterThanOrEqual(60)
    expect(hit!.seconds).toBeLessThan(120)
    expect(hit!.score).toBeGreaterThan(0.22)
  })

  it('distingue temi diversi', () => {
    const pasta = alignToTranscript(index, 'come cuocere la pasta con il sale nell acqua')
    const giardino = alignToTranscript(index, 'giardinaggio in balcone con terriccio e annaffiature')
    expect(pasta!.seconds).toBeGreaterThanOrEqual(120)
    expect(pasta!.seconds).toBeLessThan(180)
    expect(giardino!.seconds).toBeGreaterThanOrEqual(180)
  })

  it('non allinea testo senza alcun rapporto con la trascrizione', () => {
    expect(alignToTranscript(index, 'bitcoin quantistico fotografia a colori')).toBeNull()
  })

  it('non allinea frasi troppo corte (pochi token)', () => {
    expect(alignToTranscript(index, 'si')).toBeNull()
  })

  it('senza finestre non produce nulla', () => {
    expect(alignToTranscript(buildTranscriptIndex([]), 'machine learning')).toBeNull()
  })
})

describe('alignTimestampsInMarkdown', () => {
  it('sostituisce un timestamp inventato con quello reale', () => {
    const text = 'Il tema centrale è il machine learning. [00:05 Reti neurali] Le reti neurali imparano dai dati.'
    const out = alignTimestampsInMarkdown(text, transcript)
    const m = out.match(/\[(\d+:\d{2})/);
    expect(m).not.toBeNull()
    const seconds = parseTimeToSeconds(m![1])!
    expect(seconds).toBeGreaterThanOrEqual(60)
    expect(seconds).toBeLessThan(120)
    expect(out).toContain('Reti neurali')
  })

  it('rimuove il timestamp quando il contenuto non esiste nella trascrizione', () => {
    const text = 'Argomento assurdo qui. [00:30 Mercato azionario] Il topic non compare mai nella trascrizione del video in questione.'
    const out = alignTimestampsInMarkdown(text, transcript)
    expect(out).not.toContain('00:30')
    expect(out).not.toContain('Mercato azionario')
    expect(out).toContain('Argomento assurdo qui')
  })

  it('senza trascrizione rimuove ogni timestamp invece di lasciare link bugiardi', () => {
    const text = 'Titolo: cucina [00:10 Pasta] e poi [01:20 Machine learning]'
    const out = alignTimestampsInMarkdown(text, null)
    expect(out).not.toContain('[00:10')
    expect(out).not.toContain('[01:20')
    expect(out).toContain('Titolo: cucina')
  })

  it('gestisce timestamp nudi senza etichetta', () => {
    const text = 'Le reti neurali imparano dai dati. 00:07'
    const out = alignTimestampsInMarkdown(text, transcript)
    const m = out.match(/(\d+:\d{2})/)
    expect(m).not.toBeNull()
    const seconds = parseTimeToSeconds(m![1])!
    expect(seconds).toBeGreaterThanOrEqual(60)
    expect(seconds).toBeLessThan(120)
  })

  it('non tocca gli URL con query string', () => {
    const text = 'Guarda https://www.youtube.com/watch?v=DHjqpvDnNGE?t=90 per il dettaglio'
    const out = alignTimestampsInMarkdown(text, transcript)
    expect(out).toContain('youtube.com/watch?v=DHjqpvDnNGE?t=90')
  })

  it('allinea più timestamp nella stessa risposta', () => {
    const text = [
      'Il video parte dalla produttività personale. [00:00 Produttività]',
      'Poi arriva il machine learning. [00:00 Machine learning]',
      'Chiude con la cucina e la pasta. [00:00 Cucina]',
    ].join('\n')
    const out = alignTimestampsInMarkdown(text, transcript)
    const times = [...out.matchAll(/\[(\d+:\d{2})/g)].map((m) => parseTimeToSeconds(m[1])!)
    expect(times).toHaveLength(3)
    expect(times[0]).toBeLessThan(60)
    expect(times[1]).toBeGreaterThanOrEqual(60)
    expect(times[1]).toBeLessThan(120)
    expect(times[2]).toBeGreaterThanOrEqual(120)
    expect(times[2]).toBeLessThan(180)
  })

  it('testo senza timestamp resta invariato', () => {
    const text = '## Titolo\n\nUn paragrafo normale senza tempi.'
    expect(alignTimestampsInMarkdown(text, transcript)).toBe(text)
  })

  it('cache l indice per lo stesso array di segmenti', () => {
    expect(getTranscriptIndex(transcript)).toBe(getTranscriptIndex(transcript))
    expect(getTranscriptIndex([...transcript])).not.toBe(getTranscriptIndex(transcript))
  })
})

describe('buildTimedTranscript', () => {
  it('prepende il tempo reale a ogni riga', () => {
    const { text, segments } = buildTimedTranscript(transcript, { windowSeconds: 30 })
    expect(text).toContain('[0:00]')
    expect(text).toContain('[1:00]')
    expect(segments.length).toBe(transcript.length)
    // Nessun tempo può essere inventato dal prompt: sono tutti presenti.
    for (const line of text.split('\n')) expect(line).toMatch(/^\[\d+:\d{2}] /)
  })

  it('rispetta il limite di caratteri', () => {
    const { text } = buildTimedTranscript(transcript, { maxChars: 200 })
    expect(text.length).toBeLessThanOrEqual(200)
  })

  it('trascrizione vuota o nulla', () => {
    expect(buildTimedTranscript(null)).toEqual({ text: '', segments: [] })
    expect(buildTimedTranscript([])).toEqual({ text: '', segments: [] })
  })

  it('ordina i segmenti per tempo', () => {
    const shuffled = [...transcript].reverse()
    const { segments } = buildTimedTranscript(shuffled, { windowSeconds: 30 })
    expect(segments.map((s) => s.time)).toEqual([...segments.map((s) => s.time)].sort((a, b) => a - b))
  })

  it('i timestamp generati dal prompt sono poi allineabili', () => {
    const { text, segments } = buildTimedTranscript(transcript, { windowSeconds: 30 })
    const [, secondLine] = text.split('\n')
    const markerTime = secondLine.match(/^\[(\d+:\d{2})]/)![1]
    // Il modello cita il primo tempo che vede, ma parla della pasta: deve
    // vincere il testo, non il tempo.
    const answer = `Il video parla di cucina. [${markerTime} La pasta] La pasta si cuoce con il sale.`
    const out = alignTimestampsInMarkdown(answer, segments)
    const seconds = parseTimeToSeconds(out.match(/\[(\d+:\d{2})/)![1])!
    expect(seconds).toBeGreaterThanOrEqual(120)
    expect(seconds).toBeLessThan(180)
  })
})
