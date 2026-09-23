import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AddToChromeButton from "@/components/AddToChromeButton";
import { featureDetails, getFeatureBySlug } from "@/lib/features-detail";
import { Check, HelpCircle } from "lucide-react";

export function generateStaticParams() {
  return featureDetails.map((f) => ({ slug: f.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const f = getFeatureBySlug(params.slug);
  if (!f) return {};
  return { title: `${f.title} | Resumari`, description: f.longDesc };
}

export default function FeaturePage({ params }: { params: { slug: string } }) {
  const f = getFeatureBySlug(params.slug);
  if (!f) notFound();
  const Icon = f.icon;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Navbar />
      <main className="pt-28 pb-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-600 to-red-600 flex items-center justify-center text-white mb-6">
            <Icon size={28} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">{f.title}</h1>
          <p className="text-lg text-gray-500 dark:text-zinc-400 mt-4 max-w-2xl mx-auto">{f.longDesc}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <AddToChromeButton />
            <Link href="/#pricing" className="px-7 py-3.5 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-zinc-900 font-black">Vedi prezzi</Link>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 mt-12 grid gap-6 md:grid-cols-3">
          {f.highlights.map((h, i) => {
            const HIcon = h.icon;
            return (
              <div key={i} className="p-6 rounded-2xl border bg-white dark:bg-zinc-900">
                <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 mb-4">
                  <HIcon size={20} />
                </div>
                <h3 className="font-black">{h.title}</h3>
                <p className="text-sm text-gray-500 mt-2">{h.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="max-w-4xl mx-auto px-6 mt-12">
          <h2 className="text-xl font-black mb-4">Punti fondamentali</h2>
          <ul className="grid gap-3">
            {f.keyPoints.map((k, i) => (
              <li key={i} className="flex gap-3 p-4 rounded-xl border bg-white dark:bg-zinc-900">
                <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0"><Check size={14} /></span>
                <span className="text-sm font-medium">{k}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="max-w-4xl mx-auto px-6 mt-12">
          <h2 className="text-xl font-black mb-4 flex items-center gap-2"><HelpCircle size={20} /> Domande frequenti</h2>
          <div className="space-y-3">
            {f.faqs.map((faq, i) => (
              <div key={i} className="p-5 rounded-2xl border bg-white dark:bg-zinc-900">
                <p className="font-bold text-sm">{faq.q}</p>
                <p className="text-sm text-gray-600 dark:text-zinc-400 mt-2">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 mt-12 flex flex-wrap justify-center gap-3">
          <AddToChromeButton />
          <Link href="/#pricing" className="px-7 py-3.5 rounded-2xl bg-purple-600 text-white font-black">Vedi prezzi</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
