"use client";

import { useState, useMemo, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Eraser, Copy, Check, RotateCcw } from "lucide-react";

export default function TranscriptCleanerPage() {
  const [input, setInput] = useState("");
  const [removeTimestamps, setRemoveTimestamps] = useState(true);
  const [removeFillers, setRemoveFillers] = useState(true);
  const [removeSpeakers, setRemoveSpeakers] = useState(false);
  const [fixFormatting, setFixFormatting] = useState(true);
  const [copied, setCopied] = useState(false);

  const fillerWords = [
    "um", "uh", "ah", "er", "like", "you know", "actually", "basically",
    "literally", "honestly", "i mean", "sort of", "kind of", "you see",
    "well", "so", "anyway", "right",
    "tipo", "cioè", "praticamente", "fondamentalmente", "diciamo",
    "ecco", "allora", "insomma", "beh", "dunque", "mmh",
  ];

  const clean = useCallback((text: string) => {
    let result = text;

    if (removeTimestamps) {
      result = result.replace(/\d{1,2}:\d{2}(?::\d{2})?(?:[,\.]\d{3})?\s*(?:-->|,)?\s*(?:\d{1,2}:\d{2}(?::\d{2})?(?:[,\.]\d{3})?)?\s*/g, "");
      result = result.replace(/\[\d{1,2}:\d{2}(?::\d{2})?[,\.]?\d*\]/g, "");
      result = result.replace(/\(\d{1,2}:\d{2}(?::\d{2})?[,\.]?\d*\)/g, "");
    }

    if (removeSpeakers) {
      result = result.replace(/^[A-Za-z\s]+:\s*/gm, "");
      result = result.replace(/^\[[A-Za-z\s]+\]\s*/gm, "");
    }

    if (removeFillers) {
      const pattern = new RegExp(
        `\\b(${fillerWords.join("|")})\\b[,\\s]*`,
        "gi"
      );
      result = result.replace(pattern, "");
    }

    if (fixFormatting) {
      result = result.replace(/\n{3,}/g, "\n\n");
      result = result.replace(/[^\S\n]+/g, " ");
      result = result.replace(/\s*([.!?])\s*/g, "$1 ");
      result = result.trim();
    }

    return result;
  }, [removeTimestamps, removeFillers, removeSpeakers, fixFormatting]);

  const output = useMemo(() => clean(input), [input, clean]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setInput("");
    setRemoveTimestamps(true);
    setRemoveFillers(true);
    setRemoveSpeakers(false);
    setFixFormatting(true);
  };

  return (
    <div className="min-h-screen bg-white bg-[radial-gradient(#e5e7eb_0.5px,transparent_0.5px)] bg-[length:24px_24px]">
      <Navbar />
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-6">
              Strumento
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              Transcript Cleaner
            </h1>
            <p className="text-gray-500">
              Rimuovi timestamp, parole di riempimento, etichette relatori e
              correggi la formattazione in qualsiasi trascrizione.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
            <div className="flex flex-wrap gap-4 mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={removeTimestamps}
                  onChange={(e) => setRemoveTimestamps(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Rimuovi Timestamp
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={removeFillers}
                  onChange={(e) => setRemoveFillers(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Rimuovi Parole di Riempimento
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={removeSpeakers}
                  onChange={(e) => setRemoveSpeakers(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Rimuovi Etichette Relatori
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fixFormatting}
                  onChange={(e) => setFixFormatting(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Correggi Formattazione
                </span>
              </label>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Trascrizione Input
                </label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Incolla la tua trascrizione qui..."
                  rows={14}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-sm resize-y"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-gray-700">
                    Output Pulito
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <RotateCcw size={14} />
                      Reimposta
                    </button>
                    {output && (
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-800 transition-colors"
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
                    )}
                  </div>
                </div>
                <textarea
                  value={output}
                  readOnly
                  rows={14}
                  placeholder="La trascrizione pulita apparirà qui..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm resize-y"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
