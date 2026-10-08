"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, ReactNode } from "react";
import Link from "next/link";
import {
  Video,
  FileText,
  MessageSquare,
  Settings,
  Globe,
  Download,
  Sparkles,
} from "lucide-react";

const slugs = ["video-summary", "file-synthesis", "ai-agent", "advanced-customization", "multilingual-analysis", "smart-export"];

interface Feature {
  title: string;
  description: string;
  icon: ReactNode;
  highlighted?: boolean;
  size?: "small" | "medium" | "large" | "wide";
}

const features: Feature[] = [
  {
    title: "Riassunto Video Universale",
    description:
      "Trasforma qualsiasi video, da YouTube a qualsiasi altra piattaforma, in un riassunto testuale chiaro e conciso. Supporta tutti i formati più comuni.",
    icon: <Video size={32} />,
    highlighted: true,
    size: "large",
  },
  {
    title: "Sintesi di File & Foto",
    description:
      "Carica documenti, presentazioni o foto con testo: il sistema estrae le informazioni chiave e le riassume per te.",
    icon: <FileText size={24} />,
    size: "small",
  },
  {
    title: "Agente AI Interattivo",
    description:
      "Chiacchiera con il nostro Agente AI per affinare i tuoi riassunti ed esplorare dettagli specifici del contenuto.",
    icon: <MessageSquare size={24} />,
    size: "small",
  },
  {
    title: "Personalizzazione Avanzata",
    description:
      "Scegli lunghezza, livello di dettaglio e focus del riassunto per ottenere esattamente ciò che ti serve.",
    icon: <Settings size={28} />,
    highlighted: true,
    size: "wide",
  },
  {
    title: "Analisi Multilingua",
    description:
      "Trascrivi e riassumi contenuti in oltre 50 lingue diverse, superando ogni barriera linguistica.",
    icon: <Globe size={24} />,
    size: "small",
  },
  {
    title: "Esportazione Intelligente",
    description:
      "Salva i tuoi risultati in PDF, Word o testo semplice e organizza la tua conoscenza facilmente.",
    icon: <Download size={24} />,
    size: "small",
  },
];

interface FeatureCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  index: number;
  highlighted?: boolean;
  size?: "small" | "medium" | "large" | "wide";
}

function FeatureCard({ title, description, icon, index, highlighted, size = "medium" }: FeatureCardProps) {
  const sizeClasses = {
    small: "p-6",
    medium: "p-8",
    large: "p-10",
    wide: "p-8",
  };

  const iconSizeClasses = {
    small: "w-14 h-14",
    medium: "w-16 h-16",
    large: "w-20 h-20",
    wide: "w-[72px] h-[72px]",
  };

  const titleSizeClasses = {
    small: "text-lg",
    medium: "text-xl",
    large: "text-2xl",
    wide: "text-xl",
  };

  const descSizeClasses = {
    small: "text-xs",
    medium: "text-sm",
    large: "text-base",
    wide: "text-sm",
  };

  const gridSpan = {
    small: "col-span-1",
    medium: "col-span-1",
    large: "lg:col-span-2 row-span-2",
    wide: "lg:col-span-2",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -8 }}
      className={`group relative bg-white dark:bg-zinc-900 rounded-2xl border ${sizeClasses[size]} text-center transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 ${
        highlighted
          ? "border-purple-100 dark:border-purple-900/40 shadow-xl shadow-purple-500/5"
          : "border-gray-100 dark:border-zinc-800 shadow-xl shadow-gray-200/50 dark:shadow-none hover:border-purple-200 dark:hover:border-purple-700"
      } ${gridSpan[size]}`}
    >
      {/* Badge with the brand gradient + white icon, coherent across every
          card (same identity as the free-tools page and the rest of the site). */}
      <div
        className={`mx-auto mb-6 flex items-center justify-center rounded-2xl bg-linear-to-br from-purple-600 to-red-600 text-white shadow-lg shadow-purple-500/20 transition-all duration-500 group-hover:rotate-6 group-hover:scale-105 group-hover:shadow-purple-500/40 ${iconSizeClasses[size]}`}
      >
        {icon}
      </div>

      <h3 className={`${titleSizeClasses[size]} font-black text-gray-900 dark:text-gray-100 mb-3`}>{title}</h3>
      <p className={`${descSizeClasses[size]} text-gray-500 dark:text-gray-400 leading-relaxed font-medium`}>
        {description}
      </p>
    </motion.div>
  );
}

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const blobLeftY = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);
  const blobRightY = useTransform(scrollYProgress, [0, 1], ["10%", "-10%"]);

  return (
    <section
      ref={sectionRef}
      id="features"
      className="w-full px-6 py-16 bg-gradient-to-b from-white via-purple-50/10 to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950 overflow-hidden"
      style={{ position: 'relative' }}
    >
      {/* Background Decor with Parallax */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 pointer-events-none">
        <motion.div style={{ y: blobLeftY }} className="absolute top-1/4 left-0 w-96 h-96 bg-purple-50 dark:bg-purple-950/40 rounded-full blur-3xl opacity-50" />
        <motion.div style={{ y: blobRightY }} className="absolute bottom-1/4 right-0 w-96 h-96 bg-red-50 dark:bg-red-950/40 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="max-w-7xl min-[1920px]:max-w-[1680px] min-[2560px]:max-w-[1920px] mx-auto">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="w-16 h-1 bg-gradient-to-r from-purple-600 to-red-500 rounded-full mb-4 mx-auto" />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-linear-to-r from-purple-600 to-red-600 text-white text-xs font-bold uppercase tracking-wider mb-6 shadow-md"
          >
            <Sparkles size={14} />
            Potenzialità
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-black text-gray-900 dark:text-gray-100 tracking-tight"
          >
            Funzionalità Che Amerai
          </motion.h2>
        </div>

        {/* Grid */}
        <div className="grid gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-min">
          {features.map((feature, index) => (
            <Link key={index} href={`/features/${slugs[index]}`} className="block">
              <FeatureCard index={index} {...feature} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
