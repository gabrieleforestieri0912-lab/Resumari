"use client";

import { useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { FileText, Copy, Check, ArrowRightLeft } from "lucide-react";

type Format = "srt" | "vtt" | "txt";

function parseTime(time: string): number {
  const parts = time.replace(",", ".").split(/[:.]/);
  if (parts.length === 4) {
    return +parts[0] * 3600 + +parts[1] * 60 + +parts[2] + +parts[3] / 1000;
  }
  if (parts.length === 3) {
    return +parts[0] * 60 + +parts[1] + +parts[2] / 1000;
  }
  return 0;
}

function formatTimeSRT(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function formatTimeVTT(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

function srtToVtt(srt: string): string {
  let vtt = "WEBVTT\n\n";
  vtt += srt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
  return vtt;
}

function vttToSrt(vtt: string): string {
  return vtt
    .replace(/^WEBVTT.*\n/i, "")
    .replace(/^\s*[\d]+\s*$/gm, "")
    .replace(/(\d{2}:\d{2}:\d{2})\.(\d{3})/g, "$1,$2")
    .trim();
}

function srtToTxt(srt: string): string {
  return srt
    .replace(/\d+\s*\n/g, "")
    .replace(/\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function vttToTxt(vtt: string): string {
  return vtt
    .replace(/^WEBVTT.*\n/i, "")
    .replace(/\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}\s*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const converters: Record<string, (input: string) => string> = {
  "srt-vtt": srtToVtt,
  "srt-txt": srtToTxt,
  "vtt-srt": vttToSrt,
  "vtt-txt": vttToTxt,
};

export default function SubtitleConverterPage() {
  const [input, setInput] = useState("");
  const [from, setFrom] = useState<Format>("srt");
  const [to, setTo] = useState<Format>("vtt");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  const convert = useCallback(() => {
    if (!input.trim()) return;
    const key = `${from}-${to}`;
    if (from === to) {
      setOutput(input);
      return;
    }
    if (from === "txt") {
      setOutput(input);
      return;
    }
    const fn = converters[key];
    if (fn) {
      setOutput(fn(input));
    } else {
      setOutput(input);
    }
  }, [input, from, to]);

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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-6">
              Strumento
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              Subtitle Format Converter
            </h1>
            <p className="text-gray-500">
              Converti tra formati SRT, VTT e testo semplice all'istante.
              Incolla, converti, copia.
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 mb-8">
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value as Format)}
              className="px-4 py-2.5 rounded-xl border border-gray-300 font-bold text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="srt">SRT</option>
              <option value="vtt">VTT</option>
              <option value="txt">Testo normale</option>
            </select>
            <ArrowRightLeft className="text-gray-400" size={24} />
            <select
              value={to}
              onChange={(e) => setTo(e.target.value as Format)}
              className="px-4 py-2.5 rounded-xl border border-gray-300 font-bold text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="vtt">VTT</option>
              <option value="srt">SRT</option>
              <option value="txt">Testo normale</option>
            </select>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Input
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Incolla il contenuto ${from.toUpperCase()} qui...`}
                rows={12}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm font-mono resize-y"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-gray-700">
                  Output
                </label>
                {output && (
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
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
              <textarea
                value={output}
                readOnly
                rows={12}
                placeholder="Il risultato convertito apparirà qui..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-mono resize-y"
              />
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={convert}
              className="px-8 py-3 bg-linear-to-r from-blue-500 to-cyan-600 text-white font-bold rounded-xl hover:scale-[1.02] transition-all shadow-lg shadow-blue-500/25 inline-flex items-center gap-2"
            >
              <FileText size={18} />
              Converti in {to.toUpperCase()}
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
