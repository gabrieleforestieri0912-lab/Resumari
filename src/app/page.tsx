import HomePage from "../components/HomePage";

// FAQPage structured data mirrors the visible FAQ on the landing page, so
// answer engines (Google AI Overviews, ChatGPT, Perplexity) can cite it.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Come funziona il riassunto video?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Basta incollare il link del video (es. da YouTube) nella barra di ricerca. La nostra IA analizza l'audio e il testo, estraendo i punti chiave per fornirti un riassunto conciso e strutturato in pochi secondi.",
      },
    },
    {
      "@type": "Question",
      name: "Quali tipi di file posso riassumere?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Oltre ai video, puoi caricare documenti di testo come PDF, DOCX e TXT, presentazioni PowerPoint e persino immagini contenenti testo (OCR). Il sistema processa il contenuto e genera un'analisi dettagliata.",
      },
    },
    {
      "@type": "Question",
      name: "C'è un limite di lunghezza per i riassunti?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No, la nostra tecnologia è scalabile. Gestiamo sia brevi clip che lunghe conferenze o corposi documenti legali, adattando la densità del riassunto per non perdere mai le informazioni cruciali.",
      },
    },
    {
      "@type": "Question",
      name: "Posso personalizzare il tono del riassunto?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Assolutamente. Dopo la generazione, puoi interagire con l'Agente AI per chiedere di cambiare il registro (es. più formale o più semplice), estrarre solo i dati tecnici o creare una lista di task operativi.",
      },
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <HomePage />
    </>
  );
}
