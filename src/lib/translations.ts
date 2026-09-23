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
 * Le routes restano SOLO in inglese (es. /settings, /videos, /dashboard)
 */
const translations: Record<Locale, TranslationMap> = {
  it: {
    // Generic
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
    // Extended IT
    appearance: 'Aspetto',
    theme: 'Tema',
    themeLight: 'Chiaro',
    themeDark: 'Scuro',
    themeAuto: 'Auto',
    notifications: 'Notifiche',
    emailNotifications: 'Notifiche email',
    summariesCompleted: 'Riassunti completati',
    offersUpdates: 'Offerte e novità',
    security: 'Sicurezza',
    changePassword: 'Cambia password',
    currentPassword: 'Password attuale',
    newPassword: 'Nuova password',
    confirmNewPassword: 'Conferma nuova password',
    updatePassword: 'Aggiorna password',
    exportPath: 'Percorso esportazione chat',
    exportFormat: 'Formato',
    browse: 'Sfoglia',
    manual: 'Manuale',
    auto: 'Auto',
    manualConfig: 'Configurazione manuale',
    home: 'Home',
    tools: 'Strumenti',
    apiKeys: 'API Keys',
    mcp: 'MCP',
    howItWorks: 'Come funziona',
    features: 'Funzionalità',
    faq: 'FAQ',
    contact: 'Contatti',
    support: 'Supporto',
    privacy: 'Privacy',
    terms: 'Termini',
    newChat: 'Nuova Chat',
    chatVideo: 'Chat video YouTube',
    chatDocs: 'Chat documenti',
    chatVideoDesc: 'Incolla un link per iniziare',
    chatDocsDesc: 'Chat normale con input al centro',
    videosAnalyzed: 'Video analizzati',
    documentsAnalyzed: 'Documenti analizzati',
    recentTranscripts: 'Trascrizioni recenti',
    recentChats: 'Conversazioni recenti',
    chatInsights: 'Insight chat',
    activityLast7Days: 'Attività ultimi 7 giorni',
    noActivity: 'Nessuna attività',
    upgrade: 'Aggiorna',
    upgradePlan: 'Aggiorna piano',
    creditsRemaining: 'crediti rimasti',
    creditsUsed: 'Crediti utilizzati',
    creditsExhausted: 'Crediti esauriti',
    memberSince: 'Membro dal',
    accountType: 'Tipo account',
    summariesCreated: 'Riassunti creati',
    personalInfo: 'Informazioni personali',
    dangerZone: 'Zona pericolosa',
    deleteConfirm: 'Sei sicuro? Questa azione è irreversibile.',
    cancel: 'Annulla',
    confirmDelete: 'Conferma eliminazione',
    heroTitle: 'Smettila di rincorrere il tempo.',
    heroSubtitle: 'Trascrivi ore di video in pochi semplici secondi',
    heroDescription: 'La nostra IA distilla i concetti chiave da video YouTube e documenti infiniti.',
    tryFree: 'Prova Gratis',
    turboProcessing: 'Turbo Processing',
    secureData: 'Secure Data',
    aiPowered: 'AI Powered',
    pricingTitle: 'Scegli il tuo successo',
    pricingSubtitle: 'Investi nel tuo tempo. Piani flessibili progettati per adattarsi alla tua crescita.',
    monthly: 'Mensile',
    annual: 'Annuale',
    free: 'Gratis',
    starter: 'Starter',
    standard: 'Standard',
    pro: 'Pro Pack',
    business: 'Business',
  },
  en: {
    // Generic — fully filled English dictionary, routes remain English only
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
    // Extended EN — complete mirror of IT
    appearance: 'Appearance',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeAuto: 'Auto',
    notifications: 'Notifications',
    emailNotifications: 'Email notifications',
    summariesCompleted: 'Summaries completed',
    offersUpdates: 'Offers & updates',
    security: 'Security',
    changePassword: 'Change password',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmNewPassword: 'Confirm new password',
    updatePassword: 'Update password',
    exportPath: 'Chat export path',
    exportFormat: 'Format',
    browse: 'Browse',
    manual: 'Manual',
    auto: 'Auto',
    manualConfig: 'Manual configuration',
    home: 'Home',
    tools: 'Tools',
    apiKeys: 'API Keys',
    mcp: 'MCP',
    howItWorks: 'How it works',
    features: 'Features',
    faq: 'FAQ',
    contact: 'Contact',
    support: 'Support',
    privacy: 'Privacy',
    terms: 'Terms',
    newChat: 'New Chat',
    chatVideo: 'YouTube video chat',
    chatDocs: 'Document chat',
    chatVideoDesc: 'Paste a link to start',
    chatDocsDesc: 'Standard chat with centered input',
    videosAnalyzed: 'Videos analyzed',
    documentsAnalyzed: 'Documents analyzed',
    recentTranscripts: 'Recent transcripts',
    recentChats: 'Recent conversations',
    chatInsights: 'Chat insights',
    activityLast7Days: 'Last 7 days activity',
    noActivity: 'No activity',
    upgrade: 'Upgrade',
    upgradePlan: 'Upgrade plan',
    creditsRemaining: 'credits remaining',
    creditsUsed: 'Credits used',
    creditsExhausted: 'Credits exhausted',
    memberSince: 'Member since',
    accountType: 'Account type',
    summariesCreated: 'Summaries created',
    personalInfo: 'Personal information',
    dangerZone: 'Danger zone',
    deleteConfirm: 'Are you sure? This action is irreversible.',
    cancel: 'Cancel',
    confirmDelete: 'Confirm deletion',
    heroTitle: 'Stop chasing time.',
    heroSubtitle: 'Transcribe hours of video in seconds',
    heroDescription: 'Our AI distills key concepts from YouTube videos and endless documents.',
    tryFree: 'Try for free',
    turboProcessing: 'Turbo Processing',
    secureData: 'Secure Data',
    aiPowered: 'AI Powered',
    pricingTitle: 'Choose your success',
    pricingSubtitle: 'Invest in your time. Flexible plans designed to grow with you.',
    monthly: 'Monthly',
    annual: 'Annual',
    free: 'Free',
    starter: 'Starter',
    standard: 'Standard',
    pro: 'Pro Pack',
    business: 'Business',
  },
};

/**
 * Restituisce la mappa di traduzioni per la lingua specificata.
 * Se la lingua non è supportata, ritorna quella inglese come default (routes only in English).
 */
export function getTranslations(locale: string): TranslationMap {
  return translations[locale as Locale] || translations.en;
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
