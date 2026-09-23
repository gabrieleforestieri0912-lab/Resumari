'use client'

import { Sparkles } from "lucide-react";

interface DescriptionPanelProps {
  view: 'login' | 'register';
  locale: string;
  compact?: boolean;
}

const content = {
  login: {
    panelTitle: { it: "L'intelligenza artificiale al servizio del tuo tempo.", en: "AI at the service of your time." },
    panelDesc: { it: 'Unisciti a migliaia di professionisti che utilizzano Resumari per analizzare video, documenti e testi in pochi secondi.', en: 'Join thousands of professionals using Resumari to analyze videos, documents and texts in seconds.' },
  },
  register: {
    panelTitle: { it: 'Crea riassunti in secondi, non in ore.', en: 'Create summaries in seconds, not hours.' },
    panelDesc: { it: "Nessuna carta di credito richiesta. Inizia subito a trasformare video e documenti in riassunti pronti all'uso.", en: 'No credit card required. Start turning videos and documents into ready-to-use summaries right now.' },
  },
};

export default function DescriptionPanel({ view, locale, compact }: DescriptionPanelProps) {
  const t = content[view];

  return (
    <div className={`relative z-10 flex flex-col items-center justify-center text-center ${compact ? 'px-6 py-6' : 'px-12 py-16'}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-red-600/10 -z-10" />
      <div className={`bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl flex items-center justify-center mb-6 text-purple-600 rotate-12 ${compact ? 'w-14 h-14' : 'w-20 h-20'}`}>
        <Sparkles size={compact ? 28 : 40} />
      </div>
      <h3 className={`font-black text-gray-900 dark:text-gray-100 mb-3 leading-tight ${compact ? 'text-lg' : 'text-3xl'}`}>
        {t.panelTitle[locale as 'it' | 'en'] || t.panelTitle.en}
      </h3>
      <p className={`text-gray-500 dark:text-gray-400 font-medium leading-relaxed ${compact ? 'text-xs max-w-xs' : 'text-sm max-w-sm'}`}>
        {t.panelDesc[locale as 'it' | 'en'] || t.panelDesc.en}
      </p>
    </div>
  );
}
