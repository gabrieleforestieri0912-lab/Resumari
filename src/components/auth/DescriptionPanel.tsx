'use client'

import { Sparkles } from "lucide-react";

interface DescriptionPanelProps {
  view: 'login' | 'register';
  animationState: 'idle' | 'leaving' | 'entering';
  side: 'left' | 'right';
  locale: string;
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

export default function DescriptionPanel({ view, animationState, side, locale }: DescriptionPanelProps) {
  const t = content[view];
  const animClass =
    animationState === 'leaving'
      ? side === 'left' ? 'auth-panel-leaving-left' : 'auth-panel-leaving-right'
      : animationState === 'entering'
        ? side === 'left' ? 'auth-panel-entering-left' : 'auth-panel-entering-right'
        : 'auth-panel-idle';

  return (
    <div className={`auth-desc-panel ${animClass}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-red-600/10 z-0" />
      <div className="relative z-10 flex flex-col items-center justify-center px-12 py-16 text-center">
        <div className="w-20 h-20 bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl flex items-center justify-center mb-8 text-purple-600 rotate-12">
          <Sparkles size={40} />
        </div>
        <h3 className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-5 leading-tight">
          {t.panelTitle[locale as 'it' | 'en'] || t.panelTitle.en}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm leading-relaxed text-sm">
          {t.panelDesc[locale as 'it' | 'en'] || t.panelDesc.en}
        </p>
      </div>
    </div>
  );
}
