"use client";

import { useState, useMemo, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mic, Copy, Check, FileText } from "lucide-react";

type Template = "minimal" | "detailed" | "seo";

function generateMinimal(transcript: string): string {
  const lines = transcript.split("\n").filter(Boolean);
  const topics = lines.slice(0, 5).map((l) => `- ${l.replace(/^[\d:.,\s-]+/, "").trim()}`).filter(Boolean);

  return `## Riepilogo Episodio

Una panoramica rapida degli argomenti trattati in questo episodio.

## Argomenti Principali

${topics.length > 0 ? topics.join("\n") : "- Argomento principale discusso in questo episodio"}

## Citazioni Rilevanti

> "${lines[0]?.replace(/^[\d:.,\s-]+/, "").trim() || "Citazione dall'episodio"}"
`;
}

function generateDetailed(transcript: string): string {
  const lines = transcript.split("\n").filter(Boolean);
  const segments = lines.slice(0, 8).map((l, i) => {
    const clean = l.replace(/^[\d:.,\s-]+/, "").trim();
    return clean ? `[${i + 1}:00] ${clean}` : null;
  }).filter(Boolean);

  return `## Panoramica Episodio

Una ripartizione completa del contenuto di questo episodio e delle discussioni chiave.

## Momenti Salienti con Timestamp

${segments.join("\n")}

## Punti Chiave

- Approfondimento chiave dalla discussione
- Punto importante sollevato dal conduttore
- Consiglio pratico condiviso in questo episodio

## Risorse Menzionate

- Risorse e link menzionati durante l'episodio

## Informazioni Ospiti

Informazioni sugli ospiti (se applicabile)

## Connettiti

- Segui il programma per altri episodi
- Iscriviti e lascia una recensione
`;
}

function generateSEO(transcript: string): string {
  const lines = transcript.split("\n").filter(Boolean);
  const firstLine = lines[0]?.replace(/^[\d:.,\s-]+/, "").trim() || "";
  const words = firstLine.split(/\s+/).filter(Boolean);
  const title = words.slice(0, 8).join(" ") || "Titolo Episodio";

  const topics = lines.slice(0, 6).map((l) => {
    const clean = l.replace(/^[\d:.,\s-]+/, "").trim();
    return clean || null;
  }).filter(Boolean);

  return `# ${title}

## Titolo Episodio
${title}

## Note dello Show

Unisciti a noi in questo episodio mentre esploriamo ${firstLine.toLowerCase() || "l'argomento in questione"}. Approfondiamo gli spunti chiave e condividiamo prospettive preziose che non vorrai perdere.

## Cosa Imparerai

${topics.map((t) => `- ${t}`).join("\n")}

## Timestamp

${lines.slice(0, 5).map((_, i) => `- [${i + 1}:00] - Argomento ${i + 1}`).join("\n")}

## Link e Risorse

- [Link alle risorse discusse]

## Info sul Conduttore

Scopri di più sul conduttore e sulla missione del programma.

## Iscriviti e Recensisci

Se ti è piaciuto questo episodio, iscriviti e lascia una recensione a 5 stelle!

## Parole Chiave

${topics.slice(0, 8).join(", ")}

## Trascrizione

${transcript}
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
    <div className="min-h-screen bg-white bg-[radial-gradient(#e5e7eb_0.5px,transparent_0.5px)] bg-[length:24px_24px]">
      <Navbar />
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-700 text-xs font-bold uppercase tracking-wider mb-6">
              Strumento
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              Podcast Show Notes Generator
            </h1>
            <p className="text-gray-500">
              Crea note show professionali per podcast dalla tua trascrizione.
              Scegli tra template Minimal, Dettagliato o SEO.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Trascrizione
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Incolla la trascrizione del podcast qui..."
              rows={8}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 outline-none transition-all text-sm resize-y"
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
                    ? "border-fuchsia-500 bg-fuchsia-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <p className="text-sm font-bold text-gray-900">{t.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>

          {output && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-fuchsia-500" />
                  <span className="text-sm font-bold text-gray-700">
                    Note Show
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-sm font-semibold text-fuchsia-600 hover:text-fuchsia-800 transition-colors"
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
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-200">
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
