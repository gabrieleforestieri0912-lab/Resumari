"use client";

import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CheckSquare, AlertTriangle, XCircle } from "lucide-react";

interface ValidationIssue {
  type: "error" | "warning";
  line: number;
  message: string;
}

function parseSRT(srt: string) {
  const blocks = srt.trim().split(/\n\s*\n/);
  return blocks.map((block, i) => {
    const lines = block.trim().split("\n");
    const timeMatch = lines[1]?.match(
      /(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/
    );
    return {
      index: i + 1,
      start: timeMatch?.[1]?.replace(",", ".") || "",
      end: timeMatch?.[2]?.replace(",", ".") || "",
      text: lines.slice(2).join("\n").trim(),
    };
  });
}

function timeToSeconds(t: string): number {
  const p = t.split(/[:.]/);
  return +p[0] * 3600 + +p[1] * 60 + +p[2] + (+p[3] || 0) / 1000;
}

function validateSRT(srt: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const blocks = parseSRT(srt);

  if (blocks.length === 0) {
    issues.push({ type: "error", line: 0, message: "Nessun blocco sottotitoli trovato" });
    return issues;
  }

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (!b.start || !b.end) {
      issues.push({
        type: "error",
        line: i + 1,
        message: `Blocco ${b.index}: Timecode mancanti o non validi`,
      });
      continue;
    }

    const start = timeToSeconds(b.start);
    const end = timeToSeconds(b.end);

    if (end <= start) {
      issues.push({
        type: "error",
        line: i + 1,
        message: `Blocco ${b.index}: Il tempo di fine è precedente o uguale a quello di inizio`,
      });
    }

    if (!b.text) {
      issues.push({
        type: "warning",
        line: i + 1,
        message: `Blocco ${b.index}: Didascalia vuota`,
      });
    }

    const duration = end - start;
    const wordCount = b.text ? b.text.split(/\s+/).filter(Boolean).length : 0;
    if (duration > 0 && wordCount / duration > 3) {
      issues.push({
        type: "warning",
        line: i + 1,
        message: `Blocco ${b.index}: Velocità di lettura troppo alta (${(wordCount / duration).toFixed(1)} parole/sec, max consigliato: 3)`,
      });
    }

    if (i > 0) {
      const prev = blocks[i - 1];
      if (prev.end && b.start) {
        const prevEnd = timeToSeconds(prev.end);
        const currStart = timeToSeconds(b.start);
        if (currStart < prevEnd) {
          issues.push({
            type: "error",
            line: i + 1,
            message: `Blocco ${b.index}: Timecode sovrapposti con il blocco ${prev.index}`,
          });
        }
      }
    }

    if (duration < 1) {
      issues.push({
        type: "warning",
        line: i + 1,
        message: `Blocco ${b.index}: Durata molto breve (${duration.toFixed(1)}s)`,
      });
    }

    if (duration > 10) {
      issues.push({
        type: "warning",
        line: i + 1,
        message: `Blocco ${b.index}: Durata lunga (${duration.toFixed(1)}s), considera di dividere`,
      });
    }
  }

  return issues;
}

export default function SubtitleValidatorPage() {
  const [input, setInput] = useState("");

  const issues = useMemo(() => {
    if (!input.trim()) return [];
    return validateSRT(input);
  }, [input]);

  const errorCount = issues.filter((i) => i.type === "error").length;
  const warningCount = issues.filter((i) => i.type === "warning").length;

  return (
    <div className="min-h-screen bg-white bg-[radial-gradient(#e5e7eb_0.5px,transparent_0.5px)] bg-[length:24px_24px]">
      <Navbar />
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-6">
              Strumento
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              Subtitle Validator
            </h1>
            <p className="text-gray-500">
              Controlla i sottotitoli per timecode sovrapposti, problemi di
              velocità di lettura, didascalie vuote e altro.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Contenuto SRT
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Incolla il contenuto SRT qui...\n\nEsempio:\n1\n00:00:01,000 --> 00:00:04,000\nCiao, benvenuti nel mio video`}
              rows={12}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm font-mono resize-y"
            />
          </div>

          {input.trim() && (
            <>
              <div className="flex gap-4 mb-6">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 border border-green-200">
                  <CheckSquare size={18} className="text-green-600" />
                  <span className="text-sm font-bold text-green-700">
                    {parseSRT(input).length} blocchi
                  </span>
                </div>
                {errorCount > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200">
                    <XCircle size={18} className="text-red-600" />
                    <span className="text-sm font-bold text-red-700">
                      {errorCount} errori
                    </span>
                  </div>
                )}
                {warningCount > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200">
                    <AlertTriangle size={18} className="text-amber-600" />
                    <span className="text-sm font-bold text-amber-700">
                      {warningCount} avvisi
                    </span>
                  </div>
                )}
              </div>

              {issues.length > 0 && (
                <div className="space-y-2">
                  {issues.map((issue, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-4 rounded-xl border ${
                        issue.type === "error"
                          ? "bg-red-50 border-red-200"
                          : "bg-amber-50 border-amber-200"
                      }`}
                    >
                      {issue.type === "error" ? (
                        <XCircle
                          size={18}
                          className="text-red-500 mt-0.5 shrink-0"
                        />
                      ) : (
                        <AlertTriangle
                          size={18}
                          className="text-amber-500 mt-0.5 shrink-0"
                        />
                      )}
                      <div>
                        <p
                          className={`text-sm font-bold ${
                            issue.type === "error"
                              ? "text-red-700"
                              : "text-amber-700"
                          }`}
                        >
                          Riga {issue.line}
                        </p>
                        <p
                          className={`text-sm ${
                            issue.type === "error"
                              ? "text-red-600"
                              : "text-amber-600"
                          }`}
                        >
                          {issue.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {issues.length === 0 && (
                <div className="p-6 rounded-2xl bg-green-50 border border-green-200 text-center">
                  <CheckSquare size={24} className="text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-green-700">
                    Nessun problema trovato! I tuoi sottotitoli sono a posto.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
