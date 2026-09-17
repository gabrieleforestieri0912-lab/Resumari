"use client";

import { useState, useMemo, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import { Mic, Copy, Check, FileText } from "lucide-react";

type Template = "minimal" | "detailed" | "seo";

const STOPWORDS = new Set(
  (
    "il lo la le li i gli un una uno uno di a da in con su per tra fra il come che " +
    "che non è e di la un per con non una your this that with from are was were " +
    "the and for you we they our his her their have has had will can di che la il " +
    "un una ma poi anche più come quando perché quale chi cosa dove quale sono " +
    "siamo state stato fatto fare detti detto tutto ogni loro noi voi loro " +
    "questo questa quello quella esso essa ciò cui cui cui quale"
  ).split(/\s+/)
);

function cleanLine(line: string): string {
  return line
    .replace(/^[\d:.,\s\-–—]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Detects a leading timestamp (0:00, 1:23, 1:23:45) and returns it plus the
// remaining text. Used so real transcript timestamps survive into the output.
function splitTimestamp(line: string): { ts: string | null; text: string } {
  const m = line.match(/^\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—:.\s]*(.*)$/);
  if (m) return { ts: m[1], text: cleanLine(m[2]) };
  return { ts: null, text: cleanLine(line) };
}

function getLines(transcript: string): string[] {
  return transcript
    .split(/\r?\n/)
    .map((l) => cleanLine(l))
    .filter((l) => l.length > 2);
}

function topKeywords(transcript: string, limit: number): string[] {
  const freq = new Map<string, number>();
  for (const word of transcript.toLowerCase().match(/[a-zà-øA-ZÀ-Þ]{3,}/g) || []) {
    if (STOPWORDS.has(word)) continue;
    freq.set(word, (freq.get(word) || 0) + 1);
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

function generateMinimal(transcript: string): string {
  const lines = getLines(transcript);
  const title = lines[0] || "Titolo Episodio";
  const topics = lines
    .slice(1, 6)
    .map((l) => `- ${l}`)
    .join("\n");

  return `## Riepilogo Episodio

${title}

## Argomenti Principali

${topics || "- Nessun argomento rilevato nella trascrizione"}

## Citazione in Evidenza

> "${lines[0] || "Inserisci una trascrizione per estrarre una citazione."}"
`;
}

function generateDetailed(transcript: string): string {
  const lines = getLines(transcript);
  const title = lines[0] || "Titolo Episodio";
  const highlights = lines
    .slice(1, 9)
    .map((l, i) => `${i + 1}. ${l}`)
    .join("\n");

  return `## Panoramica Episodio

${title}

## Momenti Salienti

${highlights || "1. Nessun momento rilevato nella trascrizione"}

## Punti Chiave

${lines
  .slice(0, 5)
  .map((l) => `- ${l}`)
  .join("\n")}

## Trascrizione Pulita

${lines.map((l) => `- ${l}`).join("\n")}
`;
}

function generateSEO(transcript: string): string {
  const lines = getLines(transcript);
  const firstLine = lines[0] || "";
  const title = firstLine.slice(0, 80) || "Titolo Episodio";
  const keywords = topKeywords(transcript, 8);
  const learn = lines.slice(1, 7).map((l) => `- ${l}`).join("\n");

  // Keep real transcript timestamps when present, otherwise omit the section
  // instead of fabricating fake ones.
  const tsLines = getLines(transcript)
    .map(splitTimestamp)
    .filter((s) => s.ts);
  const timestampsSection = tsLines.length
    ? tsLines.map((s) => `- ${s.ts} ${s.text}`).join("\n")
    : "- (nessun timestamp rilevato nella trascrizione)";

  return `# ${title}

## Note dello Show

${firstLine || "Incolla la trascrizione per generare le note."}

## Cosa Imparerai

${learn || "- Nessun punto rilevato"}

## Timestamp

${timestampsSection}

## Parole Chiave

${keywords.length ? keywords.join(", ") : "nessuna parola chiave rilevata"}

## Trascrizione Completa

${lines.map((l) => `- ${l}`).join("\n")}
`;
}

const generators: Record<Template, (t: string) => string> = {
  minimal: generateMinimal,
  detailed: generateDetailed,
  seo: generateSEO,
};

export default function ShowNotesPage() {
  const [transcript, setTranscript] = useState("");
  const [template, setTemplate] = useState<Template>("detailed");
  const [copied, setCopied] = useState(false);

  const output = useMemo(
    () => (transcript.trim() ? generators[template](transcript) : ""),
    [transcript, template]
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 bg-[radial-gradient(#e5e7eb_0.5px,transparent_0.5px)] dark:bg-[radial-gradient(#27272a_0.5px,transparent_0.5px)] bg-[length:24px_24px]">
      <Navbar />
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Strumenti", href: "/tools" }, { label: "Podcast Show Notes Generator" }]} className="mb-6" />
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/40 border border-purple-200 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-6">
              Strumento
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-zinc-100 mb-4">
              Podcast Show Notes Generator
            </h1>
            <p className="text-gray-500 dark:text-zinc-400">
              Crea note show professionali per podcast dalla tua trascrizione.
              Scegli tra template Minimal, Dettagliato o SEO.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6 mb-8">
            <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">
              Trascrizione
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Incolla la trascrizione del podcast qui..."
              rows={8}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-zinc-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all text-sm resize-y"
            />
          </div>

          <div className="flex flex-wrap gap-3 mb-8">
            {([
              { key: "minimal" as const, label: "Minimal", desc: "Panoramica rapida" },
              { key: "detailed" as const, label: "Dettagliato", desc: "Analisi completa" },
              { key: "seo" as const, label: "SEO-Ottimizzato", desc: "Ottimale per ranking" },
            ]).map((t) => (
              <button
                key={t.key}
                onClick={() => setTemplate(t.key)}
                className={`flex-1 min-w-[120px] p-4 rounded-2xl border-2 transition-all text-center ${
                  template === t.key
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-950/40"
                    : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-gray-300 dark:hover:border-zinc-600"
                }`}
              >
                <p className="text-sm font-bold text-gray-900 dark:text-zinc-100">{t.label}</p>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>

          {output && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-purple-500" />
                  <span className="text-sm font-bold text-gray-700 dark:text-zinc-300">
                    Note Show
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-sm font-semibold text-purple-600 hover:text-purple-800 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check size={16} /> Copiato
                    </>
                  ) : (
                    <>
                      <Copy size={16} /> Copia
                    </>
                  )}
                </button>
              </div>
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-zinc-300 leading-relaxed bg-gray-50 dark:bg-zinc-800 rounded-xl p-4 border border-gray-200 dark:border-zinc-800">
                  {output}
                </pre>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
