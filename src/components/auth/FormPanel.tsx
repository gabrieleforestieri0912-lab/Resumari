'use client'

import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";

interface FormPanelProps {
  view: 'login' | 'register';
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

export default function FormPanel({ view, onSwitch, locale }: FormPanelProps) {
  const t = content[view];

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-2 tracking-tight">
          {t.title[locale as 'it' | 'en'] || t.title.en}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">
          {t.desc[locale as 'it' | 'en'] || t.desc.en}
        </p>
      </div>
      {view === 'login' ? (
        <LoginForm locale={locale} onSwitch={onSwitch} />
      ) : (
        <RegisterForm locale={locale} onSwitch={onSwitch} />
      )}
    </div>
  );
}
