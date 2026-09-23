"use client";

import Link from "next/link";
import AddToChromeButton from "@/components/AddToChromeButton";
import { toolsExtra } from "@/lib/tools-extra";

export default function ToolExtraSections({ slug }: { slug: string }) {
  const data = toolsExtra[slug];
  if (!data) return null;
  return (
    <div className="max-w-4xl mx-auto mt-16 space-y-12">
      <div className="flex justify-center">
        <AddToChromeButton />
      </div>

      <section className="bg-white dark:bg-zinc-900 rounded-2xl border p-6">
        <h2 className="text-xl font-black mb-3">Cosa è</h2>
        <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed">{data.whatIs}</p>
      </section>

      <section className="bg-white dark:bg-zinc-900 rounded-2xl border p-6">
        <h2 className="text-xl font-black mb-3">Come fare</h2>
        <ol className="space-y-2">
          {data.howTo.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center font-black shrink-0 text-xs">{i + 1}</span>
              <span className="pt-1">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-white dark:bg-zinc-900 rounded-2xl border p-6">
        <h2 className="text-xl font-black mb-3">Key features</h2>
        <ul className="grid gap-2">
          {data.keyFeatures.map((k, i) => (
            <li key={i} className="flex gap-2 text-sm"><span className="text-purple-600">✓</span> {k}</li>
          ))}
        </ul>
      </section>

      <section className="bg-white dark:bg-zinc-900 rounded-2xl border p-6">
        <h2 className="text-xl font-black mb-3">Chi usa questo tool?</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {data.whoUses.map((u, i) => (
            <div key={i} className="p-4 rounded-xl border bg-gray-50 dark:bg-zinc-800">
              <p className="font-bold text-sm">{u.role}</p>
              <p className="text-xs text-gray-500">{u.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white dark:bg-zinc-900 rounded-2xl border p-6">
        <h2 className="text-xl font-black mb-3">Tool collegati</h2>
        <div className="flex flex-wrap gap-2">
          {data.related.map((r) => (
            <Link key={r.href} href={r.href} className="px-4 py-2 rounded-xl border bg-gray-50 dark:bg-zinc-800 text-sm font-bold hover:border-purple-300">
              {r.title}
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-white dark:bg-zinc-900 rounded-2xl border p-6">
        <h2 className="text-xl font-black mb-3">Domande frequenti</h2>
        <div className="space-y-4">
          {data.faqs.map((f, i) => (
            <div key={i} className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-800">
              <p className="font-bold text-sm">{f.q}</p>
              <p className="text-sm text-gray-600 dark:text-zinc-400 mt-2">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap justify-center gap-3">
        <AddToChromeButton />
        <Link href="/#pricing" className="px-7 py-3.5 rounded-2xl bg-purple-600 text-white font-black">Vedi i prezzi</Link>
      </div>
    </div>
  );
}
