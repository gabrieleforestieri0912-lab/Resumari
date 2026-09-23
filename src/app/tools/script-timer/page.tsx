"use client";

import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ToolExtraSections from "@/components/tools/ToolExtraSections";
import Breadcrumb from "@/components/Breadcrumb";
import { Clock, FileText } from "lucide-react";

const WPM = { slow: 120, average: 150, fast: 180 };

function estimateDuration(wc: number, wpm: number): string {
  // Round the total first so a carry-over never produces "1:60" (e.g.
  // 59.6s would previously round seconds to 60).
  const totalSec = Math.round((wc / wpm) * 60);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

export default function ScriptTimerPage() {
  const [script, setScript] = useState("");

  const stats = useMemo(() => {
    const trimmed = script.trim();
    if (!trimmed) return null;
    const words = trimmed.split(/\s+/).filter(Boolean).length;
    const chars = trimmed.length;
    const lines = trimmed.split("\n").filter(Boolean).length;
    return { words, chars, lines };
  }, [script]);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 bg-[radial-gradient(#e5e7eb_0.5px,transparent_0.5px)] dark:bg-[radial-gradient(#27272a_0.5px,transparent_0.5px)] bg-[length:24px_24px]">
      <Navbar />
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Strumenti", href: "/tools" }, { label: "Video Script Timer" }]} className="mb-6" />
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/40 border border-purple-200 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-6">
              Strumento
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-zinc-100 mb-4">
              Video Script Timer
            </h1>
            <p className="text-gray-500 dark:text-zinc-400">
              Incolla il tuo copione e ottieni la durata stimata del video a velocità
              di lettura lenta, media e veloce.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6 mb-8">
            <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">
              Il tuo copione
            </label>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Incolla il tuo copione qui..."
              rows={12}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-zinc-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all text-sm resize-y"
            />
          </div>

          {stats && (
            <div className="grid gap-4 sm:grid-cols-3 mb-8">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-5 text-center">
                <p className="text-2xl font-black text-gray-900 dark:text-zinc-100">
                  {stats.words}
                </p>
                <p className="text-sm text-gray-500 dark:text-zinc-400 font-semibold mt-1">
                  Parole
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-5 text-center">
                <p className="text-2xl font-black text-gray-900 dark:text-zinc-100">
                  {stats.chars}
                </p>
                <p className="text-sm text-gray-500 dark:text-zinc-400 font-semibold mt-1">
                  Caratteri
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-5 text-center">
                <p className="text-2xl font-black text-gray-900 dark:text-zinc-100">
                  {stats.lines}
                </p>
                <p className="text-sm text-gray-500 dark:text-zinc-400 font-semibold mt-1">
                  Righe
                </p>
              </div>
            </div>
          )}

          {stats && (
            <div className="grid gap-4 sm:grid-cols-3">
              {([
                { speed: "Lento", key: "slow" as const, color: "bg-green-50 dark:bg-green-950/40 border-green-200 text-green-700 dark:text-green-300", wpm: WPM.slow },
                { speed: "Medio", key: "average" as const, color: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-amber-700 dark:text-amber-300", wpm: WPM.average },
                { speed: "Veloce", key: "fast" as const, color: "bg-red-50 dark:bg-red-950/40 border-red-200 text-red-700 dark:text-red-300", wpm: WPM.fast },
              ]).map(({ speed, key, color, wpm }) => (
                <div
                  key={key}
                  className={`rounded-2xl border p-5 text-center ${color}`}
                >
                  <p className="text-sm font-bold uppercase tracking-wider mb-1">
                    {speed}
                  </p>
                  <p className="text-3xl font-black">
                    {estimateDuration(stats.words, wpm)}
                  </p>
                  <p className="text-xs font-semibold mt-1 opacity-75">
                    {wpm} WPM
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        <ToolExtraSections slug="script-timer" />
      </main>
      <Footer />
    </div>
  );
}
