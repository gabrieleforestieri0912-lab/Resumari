"use client";

import Link from "next/link";
import { toolsExtra } from "@/lib/tools-extra";

// NOTA: i CTA dell'estensione Chrome sono volutamente disattivati nelle
// pagine dei tool gratuiti (l'estensione non è ancora pubblicata).
// Quando sarà live, reintrodurre un singolo CTA finale dietro flag env.

export default function ToolExtraSections({ slug }: { slug: string }) {
  const data = toolsExtra[slug];
  if (!data) return null;
  return (
    <div className="max-w-3xl mx-auto mt-16 space-y-8">
      <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6">
        <h2 className="text-xl font-black text-gray-900 dark:text-zinc-100 mb-3">
          Cos&apos;è questo strumento
        </h2>
        <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed">{data.whatIs}</p>
      </section>

      <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6">
        <h2 className="text-xl font-black text-gray-900 dark:text-zinc-100 mb-4">
          Come usarlo
        </h2>
        <ol className="space-y-3">
          {data.howTo.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-gray-600 dark:text-zinc-400">
              <span className="w-7 h-7 rounded-full bg-linear-to-r from-purple-600 to-red-600 text-white flex items-center justify-center font-black shrink-0 text-xs">{i + 1}</span>
              <span className="pt-1">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6">
        <h2 className="text-xl font-black text-gray-900 dark:text-zinc-100 mb-4">
          Funzionalità principali
        </h2>
        <ul className="grid gap-2">
          {data.keyFeatures.map((k, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-zinc-400"><span className="text-purple-600 font-black">✓</span> {k}</li>
          ))}
        </ul>
      </section>

      <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6">
        <h2 className="text-xl font-black text-gray-900 dark:text-zinc-100 mb-4">
          Chi lo usa
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {data.whoUses.map((u, i) => (
            <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800">
              <p className="font-bold text-sm text-gray-900 dark:text-zinc-100">{u.role}</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">{u.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6">
        <h2 className="text-xl font-black text-gray-900 dark:text-zinc-100 mb-4">
          Strumenti correlati
        </h2>
        <div className="flex flex-wrap gap-2">
          {data.related.map((r) => (
            <Link key={r.href} href={r.href} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-sm font-bold text-gray-700 dark:text-zinc-300 hover:border-purple-300 hover:text-purple-600 transition-all">
              {r.title}
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6">
        <h2 className="text-xl font-black text-gray-900 dark:text-zinc-100 mb-4">
          Domande frequenti
        </h2>
        <div className="space-y-3">
          {data.faqs.map((f, i) => (
            <div key={i} className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700">
              <p className="font-bold text-sm text-gray-900 dark:text-zinc-100">{f.q}</p>
              <p className="text-sm text-gray-600 dark:text-zinc-400 mt-2 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-center pt-2">
        <Link
          href="/tools"
          className="px-7 py-3.5 rounded-2xl bg-linear-to-r from-purple-600 to-red-600 text-white font-bold text-sm shadow-lg shadow-purple-500/25 hover:scale-[1.02] transition-all"
        >
          Scopri gli altri strumenti gratuiti
        </Link>
      </div>
    </div>
  );
}
