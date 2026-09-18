/**
 * Tipo per mappare le chiavi di traduzione ai loro valori testuali.
 */
type TranslationMap = Record<string, string>
/**
 * Tipi supportati per la localizzazione dell'app.
 */
type Locale = 'it' | 'en'

/**
 * Dizionario di traduzioni per l'applicazione.
 * Contiene le stringhe per l'interfaccia utente in italiano e inglese.
 */
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

/**
 * Restituisce la mappa di traduzioni per la lingua specificata.
 * Se la lingua non è supportata, ritorna quella italiana come default.
 */
export function getTranslations(locale: string): TranslationMap {
  return translations[locale as Locale] || translations.it;
}

/**
 * Funzione di utilità per ottenere la traduzione di una specifica chiave.
 * Se la chiave non esiste nel dizionario, restituisce la chiave stessa.
 */
export function t(locale: string, key: string): string {
  const trans = getTranslations(locale);
  return trans[key] || key;
}

/**
 * Elenco delle lingue supportate dall'applicazione.
 */
export const locales = ['it', 'en'];
/**
 * Lingua predefinita utilizzata all'avvio dell'applicazione.
 */
export const defaultLocale = 'it';
