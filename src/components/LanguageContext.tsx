"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getTranslations } from '@/lib/translations';

type Locale = 'it' | 'en';

interface LanguageContextType {
  locale: Locale;
  changeLanguage: (newLocale: Locale) => Promise<void>;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('it');
  const [translations, setTranslations] = useState<Record<string, string>>(getTranslations('it'));

  useEffect(() => {
    const savedLocale = localStorage.getItem('resumari_locale') as Locale | null;
    if (savedLocale && (savedLocale === 'it' || savedLocale === 'en')) {
      setLocale(savedLocale);
      setTranslations(getTranslations(savedLocale));
    }
  }, []);

  const changeLanguage = async (newLocale: Locale) => {
    setLocale(newLocale);
    setTranslations(getTranslations(newLocale));
    localStorage.setItem('resumari_locale', newLocale);

    const token = localStorage.getItem('token');
    if (token) {
      try {
        await fetch('/api/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ locale: newLocale })
        });
      } catch (e) {
        console.error('Error syncing locale:', e);
      }
    }
  };

  const t = (key: string) => {
    return translations[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ locale, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
