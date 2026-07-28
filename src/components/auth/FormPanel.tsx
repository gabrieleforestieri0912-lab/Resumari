'use client'

import styles from "@/styles/auth.module.css";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import { Sparkles } from "lucide-react";

interface FormPanelProps {
  view: 'login' | 'register';
  animationState: 'idle' | 'leaving' | 'entering';
  side: 'left' | 'right';
  onSwitch: () => void;
  locale: string;
}

const content = {
  login: {
    title: { it: 'Bentornato.', en: 'Welcome back.' },
    desc: { it: 'Inserisci le tue credenziali per accedere.', en: 'Enter your credentials to access your account.' },
  },
  register: {
    title: { it: 'Crea il tuo account.', en: 'Create your account.' },
    desc: { it: 'Inizia a usare Resumari per riassumere i tuoi contenuti.', en: 'Start using Resumari to summarize your content.' },
  },
};

export default function FormPanel({ view, animationState, side, onSwitch, locale }: FormPanelProps) {
  const t = content[view];
  const animClass =
    animationState === 'leaving'
      ? side === 'left' ? styles.panelLeavingLeft : styles.panelLeavingRight
      : animationState === 'entering'
        ? side === 'left' ? styles.panelEnteringLeft : styles.panelEnteringRight
        : styles.panelIdle;

  return (
    <div className={`${styles.formPanel} ${animClass}`}>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">
            {t.title[locale as 'it' | 'en'] || t.title.en}
          </h2>
          <p className="text-gray-500 font-medium text-sm">
            {t.desc[locale as 'it' | 'en'] || t.desc.en}
          </p>
        </div>
        {view === 'login' ? (
          <LoginForm locale={locale} onSwitch={onSwitch} />
        ) : (
          <RegisterForm locale={locale} onSwitch={onSwitch} />
        )}
      </div>
    </div>
  );
}
