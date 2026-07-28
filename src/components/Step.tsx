import { motion } from "framer-motion";
import { MousePointerClick, Cpu, Layout, LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface Step {
  number: number;
  title: string;
  description: string;
  icon: ReactNode;
}

const steps: Step[] = [
  {
    number: 1,
    title: "Incolla o Carica",
    description:
      "Inserisci il testo direttamente, carica un documento o incolla il link di un video da piattaforme come YouTube.",
    icon: <MousePointerClick className="w-6 h-6" />,
  },
  {
    number: 2,
    title: "Analisi Intelligente",
    description:
      "La nostra intelligenza artificiale elabora il contenuto, identificando concetti chiave e distillando l'essenziale.",
    icon: <Cpu className="w-6 h-6" />,
  },
  {
    number: 3,
    title: "Ottieni il Riassunto",
    description:
      "Ricevi un riassunto conciso e accurato, pronto per essere utilizzato. Risparmia tempo prezioso.",
    icon: <Layout className="w-6 h-6" />,
  },
];

function ArrowConnector({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0.4 + index * 0.2, duration: 0.4, ease: "easeOut" }}
      className="hidden lg:flex absolute top-1/2 -right-6 -translate-y-1/2 z-10 items-center justify-center"
    >
      <div className="flex items-center">
        <div className="w-12 h-0.5 bg-gradient-to-r from-purple-400 to-red-400 rounded-full" />
        <div className="w-8 h-8 -ml-4 rounded-full bg-gradient-to-br from-purple-600 to-red-500 flex items-center justify-center shadow-lg shadow-purple-500/30 ring-2 ring-white group-hover:scale-110 group-hover:shadow-purple-500/40 transition-all duration-300">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

interface StepCardProps {
  number: number;
  title: string;
  description: string;
  icon: ReactNode;
  index: number;
}

function StepCard({ number, title, description, icon, index }: StepCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.2, duration: 0.5 }}
      className="group relative bg-gray-50/50 rounded-2xl p-6 pt-12 transition-all duration-300 hover:bg-white hover:shadow-xl hover:shadow-purple-500/5 border border-transparent hover:border-purple-100 bg-linear-to-br hover:from-purple-50 hover:to-red-50"
    >
      {/* Number Badge */}
      <div className="absolute top-0 left-8 -translate-y-1/2 flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-purple-600 to-red-500 text-white flex items-center justify-center text-lg font-black shadow-lg group-hover:from-purple-700 group-hover:to-red-600 transition-all">
          {number}
        </div>
        <div className="p-2 rounded-lg bg-white shadow-sm text-gray-400 group-hover:bg-linear-to-br group-hover:from-purple-600 group-hover:to-red-500 group-hover:text-white transition-all">
          {icon}
        </div>
      </div>

      <h3 className="text-lg font-black text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 font-medium leading-relaxed">
        {description}
      </p>

    </motion.div>
  );
}

export default function StepsSection() {
  return (
    <section id="steps" className="w-full px-6 py-16 bg-gradient-to-b from-white via-indigo-50/10 to-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Title */}
        <div className="mb-12">
          <div className="w-16 h-1 bg-gradient-to-r from-purple-600 to-red-500 rounded-full mb-4" />
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight"
          >
            Come Funziona <br />
            <span className="bg-linear-to-r from-purple-600 to-red-500 bg-clip-text text-transparent">
              Resumari?
            </span>
          </motion.h2>
        </div>

        {/* Grid */}
        <div className="grid gap-8 lg:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, index) => (
            <StepCard key={step.number} index={index} {...step} />
          ))}
        </div>
      </div>
    </section>
  );
}
