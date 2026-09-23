export interface ToolExtraData {
  slug: string;
  whatIs: string;
  howTo: string[];
  keyFeatures: string[];
  whoUses: { role: string; desc: string }[];
  related: { href: string; title: string }[];
  faqs: { q: string; a: string }[];
}

export const toolsExtra: Record<string, ToolExtraData> = {
  "transcript-cleaner": {
    slug: "transcript-cleaner",
    whatIs: "Transcript Cleaner rimuove timestamp, parole di riempimento (um, eh, tipo, cioè), etichette relatori e corregge spaziatura e punteggiatura. Funziona 100% nel browser, senza invio dati.",
    howTo: ["Incolla la trascrizione con timestamp e riempitivi", "Seleziona cosa rimuovere: timestamp, riempitivi, relatori, formattazione", "Copia l'output pulito e incollalo dove vuoi"],
    keyFeatures: ["Rimozione timestamp SRT/VTT e [00:00]", "Filtro 20+ parole di riempimento ITA/EN", "Rimozione etichette relatori 'Mario:'", "Correzione doppi spazi e punteggiatura"],
    whoUses: [{ role: "Podcaster", desc: "prepara show notes leggibili" }, { role: "Studenti", desc: "pulisce trascrizioni lezioni" }, { role: "Editor", desc: "prepara sottotitoli finali" }],
    related: [{ href: "/tools/subtitle-converter", title: "Subtitle Converter" }, { href: "/tools/subtitle-validator", title: "Subtitle Validator" }, { href: "/tools/timestamp-generator", title: "Timestamp Generator" }],
    faqs: [
      { q: "Mantiene i paragrafi?", a: "Sì, con 'Correggi Formattazione' i doppi a capo diventano paragrafi puliti senza spazi extra." },
      { q: "Posso mantenere i timestamp?", a: "Deseleziona 'Rimuovi Timestamp' per tenerli." },
      { q: "Funziona offline?", a: "Sì, tutto lato client, nessun dato inviato." },
    ],
  },
  "thumbnail-downloader": {
    slug: "thumbnail-downloader",
    whatIs: "Scarica qualsiasi thumbnail YouTube in 5 risoluzioni, da 120x90 a 1280x720. Basta incollare URL o ID video.",
    howTo: ["Incolla URL YouTube o ID di 11 caratteri", "Clicca Cerca per generare le 5 qualità", "Scarica con un click la risoluzione desiderata"],
    keyFeatures: ["5 qualità: default, mq, hq, sd, maxres", "Riconosce tutti i formati URL YouTube", "Download diretto senza watermark", "Anteprima con fallback se maxres non disponibile"],
    whoUses: [{ role: "Creator", desc: "recupera thumbnail per A/B test" }, { role: "Designer", desc: "moodboard e copertine" }, { role: "Social manager", desc: "post e anteprime" }],
    related: [{ href: "/tools/title-counter", title: "Title Counter" }, { href: "/tools/tag-generator", title: "Tag Generator" }, { href: "/tools/earnings-calculator", title: "Earnings Calculator" }],
    faqs: [
      { q: "Perché maxres a volte non c'è?", a: "YouTube genera maxres solo per video con upload HD recente; usiamo fallback automatico." },
      { q: "Posso scaricare Shorts?", a: "Sì, supporta youtube.com/shorts/ e youtu.be." },
      { q: "Serve login?", a: "No, nessun login richiesto." },
    ],
  },
  "subtitle-converter": {
    slug: "subtitle-converter",
    whatIs: "Converti sottotitoli tra SRT, VTT e testo semplice in un click. Ideale per passare da YouTube a Premiere, o viceversa.",
    howTo: ["Incolla sottotitoli SRT o VTT", "Scegli formato destinazione", "Copia il risultato convertito"],
    keyFeatures: ["SRT ↔ VTT ↔ TXT bidirezionale", "Mantiene timing e numerazione", "Valida formato in automatico", "Copia con un click"],
    whoUses: [{ role: "Video editor", desc: "adatta sottotitoli per piattaforme diverse" }, { role: "Traduttori", desc: "passa da TXT a SRT" }, { role: "Creator", desc: "prepara caption per social" }],
    related: [{ href: "/tools/subtitle-validator", title: "Subtitle Validator" }, { href: "/tools/transcript-cleaner", title: "Transcript Cleaner" }, { href: "/tools/timestamp-generator", title: "Timestamp Generator" }],
    faqs: [
      { q: "Perde i timestamp in TXT?", a: "Sì, TXT rimuove i timecode mantenendo solo il testo." },
      { q: "Supporta UTF-8?", a: "Sì, accenti e emoji preservati." },
      { q: "Limite di dimensione?", a: "Testato fino a 500KB di sottotitoli." },
    ],
  },
  "tag-generator": {
    slug: "tag-generator",
    whatIs: "Genera tag YouTube ottimizzati dal titolo del video, con contatore limite 500 caratteri e suggerimenti per nicchia.",
    howTo: ["Inserisci argomento video e scegli categoria", "Clicca Genera Tag", "Rimuovi/aggiungi tag fino al limite e copia"],
    keyFeatures: ["Suggerimenti per 6 nicchie", "Contatore 500 caratteri con barra", "Tag composti 'parola + nicchia'", "Aggiunta tag personalizzati"],
    whoUses: [{ role: "YouTuber", desc: "SEO video" }, { role: "Marketer", desc: "ottimizzazione discoverability" }, { role: "Agenzie", desc: "batch di tag per clienti" }],
    related: [{ href: "/tools/title-counter", title: "Title Counter" }, { href: "/tools/thumbnail-downloader", title: "Thumbnail Downloader" }, { href: "/tools/earnings-calculator", title: "Earnings Calculator" }],
    faqs: [
      { q: "Quanti tag genera?", a: "Fino a 30, poi puoi filtrarne." },
      { q: "Supera i 500 caratteri?", a: "La barra diventa rossa; rimuovi tag per rientrare." },
      { q: "Sono in italiano?", a: "Sì, con parole chiave italiane per categoria." },
    ],
  },
  "earnings-calculator": {
    slug: "earnings-calculator",
    whatIs: "Stima guadagni YouTube da views e CPM, con preset nicchia (gaming, education) e traguardi YPP.",
    howTo: ["Inserisci views e CPM o usa preset nicchia", "Vedi stima lorda e netta", "Confronta traguardi 1k/10k/100k views"],
    keyFeatures: ["Preset CPM per 6 nicchie", "Calcolo lordo/netto", "Traguardi YPP integrati", "Condivisione stima"],
    whoUses: [{ role: "Creator", desc: "forecast entrate" }, { role: "MCN", desc: "valutazione canali" }, { role: "Brand", desc: "stima costo campagne" }],
    related: [{ href: "/tools/tag-generator", title: "Tag Generator" }, { href: "/tools/title-counter", title: "Title Counter" }, { href: "/tools/thumbnail-downloader", title: "Thumbnail Downloader" }],
    faqs: [
      { q: "CPM medio in Italia?", a: "2-6€, ma varia per nicchia e stagione." },
      { q: "Include YouTube Premium?", a: "No, solo pubblicità." },
      { q: "Dati salvati?", a: "No, calcolo locale." },
    ],
  },
  "subtitle-validator": {
    slug: "subtitle-validator",
    whatIs: "Valida sottotitoli rilevando timecode sovrapposti, velocità di lettura, didascalie vuote e durata troppo breve/lunga.",
    howTo: ["Incolla SRT/VTT", "Clicca Valida", "Correggi errori evidenziati"],
    keyFeatures: ["Rileva sovrapposizioni", "Controllo CPS (caratteri/sec)", "Didascalie vuote e timing anomali", "Report con riga errore"],
    whoUses: [{ role: "Sottotitolatori", desc: "QA prima di consegna" }, { role: "Aziende e-learning", desc: "accessibilità" }, { role: "Creator", desc: "sottotitoli perfetti" }],
    related: [{ href: "/tools/subtitle-converter", title: "Subtitle Converter" }, { href: "/tools/transcript-cleaner", title: "Transcript Cleaner" }, { href: "/tools/timestamp-generator", title: "Timestamp Generator" }],
    faqs: [
      { q: "Quale CPS è ok?", a: "Sotto 17 CPS per lettura confortevole." },
      { q: "Supporta VTT?", a: "Sì, entrambi." },
      { q: "Segnala errori minori?", a: "Sì, con warning giallo per durata breve." },
    ],
  },
  "timestamp-generator": {
    slug: "timestamp-generator",
    whatIs: "Genera capitoli YouTube da trascrizione o timestamp manuali, validando formato 00:00 e ordine.",
    howTo: ["Incolla trascrizione o timestamp 00:00 - Titolo", "Genera e valida ordine", "Copia capitoli pronti per descrizione YouTube"],
    keyFeatures: ["Auto-detect 00:00 nella trascrizione", "Validazione ordine crescente", "Formato YouTube Chapters compatibile", "Copia con un click"],
    whoUses: [{ role: "Podcaster", desc: "capitoli episodi" }, { role: "YouTuber", desc: "descrizione con chapters" }, { role: "Formatori", desc: "indice lezioni" }],
    related: [{ href: "/tools/transcript-cleaner", title: "Transcript Cleaner" }, { href: "/tools/subtitle-converter", title: "Subtitle Converter" }, { href: "/tools/show-notes", title: "Show Notes Generator" }],
    faqs: [
      { q: "Primo capitolo deve essere 00:00?", a: "Sì, YouTube lo richiede per attivare i chapters." },
      { q: "Quanti capitoli?", a: "Minimo 3, consigliato ogni 2-3 minuti." },
      { q: "Supporta ore 01:23:45?", a: "Sì, h:mm:ss." },
    ],
  },
  "script-timer": {
    slug: "script-timer",
    whatIs: "Calcola durata video dal copione a 3 velocità (lenta/media/veloce) con conteggio parole.",
    howTo: ["Incolla copione", "Vedi stima 130/150/180 wpm", "Adatta tagli per durata target"],
    keyFeatures: ["3 velocità lettura", "Conteggio parole e caratteri", "Stima per Shorts/Reels", "Copia stima"],
    whoUses: [{ role: "Sceneggiatori", desc: "timing video" }, { role: "Speaker", desc: "prepara registrazione" }, { role: "Creator", desc: "rispetta durata" }],
    related: [{ href: "/tools/title-counter", title: "Title Counter" }, { href: "/tools/show-notes", title: "Show Notes Generator" }, { href: "/tools/timestamp-generator", title: "Timestamp Generator" }],
    faqs: [
      { q: "WPM medi?", a: "Lenta 130, media 150, veloce 180." },
      { q: "Include pause?", a: "No, aggiungi 5-10% per pause naturali." },
      { q: "Per Shorts?", a: "Sotto 60s ottimale." },
    ],
  },
  "title-counter": {
    slug: "title-counter",
    whatIs: "Conta caratteri/parole di titolo e descrizione YouTube con limiti colorati e anteprima SERP.",
    howTo: ["Inserisci titolo e descrizione", "Vedi conteggio live e semaforo", "Ottimizza per SERP"],
    keyFeatures: ["Limite titolo 100, descrizione 5000", "Semaforo verde/giallo/rosso", "Anteprima SERP Google/YouTube", "Conteggio parole"],
    whoUses: [{ role: "SEO", desc: "ottimizzazione titoli" }, { role: "Creator", desc: "evita troncamenti" }, { role: "Copywriter", desc: "limiti precisi" }],
    related: [{ href: "/tools/tag-generator", title: "Tag Generator" }, { href: "/tools/thumbnail-downloader", title: "Thumbnail Downloader" }, { href: "/tools/earnings-calculator", title: "Earnings Calculator" }],
    faqs: [
      { q: "Titolo ideale lunghezza?", a: "50-60 caratteri per non troncare in SERP." },
      { q: "Descrizione troncata?", a: "Dopo 100-150 caratteri in preview, ma indicizzata tutta." },
      { q: "Conta emoji?", a: "Sì, 1 carattere cadauna." },
    ],
  },
  "show-notes": {
    slug: "show-notes",
    whatIs: "Genera show notes per podcast da trascrizione, con template Minimal, Dettagliato e SEO e capitoli.",
    howTo: ["Incolla trascrizione podcast", "Scegli template", "Copia show notes pronte"],
    keyFeatures: ["3 template", "Capitoli con timestamp", "Link e CTA estratti", "SEO keywords integrate"],
    whoUses: [{ role: "Podcaster", desc: "note puntata" }, { role: "Editor", desc: "descrizione episodio" }, { role: "Marketer", desc: "contenuti derivati" }],
    related: [{ href: "/tools/transcript-cleaner", title: "Transcript Cleaner" }, { href: "/tools/timestamp-generator", title: "Timestamp Generator" }, { href: "/tools/script-timer", title: "Script Timer" }],
    faqs: [
      { q: "Template quale scegliere?", a: "Minimal per descrizione breve, SEO per ranking." },
      { q: "Include ospiti?", a: "Sì, se menzionati nella trascrizione." },
      { q: "Lingua?", a: "Mantiene lingua originale." },
    ],
  },
};
