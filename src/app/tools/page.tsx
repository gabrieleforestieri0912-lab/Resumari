"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Image,
  FileText,
  Clock,
  Eraser,
  Hash,
  CheckSquare,
  List,
  DollarSign,
  Tag,
  Mic,
} from "lucide-react";

const tools = [
  {
    href: "/tools/thumbnail-downloader",
    icon: Image,
    title: "YouTube Thumbnail Downloader",
    description:
      "Scarica thumbnail YouTube in tutte le risoluzioni disponibili — da 120x90 a Full HD 1280x720.",
    color: "from-rose-500 to-pink-600",
  },
  {
    href: "/tools/subtitle-converter",
    icon: FileText,
    title: "Subtitle Format Converter",
    description:
      "Converti tra formati SRT, VTT e testo semplice all'istante. Incolla, converti, copia.",
    color: "from-blue-500 to-cyan-600",
  },
  {
    href: "/tools/script-timer",
    icon: Clock,
    title: "Video Script Timer",
    description:
      "Incolla il tuo copione e ottieni la durata stimata del video a velocità di lettura lenta, media e veloce.",
    color: "from-amber-500 to-orange-600",
  },
  {
    href: "/tools/transcript-cleaner",
    icon: Eraser,
    title: "Transcript Cleaner",
    description:
      "Rimuovi timestamp, parole di riempimento, etichette relatori e correggi la formattazione in qualsiasi trascrizione.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    href: "/tools/title-counter",
    icon: Hash,
    title: "YouTube Title & Description Counter",
    description:
      "Conteggio caratteri e parole in tempo reale con limiti colorati e anteprima SERP live.",
    color: "from-violet-500 to-purple-600",
  },
  {
    href: "/tools/subtitle-validator",
    icon: CheckSquare,
    title: "Subtitle Validator",
    description:
      "Controlla i sottotitoli per timecode sovrapposti, problemi di velocità di lettura, didascalie vuote e altro.",
    color: "from-indigo-500 to-blue-600",
  },
  {
    href: "/tools/timestamp-generator",
    icon: List,
    title: "YouTube Timestamp & Chapter Generator",
    description:
      "Crea capitoli compatibili YouTube dalla trascrizione o da timestamp manuali. Convalida il formato automaticamente.",
    color: "from-red-500 to-rose-600",
  },
  {
    href: "/tools/earnings-calculator",
    icon: DollarSign,
    title: "YouTube Earnings Calculator",
    description:
      "Stima i guadagni pubblicitari YouTube da visualizzazioni e CPM. Include preset per nicchia e traguardi YPP.",
    color: "from-green-500 to-emerald-600",
  },
  {
    href: "/tools/tag-generator",
    icon: Tag,
    title: "YouTube Tag Generator",
    description:
      "Genera tag YouTube ottimizzati dal tuo argomento video. Mostra il contatore del limite di 500 caratteri.",
    color: "from-sky-500 to-blue-600",
  },
  {
    href: "/tools/show-notes",
    icon: Mic,
    title: "Podcast Show Notes Generator",
    description:
      "Crea note show professionali per podcast dalla tua trascrizione. Scegli tra template Minimal, Dettagliato o SEO.",
    color: "from-fuchsia-500 to-pink-600",
  },
];

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-white bg-[radial-gradient(#e5e7eb_0.5px,transparent_0.5px)] bg-[length:24px_24px]">
      <Navbar />
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold uppercase tracking-wider mb-6">
              Strumenti Gratuiti
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-4 tracking-tight">
              Free YouTube Tools
            </h1>
            <p className="text-xl text-gray-500 font-semibold mb-3">
              Nessuna registrazione. Nessun costo API. 100% lato client.
            </p>
            <p className="text-gray-400 max-w-xl mx-auto">
              Tutto funziona nel tuo browser — i tuoi dati non lasciano mai il
              tuo dispositivo.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group relative bg-white rounded-2xl border border-gray-200 p-6 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 hover:border-gray-300"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-linear-to-br ${tool.color} flex items-center justify-center mb-4 shadow-lg`}
                >
                  <tool.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                  {tool.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {tool.description}
                </p>
                <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-purple-600 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                  <span>Prova ora</span>
                  <span className="text-lg leading-none">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
