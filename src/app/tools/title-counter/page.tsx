"use client";

import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import { Hash, Eye } from "lucide-react";

const TITLE_LIMIT = 100;
const DESC_LIMIT = 5000;

export default function TitleCounterPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const titleStats = useMemo(() => {
    const len = title.length;
    return {
      len,
      words: title.trim() ? title.trim().split(/\s+/).length : 0,
      percent: (len / TITLE_LIMIT) * 100,
      color:
        len > TITLE_LIMIT
          ? "text-red-500"
          : len > 70
          ? "text-amber-500"
          : "text-green-500",
      borderColor:
        len > TITLE_LIMIT
          ? "border-red-500"
          : len > 70
          ? "border-amber-500"
          : "border-gray-300 dark:border-zinc-700",
      barColor:
        len > TITLE_LIMIT
          ? "bg-red-50 dark:bg-red-950/400"
          : len > 70
          ? "bg-amber-50 dark:bg-amber-950/400"
          : "bg-green-50 dark:bg-green-950/400",
    };
  }, [title]);

  const descStats = useMemo(() => {
    const len = description.length;
    return {
      len,
      words: description.trim() ? description.trim().split(/\s+/).length : 0,
      percent: (len / DESC_LIMIT) * 100,
      color:
        len > DESC_LIMIT
          ? "text-red-500"
          : len > 4000
          ? "text-amber-500"
          : "text-green-500",
      barColor:
        len > DESC_LIMIT
          ? "bg-red-50 dark:bg-red-950/400"
          : len > 4000
          ? "bg-amber-50 dark:bg-amber-950/400"
          : "bg-blue-50 dark:bg-blue-950/400",
    };
  }, [description]);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 bg-[radial-gradient(#e5e7eb_0.5px,transparent_0.5px)] dark:bg-[radial-gradient(#27272a_0.5px,transparent_0.5px)] bg-[length:24px_24px]">
      <Navbar />
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Strumenti", href: "/tools" }, { label: "YouTube Title & Description Counter" }]} className="mb-6" />
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/40 border border-purple-200 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-6">
              Strumento
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-zinc-100 mb-4">
              YouTube Title & Description Counter
            </h1>
            <p className="text-gray-500 dark:text-zinc-400">
              Conteggio caratteri e parole in tempo reale con limiti colorati e
              un&apos;anteprima SERP live.
            </p>
          </div>

          <div className="space-y-8">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-gray-700 dark:text-zinc-300">
                  Titolo Video
                </label>
                <span className={`text-sm font-bold ${titleStats.color}`}>
                  {titleStats.len}/{TITLE_LIMIT} &middot; {titleStats.words}{" "}
                  parole
                </span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Inserisci il titolo del video..."
                className={`w-full px-4 py-3 rounded-xl border ${titleStats.borderColor} focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all text-sm`}
              />
              <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full ${titleStats.barColor} transition-all duration-200 rounded-full`}
                  style={{
                    width: `${Math.min(titleStats.percent, 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-gray-700 dark:text-zinc-300">
                  Descrizione
                </label>
                <span className={`text-sm font-bold ${descStats.color}`}>
                  {descStats.len}/{DESC_LIMIT} &middot; {descStats.words} parole
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Inserisci la descrizione del video..."
                rows={8}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-zinc-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all text-sm resize-y"
              />
              <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full ${descStats.barColor} transition-all duration-200 rounded-full`}
                  style={{
                    width: `${Math.min(descStats.percent, 100)}%`,
                  }}
                />
              </div>
            </div>

            {(title || description) && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Eye size={18} className="text-gray-500 dark:text-zinc-400" />
                  <span className="text-sm font-bold text-gray-700 dark:text-zinc-300">
                    SERP Preview
                  </span>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 dark:border-zinc-800 p-4 max-w-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300 hover:underline cursor-pointer truncate">
                    {title || "Il titolo del tuo video"}
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    https://youtube.com/watch?v=...
                  </p>
                  <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1 line-clamp-2">
                    {description
                      ? description.slice(0, 300)
                      : "La descrizione del tuo video apparirà qui..."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
