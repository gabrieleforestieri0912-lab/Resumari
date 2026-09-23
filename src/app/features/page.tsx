import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AddToChromeButton from "@/components/AddToChromeButton";
import { featureDetails } from "@/lib/features-detail";

export const metadata = {
  title: "Funzionalità | Resumari",
  description: "Esplora tutte le funzionalità di Resumari.",
};

export default function FeaturesIndex() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Navbar />
      <main className="pt-28 pb-16 px-6">
        <div className="max-w-7xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">Tutte le funzionalità</h1>
          <p className="text-gray-500 mt-3 max-w-2xl mx-auto">Scegli una funzionalità per vedere descrizione, casi d&apos;uso e FAQ.</p>
          <div className="mt-6 flex justify-center gap-3">
            <AddToChromeButton />
            <Link href="/#pricing" className="px-7 py-3.5 rounded-2xl bg-purple-600 text-white font-black">Vedi prezzi</Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featureDetails.map((f) => (
            <Link key={f.slug} href={`/features/${f.slug}`} className="p-6 rounded-2xl border bg-white dark:bg-zinc-900 hover:border-purple-300 hover:shadow-xl transition-all">
              <h3 className="font-black text-lg">{f.title}</h3>
              <p className="text-sm text-gray-500 mt-2">{f.shortDesc}</p>
              <span className="inline-block mt-4 text-sm font-bold text-purple-600">Scopri →</span>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
