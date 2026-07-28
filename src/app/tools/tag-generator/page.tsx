"use client";

import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tag, Copy, Check, Sparkles, X } from "lucide-react";

const TAG_LIMIT = 500;

const tagSuggestions: Record<string, string[]> = {
  tech: ["tecnologia", "gadget", "recensione", "unboxing", "recensione tech", "ultima tecnologia", "smartphone", "laptop", "AI", "software"],
  gaming: ["gaming", "gameplay", "walkthrough", "gameplay italiano", "fps", "rpg", "multigiocatore", "twitch", "esports", "community gaming"],
  music: ["musica", "canzone", "testo", "video musicale ufficiale", "nuova uscita", "album", "esibizione dal vivo", "cover", "remix", "dietro le quinte"],
  education: ["educazione", "apprendimento", "tutorial", "come fare", "fai da te", "consigli studio", "formazione online", "abilità", "conoscenza", "accademico"],
  lifestyle: ["stile di vita", "vlog", "routine quotidiana", "fitness", "salute", "viaggi", "cibo", "moda", "benessere", "motivazione"],
  entertainment: ["intrattenimento", "commedia", "divertente", "reazione", "sfida", "scherzo", "tendenze", "virale", "compilation", "prova a non ridere"],
};

function generateTags(topic: string, niche: string): string[] {
  const words = topic.toLowerCase().split(/\s+/).filter(Boolean);
  const base = tagSuggestions[niche] || tagSuggestions.entertainment;
  const tags = new Set<string>();

  words.forEach((w) => tags.add(w));
  words.forEach((w) => base.forEach((b) => tags.add(`${w} ${b}`)));
  base.forEach((b) => tags.add(b));
  tags.add(topic.toLowerCase());
  tags.add(`${topic.toLowerCase()} youtube`);

  return Array.from(tags);
}

export default function TagGeneratorPage() {
  const [topic, setTopic] = useState("");
  const [niche, setNiche] = useState("tech");
  const [tags, setTags] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const tagsString = useMemo(() => tags.join(", "), [tags]);
  const remaining = TAG_LIMIT - tagsString.length;

  const handleGenerate = () => {
    if (!topic.trim()) return;
    setTags(generateTags(topic.trim(), niche));
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const addCustomTag = () => {
    const el = document.getElementById("custom-tag") as HTMLInputElement;
    if (el && el.value.trim() && !tags.includes(el.value.trim())) {
      setTags([...tags, el.value.trim()]);
      el.value = "";
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(tagsString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white bg-[radial-gradient(#e5e7eb_0.5px,transparent_0.5px)] bg-[length:24px_24px]">
      <Navbar />
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-bold uppercase tracking-wider mb-6">
              Strumento
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              YouTube Tag Generator
            </h1>
            <p className="text-gray-500">
              Genera tag YouTube ottimizzati dal tuo argomento video. Mostra il
              contatore del limite di 500 caratteri.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
            <div className="grid gap-4 sm:grid-cols-3 mb-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Argomento Video
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  placeholder="es. Recensione iPhone 16"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Categoria
                </label>
                <select
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition-all text-sm font-bold"
                >
                  <option value="tech">Tecnologia</option>
                  <option value="gaming">Gaming</option>
                  <option value="music">Musica</option>
                  <option value="education">Educazione</option>
                  <option value="lifestyle">Stile di Vita</option>
                  <option value="entertainment">Intrattenimento</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              className="w-full px-6 py-3 bg-linear-to-r from-sky-500 to-blue-600 text-white font-bold rounded-xl hover:scale-[1.02] transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2"
            >
              <Sparkles size={18} />
              Genera Tag
            </button>
          </div>

          {tags.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-700">
                  Tag Generati ({tags.length})
                </span>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-bold ${
                      remaining < 0
                        ? "text-red-500"
                        : remaining < 50
                        ? "text-amber-500"
                        : "text-green-500"
                    }`}
                  >
                    {remaining} caratteri rimasti
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-800 transition-colors"
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
              </div>

              <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-4">
                <div
                  className={`h-full rounded-full transition-all ${
                    remaining < 0
                      ? "bg-red-500"
                      : remaining < 50
                      ? "bg-amber-500"
                      : "bg-green-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      (tagsString.length / TAG_LIMIT) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 text-sm font-medium"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(i)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex gap-2">
                  <input
                    id="custom-tag"
                    type="text"
                    placeholder="Aggiungi tag personalizzato..."
                    onKeyDown={(e) => e.key === "Enter" && addCustomTag()}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition-all text-sm"
                  />
                  <button
                    onClick={addCustomTag}
                    className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm"
                  >
                    Aggiungi
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
