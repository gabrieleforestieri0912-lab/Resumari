"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Image, Download, LinkIcon, AlertCircle } from "lucide-react";

const resolutions = [
  { label: "Default (120x90)", quality: "default" },
  { label: "MQ (320x180)", quality: "mq" },
  { label: "HQ (480x360)", quality: "hq" },
  { label: "SD (640x480)", quality: "sd" },
  { label: "HD (1280x720)", quality: "maxres" },
];

export default function ThumbnailDownloaderPage() {
  const [url, setUrl] = useState("");
  const [thumbnails, setThumbnails] = useState<{ label: string; url: string; quality: string }[] | null>(null);
  const [error, setError] = useState("");

  const extractVideoId = (input: string) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const p of patterns) {
      const m = input.match(p);
      if (m) return m[1];
    }
    return null;
  };

  const handleFetch = () => {
    setError("");
    const id = extractVideoId(url.trim());
    if (!id) {
      setError("URL YouTube o ID video non valido");
      setThumbnails(null);
      return;
    }
    setThumbnails(
      resolutions.map((r) => ({
        label: r.label,
        url: `https://img.youtube.com/vi/${id}/${r.quality}.jpg`,
        quality: r.quality,
      }))
    );
  };

  const handleDownload = async (imgUrl: string, label: string) => {
    try {
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `thumbnail-${label.replace(/\s+/g, "-").toLowerCase()}.jpg`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      setError("Download fallito. La risoluzione potrebbe non essere disponibile.");
    }
  };

  return (
    <div className="min-h-screen bg-white bg-[radial-gradient(#e5e7eb_0.5px,transparent_0.5px)] bg-[length:24px_24px]">
      <Navbar />
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider mb-6">
              Strumento
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              YouTube Thumbnail Downloader
            </h1>
            <p className="text-gray-500">
              Scarica thumbnail YouTube in tutte le risoluzioni disponibili — da
              120x90 a Full HD 1280x720.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              URL YouTube o ID Video
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                placeholder="https://youtube.com/watch?v=..."
                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all text-sm"
              />
              <button
                onClick={handleFetch}
                className="px-6 py-3 bg-linear-to-r from-rose-500 to-pink-600 text-white font-bold rounded-xl hover:scale-[1.02] transition-all shadow-lg shadow-rose-500/25 flex items-center gap-2"
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
                  key={t.quality}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden group"
                >
                  <div className="aspect-video bg-gray-100 relative">
                    <img
                      src={t.url}
                      alt={t.label}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><rect fill='%23f3f4f6' width='320' height='180'/><text x='50%' y='50%' fill='%239ca3af' font-size='14' text-anchor='middle' dominant-baseline='middle'>Not available</text></svg>";
                      }}
                    />
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-700">
                      {t.label}
                    </span>
                    <button
                      onClick={() => handleDownload(t.url, t.label)}
                      className="p-2 rounded-xl bg-gray-100 hover:bg-rose-100 text-gray-600 hover:text-rose-600 transition-all"
                      title="Scarica"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
