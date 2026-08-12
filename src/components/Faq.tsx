"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import Link from "next/link";

interface FaqItem {
  question: string;
  answer: string;
}

const faqData: FaqItem[] = [
  {
    question: "Come funziona il riassunto video?",
    answer:
      "Basta incollare il link del video (es. da YouTube) nella barra di ricerca. La nostra IA analizza l'audio e il testo, estraendo i punti chiave per fornirti un riassunto conciso e strutturato in pochi secondi.",
  },
  {
    question: "Quali tipi di file posso riassumere?",
    answer:
      "Oltre ai video, puoi caricare documenti di testo come PDF, DOCX e TXT, presentazioni PowerPoint e persino immagini contenenti testo (OCR). Il sistema processa il contenuto e genera un'analisi dettagliata.",
  },
  {
    question: "C'è un limite di lunghezza per i riassunti?",
    answer:
      "No, la nostra tecnologia è scalabile. Gestiamo sia brevi clip che lunghe conferenze o corposi documenti legali, adattando la densità del riassunto per non perdere mai le informazioni cruciali.",
  },
  {
    question: "Posso personalizzare il tono del riassunto?",
    answer:
      "Assolutamente. Dopo la generazione, puoi interagire con l'Agente AI per chiedere di cambiare il registro (es. più formale o più semplice), estrarre solo i dati tecnici o creare una lista di task operativi.",
  },
];

export default function Faq() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <section className="py-12 md:py-16 px-6 bg-gradient-to-b from-white via-purple-50/20 to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950 relative" id="faq">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-1 bg-gradient-to-r from-purple-600 to-red-500 rounded-full mb-4 mx-auto" />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-3"
          >
            <HelpCircle size={12} />
            Supporto
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-black text-gray-900 dark:text-gray-100 mb-2"
          >
            Domande Frequenti
          </motion.h2>
        </div>

        <div className="space-y-2">
          {faqData.map((item, index) => {
            const isActive = activeIndex === index;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`group rounded-2xl border transition-all duration-300 ${
                  isActive
                    ? "bg-white dark:bg-zinc-900 border-purple-200 dark:border-purple-700 shadow-md"
                    : "bg-white/50 dark:bg-zinc-900/50 border-gray-200 dark:border-zinc-800 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-white dark:hover:bg-zinc-900"
                }`}
              >
                <button
                  className="w-full flex justify-between items-center p-4 text-left cursor-pointer"
                  onClick={() => setActiveIndex(isActive ? null : index)}
                >
                  <span
                    className={`text-sm font-bold transition-colors duration-300 ${isActive ? "text-purple-700 dark:text-purple-400" : "text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400"}`}
                  >
                    {item.question}
                  </span>
                  <div
                    className={`p-1.5 rounded-lg transition-all duration-300 ${isActive ? "bg-purple-600 text-white rotate-180" : "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-gray-500 group-hover:bg-purple-100 dark:group-hover:bg-zinc-700 group-hover:text-purple-500 dark:group-hover:text-purple-400"}`}
                  >
                    <ChevronDown size={16} strokeWidth={2.5} />
                  </div>
                </button>

                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed border-t border-gray-50 dark:border-zinc-800 pt-3 mt-1">
                        {item.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="mt-8 text-center p-6 rounded-2xl bg-linear-to-r from-purple-600/5 to-red-600/5 border border-purple-100"
        >
          <p className="text-sm text-gray-700 dark:text-gray-200 font-medium mb-2">Hai altre domande?</p>
          <Link
            href="/supporto"
            className="text-sm text-purple-700 font-bold hover:underline"
          >
            Contatta il nostro team di supporto &rarr;
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
