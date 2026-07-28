"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, ReactNode } from "react";
import {
  Video,
  FileText,
  MessageSquare,
  Settings,
  Globe,
  Download,
  Sparkles,
} from "lucide-react";

interface Feature {
  title: string;
  description: string;
  icon: ReactNode;
  highlighted?: boolean;
}

const features: Feature[] = [
  {
    title: "Riassunto Video Universale",
    description:
      "Trasforma qualsiasi video, da YouTube a qualsiasi altra piattaforma, in un riassunto testuale chiaro e conciso.",
    icon: <Video size={28} />,
    highlighted: true,
  },
  {
    title: "Sintesi di File & Foto",
    description:
      "Carica documenti, presentazioni o foto con testo: il sistema estrae le informazioni chiave e le riassume per te.",
    icon: <FileText size={24} />,
  },
  {
    title: "Agente AI Interattivo",
    description:
      "Chiacchiera con il nostro Agente AI per affinare i tuoi riassunti ed esplorare dettagli specifici.",
    icon: <MessageSquare size={24} />,
  },
  {
    title: "Personalizzazione Avanzata",
    description:
      "Scegli lunghezza, livello di dettaglio e focus del riassunto per ottenere esattamente ciò che ti serve.",
    icon: <Settings size={28} />,
    highlighted: true,
  },
  {
    title: "Analisi Multilingua",
    description:
      "Trascrivi e riassumi contenuti in oltre 50 lingue diverse, superando ogni barriera linguistica.",
    icon: <Globe size={24} />,
  },
  {
    title: "Esportazione Intelligente",
    description:
      "Salva i tuoi risultati in PDF, Word o testo semplice e organizza la tua conoscenza facilmente.",
    icon: <Download size={24} />,
  },
];

interface FeatureCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  index: number;
  highlighted?: boolean;
}

function FeatureCard({ title, description, icon, index, highlighted }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -10 }}
      className={`group relative bg-white rounded-2xl border p-10 text-center transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 ${
        highlighted
          ? "border-purple-100 shadow-xl shadow-purple-500/5 lg:col-span-2 row-span-1"
          : "border-gray-100 shadow-xl shadow-gray-200/50 hover:border-purple-200"
      }`}
    >
      {/* Icon */}
      <div
        className={`mx-auto mb-8 flex items-center justify-center rounded-2xl transition-all duration-500 group-hover:bg-linear-to-br group-hover:from-purple-600 group-hover:to-red-600 group-hover:text-white group-hover:rotate-6 group-hover:shadow-lg group-hover:shadow-purple-200 ${
          highlighted
            ? "w-20 h-20 bg-linear-to-br from-purple-100 to-red-100 text-purple-600 shadow-md shadow-purple-200"
            : "w-16 h-16 bg-gray-50 text-gray-400"
        }`}
      >
        {icon}
      </div>

      <h3 className="text-xl font-black text-gray-900 mb-4">{title}</h3>
      <p className="text-gray-500 leading-relaxed font-medium text-sm">
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
      className="w-full px-6 py-16 bg-gradient-to-b from-white via-purple-50/10 to-white overflow-hidden"
      style={{ position: 'relative' }}
    >
      {/* Background Decor with Parallax */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 pointer-events-none">
        <motion.div style={{ y: blobLeftY }} className="absolute top-1/4 left-0 w-96 h-96 bg-purple-50 rounded-full blur-3xl opacity-50" />
        <motion.div style={{ y: blobRightY }} className="absolute bottom-1/4 right-0 w-96 h-96 bg-red-50 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="max-w-7xl mx-auto">
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
            className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight"
          >
            Funzionalità Che Amerai
          </motion.h2>
        </div>

        {/* Grid */}
        <div className="grid gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <FeatureCard key={index} index={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
