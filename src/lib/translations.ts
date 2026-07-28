type TranslationMap = Record<string, string>
type Locale = 'it' | 'en'

const translations: Record<Locale, TranslationMap> = {
  it: {
    settings: 'Impostazioni',
    language: 'Lingua',
    italian: 'Italiano',
    english: 'English',
    save: 'Salva',
    preferences: 'Preferenze',
    profile: 'Profilo',
    account: 'Account',
    subscription: 'Abbonamento',
    logout: 'Esci',
    deleteAccount: 'Elimina account',
    dashboard: 'Dashboard',
    chat: 'Chat',
    transcripts: 'Trascrizioni',
    pricing: 'Piani',
    transcribe: 'Trascrivi',
    transcriptionComplete: 'Trascrizione completa',
    noTranscripts: 'Nessuna trascrizione ancora',
    copyTranscript: 'Copia trascrizione',
    copied: 'Copiato!',
    login: 'Accedi',
    register: 'Registrati',
  },
  en: {
    settings: 'Settings',
    language: 'Language',
    italian: 'Italian',
    english: 'English',
    save: 'Save',
    preferences: 'Preferences',
    profile: 'Profile',
    account: 'Account',
    subscription: 'Subscription',
    logout: 'Logout',
    deleteAccount: 'Delete account',
    dashboard: 'Dashboard',
    chat: 'Chat',
    transcripts: 'Transcripts',
    pricing: 'Pricing',
    transcribe: 'Transcribe',
    transcriptionComplete: 'Full transcript',
    noTranscripts: 'No transcripts yet',
    copyTranscript: 'Copy transcript',
    copied: 'Copied!',
    login: 'Login',
    register: 'Sign up',
  },
};

export function getTranslations(locale: string): TranslationMap {
  return translations[locale as Locale] || translations.it;
}

export function t(locale: string, key: string): string {
  const trans = getTranslations(locale);
  return trans[key] || key;
}

export const locales = ['it', 'en'];
export const defaultLocale = 'it';
