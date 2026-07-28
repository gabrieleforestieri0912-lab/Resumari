"use client";

import { useState, useMemo, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { List, Copy, Check, Plus, Trash2, AlertCircle } from "lucide-react";

interface Chapter {
  timestamp: string;
  title: string;
}

function timestampToSeconds(ts: string): number {
  const parts = ts.split(":");
  if (parts.length === 3) {
    return +parts[0] * 3600 + +parts[1] * 60 + +parts[2];
  }
  if (parts.length === 2) {
    return +parts[0] * 60 + +parts[1];
  }
  return +parts[0] || 0;
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function parseTranscriptForChapters(text: string): { timestamp: string; title: string }[] {
  const lines = text.split("\n");
  const chapters: Chapter[] = [];
  const tsRegex = /(?:^|\s)(\d{1,2}:\d{2}(?::\d{2})?)(?:\s*[-–—]?\s*)(.+)/;

  for (const line of lines) {
    const match = line.match(tsRegex);
    if (match) {
      chapters.push({ timestamp: match[1], title: match[2].trim() });
    }
  }
  return chapters;
}

export default function TimestampGeneratorPage() {
  const [transcript, setTranscript] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([
    { timestamp: "0:00", title: "Introduction" },
  ]);
  const [copied, setCopied] = useState(false);
  const [validationMsg, setValidationMsg] = useState("");

  const generateFromTranscript = useCallback(() => {
    if (!transcript.trim()) return;
    const parsed = parseTranscriptForChapters(transcript);
    if (parsed.length > 0) {
      setChapters(parsed);
      setValidationMsg("");
    } else {
      setValidationMsg(
        "Nessun timestamp trovato nella trascrizione. Assicurati che usino il formato: 0:00 - Titolo"
      );
    }
  }, [transcript]);

  const output = useMemo(() => {
    return chapters
      .map((c) => `${c.timestamp} ${c.title}`)
      .join("\n");
  }, [chapters]);

  const validation = useMemo(() => {
    const errors: string[] = [];
    const sorted = chapters
      .map((c, i) => ({ ...c, seconds: timestampToSeconds(c.timestamp), index: i }))
      .sort((a, b) => a.seconds - b.seconds);

    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].seconds === sorted[i - 1].seconds) {
        errors.push(`Capitolo "${sorted[i].title}" ha timestamp duplicato`);
      }
      if (!sorted[i].title.trim()) {
        errors.push(`Capitolo a ${sorted[i].timestamp} senza titolo`);
      }
      if (sorted[i].index !== i) {
        errors.push(`Capitolo "${sorted[i].title}" non in ordine`);
      }
    }
    return errors;
  }, [chapters]);

  const addChapter = () => {
    const last = chapters[chapters.length - 1];
    const lastSec = timestampToSeconds(last.timestamp);
    const newSec = formatTimestamp(lastSec + 60);
    setChapters([...chapters, { timestamp: newSec, title: "" }]);
  };

  const removeChapter = (index: number) => {
    if (chapters.length <= 1) return;
    setChapters(chapters.filter((_, i) => i !== index));
  };

  const updateChapter = (index: number, field: keyof Chapter, value: string) => {
    const updated = chapters.map((c, i) =>
      i === index ? { ...c, [field]: value } : c
    );
    setChapters(updated);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white bg-[radial-gradient(#e5e7eb_0.5px,transparent_0.5px)] bg-[length:24px_24px]">
      <Navbar />
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold uppercase tracking-wider mb-6">
              Strumento
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              YouTube Timestamp & Chapter Generator
            </h1>
            <p className="text-gray-500">
              Crea capitoli compatibili YouTube dalla trascrizione o da timestamp
              manuali. Convalida il formato automaticamente.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-gray-700">
            Trascrizione (opzionale)
              </label>
              <button
                onClick={generateFromTranscript}
                className="text-sm font-semibold text-red-600 hover:text-red-800 transition-colors"
              >
            Estrai Capitoli
              </button>
            </div>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={`Incolla la trascrizione con timestamp (es. "0:00 - Introduzione")`}
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all text-sm resize-y"
            />
            {validationMsg && (
              <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle size={14} />
                {validationMsg}
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-gray-700">Capitoli</span>
              <button
                onClick={addChapter}
                className="flex items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-800 transition-colors"
              >
                <Plus size={16} />
                Aggiungi Capitolo
              </button>
            </div>

            {validation.length > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                {validation.map((err, i) => (
                  <p key={i} className="text-xs text-amber-700 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {err}
                  </p>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {chapters.map((ch, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <input
                    type="text"
                    value={ch.timestamp}
                    onChange={(e) =>
                      updateChapter(i, "timestamp", e.target.value)
                    }
                    placeholder="0:00"
                    className="w-28 px-3 py-2 rounded-xl border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all text-sm font-mono text-center"
                  />
                  <input
                    type="text"
                    value={ch.title}
                    onChange={(e) =>
                      updateChapter(i, "title", e.target.value)
                    }
                    placeholder="Titolo capitolo"
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all text-sm"
                  />
                  <button
                    onClick={() => removeChapter(i)}
                    className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-gray-700">
                Output Capitoli YouTube
              </label>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-800 transition-colors"
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
            <textarea
              value={output}
              readOnly
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-mono resize-y"
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
