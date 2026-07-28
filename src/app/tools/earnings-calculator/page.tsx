"use client";

import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { DollarSign, TrendingUp, Award } from "lucide-react";

const niches: Record<string, { min: number; max: number; label: string }> = {
  entertainment: { min: 0.5, max: 2, label: "Intrattenimento" },
  education: { min: 2, max: 6, label: "Educazione" },
  tech: { min: 3, max: 8, label: "Tecnologia" },
  music: { min: 0.3, max: 1, label: "Musica" },
  gaming: { min: 0.5, max: 2, label: "Gaming" },
  news: { min: 1, max: 4, label: "Notizie e Politica" },
  lifestyle: { min: 1, max: 5, label: "Stile di Vita" },
  finance: { min: 5, max: 15, label: "Finanza e Business" },
  custom: { min: 0, max: 0, label: "Personalizzato" },
};

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function EarningsCalculatorPage() {
  const [views, setViews] = useState("10000");
  const [niche, setNiche] = useState("tech");
  const [customCpm, setCustomCpm] = useState("5");
  const [videoCount, setVideoCount] = useState("1");

  const result = useMemo(() => {
    const v = parseInt(views) || 0;
    const vc = parseInt(videoCount) || 1;
    const cpm = niche === "custom" ? parseFloat(customCpm) || 0 : (niches[niche].min + niches[niche].max) / 2;
    const perVideo = (v / 1000) * cpm;
    const total = perVideo * vc;

    const monthlyV = v * vc * 4;
    const monthlyEarnings = (monthlyV / 1000) * cpm;

    const yppMilestones = [
      { subs: 1000, label: "YPP Silver (1K iscritti)" },
      { subs: 10000, label: "YPP Gold (10K iscritti)" },
      { subs: 100000, label: "YPP Diamond (100K iscritti)" },
      { subs: 1000000, label: "YPP Play Button (1M iscritti)" },
    ];

    return { cpm, perVideo, total, monthlyEarnings, yppMilestones };
  }, [views, niche, customCpm, videoCount]);

  return (
    <div className="min-h-screen bg-white bg-[radial-gradient(#e5e7eb_0.5px,transparent_0.5px)] bg-[length:24px_24px]">
      <Navbar />
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-bold uppercase tracking-wider mb-6">
              Strumento
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              YouTube Earnings Calculator
            </h1>
            <p className="text-gray-500">
              Stima i guadagni pubblicitari YouTube da visualizzazioni e CPM.
              Include preset per nicchia e traguardi YPP.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Visualizzazioni per Video
                </label>
                <input
                  type="number"
                  value={views}
                  onChange={(e) => setViews(e.target.value)}
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Numero di Video
                </label>
                <input
                  type="number"
                  value={videoCount}
                  onChange={(e) => setVideoCount(e.target.value)}
                  min="1"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Niche
                </label>
                <select
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all text-sm font-bold"
                >
                  {Object.entries(niches).map(([key, n]) => (
                    <option key={key} value={key}>
                      {n.label} {key !== "custom" ? `(${n.min}-${n.max} CPM)` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {niche === "custom" && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Custom CPM ($)
                  </label>
                  <input
                    type="number"
                    value={customCpm}
                    onChange={(e) => setCustomCpm(e.target.value)}
                    min="0"
                    step="0.5"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 mb-8">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
              <DollarSign size={20} className="text-green-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Guadagno per Video
                </p>
              <p className="text-2xl font-black text-gray-900">
                {formatCurrency(result.perVideo)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                CPM: ${result.cpm.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
              <TrendingUp size={20} className="text-green-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">
                Totale ({videoCount} video)
              </p>
              <p className="text-2xl font-black text-gray-900">
                {formatCurrency(result.total)}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
              <TrendingUp size={20} className="text-green-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">
                Mensile Stimato
              </p>
              <p className="text-2xl font-black text-gray-900">
                {formatCurrency(result.monthlyEarnings)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award size={18} className="text-green-500" />
              <span className="text-sm font-bold text-gray-700">
                Tracker Traguardi YPP
              </span>
            </div>
            <div className="space-y-3">
              {result.yppMilestones.map((m) => (
                <div key={m.subs} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold text-gray-700">
                        {m.label}
                      </span>
                      <span className="font-bold text-green-600">
                        ${(m.subs * 0.01).toFixed(0)}/mese stim.
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{
                          width: `${Math.min((m.subs / 1000000) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
