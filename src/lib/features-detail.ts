import { Video, FileText, MessageSquare, Settings, Globe, Download } from "lucide-react";
import type { ComponentType } from "react";

export interface FeatureDetail {
  slug: string;
  title: string;
  shortDesc: string;
  longDesc: string;
  icon: ComponentType<any>;
  highlights: { title: string; desc: string; icon: ComponentType<any> }[];
  keyPoints: string[];
  faqs: { q: string; a: string }[];
}

export const featureDetails: FeatureDetail[] = [
  {
    slug: "video-summary",
    title: "Riassunto Video Universale",
    shortDesc: "Trasforma qualsiasi video in un riassunto chiaro e conciso.",
    longDesc: "Incolla un link YouTube, Vimeo o qualsiasi piattaforma e ottieni in pochi secondi un riassunto strutturato con capitoli, timestamp cliccabili e punti chiave. Ideale per lezioni, podcast e meeting.",
    icon: Video,
    highlights: [
      { title: "Qualsiasi piattaforma", desc: "YouTube, Vimeo, Loom e altri link video.", icon: Video },
      { title: "Capitoli automatici", desc: "Suddivisione in capitoli con titoli generati dall'AI.", icon: FileText },
      { title: "Timestamp interattivi", desc: "Clicca un orario e salta al momento esatto del video.", icon: MessageSquare },
    ],
    keyPoints: ["Risparmia fino al 90% del tempo di visione", "Estrae citazioni e statistiche rilevanti", "Esporta in TXT, PDF, SRT e Markdown", "Funziona anche con video lunghi >2h"],
    faqs: [
      { q: "Quali link sono supportati?", a: "Qualsiasi URL video pubblico con audio: YouTube, Vimeo, Loom, Drive con video. Basta incollare il link nella chat." },
      { q: "Deve avere i sottotitoli?", a: "No, se mancano i sottotitoli l'AI trascrive l'audio automaticamente." },
      { q: "Posso analizzare un intero canale?", a: "Sì, incolla il link del canale e scegli 'Intero Canale' per trascrivere fino a 10 video." },
    ],
  },
  {
    slug: "file-synthesis",
    title: "Sintesi di File & Foto",
    shortDesc: "Carica PDF, DOCX, PPT o foto e ottieni la sintesi.",
    longDesc: "Trascina documenti o immagini con testo e lascia che l'AI estragga concetti, tabelle e riassunti. Perfetto per paper, slide e fatture fotografate.",
    icon: FileText,
    highlights: [
      { title: "PDF & DOCX", desc: "Estrazione testo pulita anche da PDF scansionati.", icon: FileText },
      { title: "Foto con OCR", desc: "Riconosce testo in foto e screenshot.", icon: Video },
      { title: "Tabelle e dati", desc: "Mantiene struttura di tabelle e elenchi.", icon: Settings },
    ],
    keyPoints: ["Supporta PDF, DOCX, TXT, PPTX, PNG/JPG", "OCR multilingua integrato", "Riassunto con livello di dettaglio regolabile", "Domande sul documento in chat"],
    faqs: [
      { q: "Dimensione massima file?", a: "Fino a 20MB per file, con estrazione fino a 16k caratteri per l'AI." },
      { q: "La formattazione viene mantenuta?", a: "Sì, titoli, elenchi e tabelle sono preservati nel riassunto." },
      { q: "Posso caricare più file?", a: "Uno alla volta, ma puoi concatenare più sintesi nella stessa chat." },
    ],
  },
  {
    slug: "ai-agent",
    title: "Agente AI Interattivo",
    shortDesc: "Chiacchiera con i tuoi contenuti per approfondire.",
    longDesc: "Non fermarti al riassunto: interroga il video o il documento come se fosse un tutor. L'agente ricorda il contesto e risponde con fonti e timestamp.",
    icon: MessageSquare,
    highlights: [
      { title: "Chat contestuale", desc: "L'AI ricorda video, trascrizione e documenti caricati.", icon: MessageSquare },
      { title: "Domande suggerite", desc: "Suggerimenti generati in base al contenuto.", icon: Globe },
      { title: "Fonti citate", desc: "Ogni risposta include timestamp o pagina di riferimento.", icon: Download },
    ],
    keyPoints: ["Risposte con citazioni verificabili", "Cambia tono: formale, semplice, bullet", "Crea quiz e flashcard dal contenuto", "Esporta la chat in TXT/JSON/Markdown"],
    faqs: [
      { q: "L'agente inventa risposte?", a: "No, risponde solo basandosi su trascrizione e documenti forniti; se non sa, lo dice." },
      { q: "Posso correggere una risposta?", a: "Sì, usa Rigenera o modifica la domanda e l'AI riscrive." },
      { q: "Ricorda le chat precedenti?", a: "Ogni chat è separata, ma puoi riaprire trascrizioni passate dalla pagina Trascrizioni." },
    ],
  },
  {
    slug: "advanced-customization",
    title: "Personalizzazione Avanzata",
    shortDesc: "Scegli lunghezza, tono e focus del riassunto.",
    longDesc: "Decidi quanto deve essere lungo il riassunto, il registro linguistico e l'obiettivo: studio, meeting, social. L'AI si adatta al tuo caso d'uso.",
    icon: Settings,
    highlights: [
      { title: "Lunghezza", desc: "Da tweet a report dettagliato.", icon: Settings },
      { title: "Tono", desc: "Accademico, amichevole, tecnico o semplice.", icon: MessageSquare },
      { title: "Focus", desc: "Solo decisioni, solo dati o solo task.", icon: FileText },
    ],
    keyPoints: ["Preset Studio, Lavoro, Creator", "Lingua di output indipendente dall'input", "Salva preferenze in Impostazioni", "Prompt personalizzati per team"],
    faqs: [
      { q: "Posso salvare un preset?", a: "Sì, in Impostazioni > Preferenze salvi lingua, formato export e stile preferito." },
      { q: "Cambia anche i timestamp?", a: "Sì, se scegli 'solo momenti chiave' i timestamp sono filtrati." },
      { q: "Funziona in inglese?", a: "Sì, riassumi in inglese anche se il video è in italiano." },
    ],
  },
  {
    slug: "multilingual-analysis",
    title: "Analisi Multilingua",
    shortDesc: "Trascrivi e riassumi in oltre 50 lingue.",
    longDesc: "Supera le barriere linguistiche: trascrizione e riassunto in italiano anche da video in inglese, spagnolo, francese e altre 50 lingue.",
    icon: Globe,
    highlights: [
      { title: "50+ lingue", desc: "Riconoscimento automatico lingua sorgente.", icon: Globe },
      { title: "Traduzione contestuale", desc: "Riassunto nella tua lingua preferita.", icon: MessageSquare },
      { title: "Sottotitoli conservati", desc: "Timestamp allineati anche dopo traduzione.", icon: Video },
    ],
    keyPoints: ["Auto-detect lingua", "Output in lingua scelta in Impostazioni", "Mantiene termini tecnici originali", "Ideale per corsi e conferenze estere"],
    faqs: [
      { q: "Devo specificare la lingua?", a: "No, è rilevata automaticamente; puoi forzare l'output in Impostazioni." },
      { q: "La traduzione è fedele?", a: "Sì, mantiene nomi, numeri e citazioni originali." },
      { q: "Funziona con accenti diversi?", a: "Sì, gestisce accenti e dialetti comuni." },
    ],
  },
  {
    slug: "smart-export",
    title: "Esportazione Intelligente",
    shortDesc: "Salva in PDF, Word, TXT, SRT e organizza.",
    longDesc: "Esporta riassunti e trascrizioni nel formato che preferisci, scegli la cartella di destinazione e tieni tutto ordinato per progetto.",
    icon: Download,
    highlights: [
      { title: "Formati multipli", desc: "TXT, JSON, Markdown, SRT (sottotitoli).", icon: Download },
      { title: "Cartella personalizzata", desc: "Scegli dove salvare le chat in Impostazioni.", icon: FileText },
      { title: "Condivisione rapida", desc: "Copia, scarica o condividi via link.", icon: Globe },
    ],
    keyPoints: ["SRT con timestamp per editor video", "JSON per automazioni e API", "Percorso export configurabile", "Nome file automatico dal titolo video"],
    faqs: [
      { q: "Dove trovo i file esportati?", a: "In Download di sistema o nella cartella scelta in Impostazioni > Percorso esportazione." },
      { q: "Posso esportare la chat completa?", a: "Sì, dal menu della chat 'Esporta' scegli TXT/JSON/Markdown." },
      { q: "SRT è compatibile con YouTube?", a: "Sì, puoi caricare l'SRT come sottotitoli." },
    ],
  },
];

export function getFeatureBySlug(slug: string) {
  return featureDetails.find((f) => f.slug === slug);
}
