"use client";

import { useState } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ToolExtraSections from "@/components/tools/ToolExtraSections";
import Breadcrumb from "@/components/Breadcrumb";
import { Download, LinkIcon, AlertCircle, ExternalLink } from "lucide-react";

const resolutions = [
  { label: "MQ (320x180)", file: "mqdefault", width: 320, height: 180 },
  { label: "HQ (480x360)", file: "hqdefault", width: 480, height: 360 },
  { label: "SD (640x480)", file: "sddefault", width: 640, height: 480 },
  { label: "HD (1280x720)", file: "maxresdefault", width: 1280, height: 720 },
];

type ThumbState = {
  label: string;
  url: string;
  file: string;
  width: number;
  height: number;
  status: "loading" | "available" | "unavailable";
};

export default function ThumbnailDownloaderPage() {
  const [url, setUrl] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<ThumbState[] | null>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  const extractVideoId = (input: string) => {
    const t = input.trim();
    const patterns = [
      /(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/|music\.youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const p of patterns) {
      const m = t.match(p);
      if (m) return m[1];
    }
    return null;
  };

  const handleFetch = () => {
    setError("");
    const id = extractVideoId(url);
    if (!id) {
      setError("URL YouTube o ID video non valido");
      setThumbnails(null);
      setVideoId(null);
      return;
    }
    setVideoId(id);
    setThumbnails(
      resolutions.map((r) => ({
        label: r.label,
        url: `https://i.ytimg.com/vi/${id}/${r.file}.jpg`,
        file: r.file,
        width: r.width,
        height: r.height,
        status: "loading" as const,
      }))
    );
  };

  const markStatus = (file: string, status: ThumbState["status"]) => {
    setThumbnails((prev) =>
      prev ? prev.map((t) => (t.file === file ? { ...t, status } : t)) : prev
    );
  };

  // YouTube restituisce un placeholder 120x90 quando la qualità non esiste:
  // se l'immagine caricata è minuscola, la marchiamo come non disponibile
  // invece di mostrare un'anteprima sgranata.
  const handleImgLoad = (t: ThumbState, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth <= 120) {
      markStatus(t.file, "unavailable");
    } else {
      markStatus(t.file, "available");
    }
  };

  const handleDownload = async (t: ThumbState) => {
    setError("");
    setDownloading(t.file);
    try {
      const res = await fetch(t.url);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `youtube-thumbnail-${videoId}-${t.file}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Fallback: apri l'immagine originale in una nuova scheda
      // (il download diretto può essere bloccato dal CORS).
      window.open(t.url, "_blank", "noopener,noreferrer");
      setError("Download diretto bloccato dal browser: immagine aperta in una nuova scheda, salvala da lì.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 bg-[radial-gradient(#e5e7eb_0.5px,transparent_0.5px)] dark:bg-[radial-gradient(#27272a_0.5px,transparent_0.5px)] bg-[length:24px_24px]">
      <Navbar />
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Strumenti", href: "/tools" }, { label: "YouTube Thumbnail Downloader" }]} className="mb-6" />
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/40 border border-purple-200 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-6">
              Strumento
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-zinc-100 mb-4">
              YouTube Thumbnail Downloader
            </h1>
            <p className="text-gray-500 dark:text-zinc-400">
              Scarica la thumbnail di qualsiasi video YouTube in alta qualità —
              fino a Full HD 1280x720.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6 mb-8">
            <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">
              URL YouTube o ID Video
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                placeholder="https://youtube.com/watch?v=..."
                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-zinc-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all text-sm"
              />
              <button
                onClick={handleFetch}
                className="px-6 py-3 bg-linear-to-r from-purple-600 to-red-600 text-white font-bold rounded-xl hover:scale-[1.02] transition-all shadow-lg shadow-purple-500/25 flex items-center gap-2"
              >
                <LinkIcon size={18} />
                Cerca
              </button>
            </div>
            {error && (
              <p className="mt-3 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle size={14} />
                {error}
              </p>
            )}
          </div>

          {thumbnails && (
            <div className="grid gap-6 sm:grid-cols-2">
              {thumbnails.map((t) => (
                <div
                  key={t.file}
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden group"
                >
                  <div className="aspect-video bg-gray-100 dark:bg-zinc-800 relative">
                    {/* Le miniature arrivano da un host esterno: serve
                        unoptimized per non passare dall'Image Optimization API. */}
                    <Image
                      src={t.url}
                      alt={t.label}
                      fill
                      unoptimized
                      className="object-cover"
                      onLoad={(e) => handleImgLoad(t, e)}
                      onError={() => markStatus(t.file, "unavailable")}
                    />
                    {t.status !== "available" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span
                          className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
                            t.status === "unavailable"
                              ? "bg-gray-100 dark:bg-zinc-800 text-gray-500 border-gray-200 dark:border-zinc-700"
                              : "bg-white/90 text-gray-400 border-gray-200 animate-pulse"
                          }`}
                        >
                          {t.status === "unavailable" ? "Non disponibile per questo video" : "Caricamento..."}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-gray-700 dark:text-zinc-300">
                      {t.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-purple-100 text-gray-600 dark:text-zinc-400 hover:text-purple-600 transition-all"
                        title="Apri a dimensione intera"
                      >
                        <ExternalLink size={18} />
                      </a>
                      <button
                        onClick={() => handleDownload(t)}
                        disabled={t.status === "unavailable" || downloading === t.file}
                        className="p-2 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-purple-100 text-gray-600 dark:text-zinc-400 hover:text-purple-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        title={t.status === "unavailable" ? "Qualità non disponibile" : "Scarica"}
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {thumbnails && (
            <p className="mt-6 text-xs text-gray-400 dark:text-zinc-500 text-center">
              Non tutte le qualità esistono per ogni video: YouTube genera
              l&apos;HD solo per i video caricati in alta risoluzione.
            </p>
          )}
        </div>
        <ToolExtraSections slug="thumbnail-downloader" />
      </main>
      <Footer />
    </div>
  );
}
