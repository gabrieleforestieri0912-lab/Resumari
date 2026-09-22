/**
 * Catalogo dei piani di abbonamento (limiti e nomi).
 *
 * Vive in un modulo senza import server-only (`@/lib/supabase`) così può essere
 * usato sia dalle API route (`@/lib/credits` lo ri-esporta) sia dai componenti
 * client, che in questo modo mostrano sempre gli stessi limiti del server.
 */

// Crediti mensili inclusi in ogni piano. `credits` nel database è il pool
// *rimanente*: viene riportato al valore pieno a ogni rinnovo (webhook Stripe).
export const PLAN_LIMITS: Record<string, number> = {
  free: 10,
  standard: 1000,
  pro: 2500,
  business: 6000,
};

// Nomi mostrati nell'account e nelle email.
export const PLAN_NAMES: Record<string, string> = {
  free: 'Starter',
  standard: 'Standard',
  pro: 'Pro Pack',
  business: 'Business',
};

// Prezzi in euro dei piani a pagamento: `monthly` è l'importo addebitato ogni
// mese, `annual` quello addebitato una volta l'anno. Sono gli stessi importi
// mostrati nella sezione prezzi della landing e usati per creare la sessione di
// checkout Stripe, così il totale addebitato non può divergere da quello
// pubblicizzato.
export const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
  standard: { monthly: 4.99, annual: 49.9 },
  pro: { monthly: 7.99, annual: 79.9 },
  business: { monthly: 9.99, annual: 99.9 },
};

export type BillingCycle = 'monthly' | 'annual';

/** Prezzo del piano nel ciclo di fatturazione scelto (in euro). */
export function getPlanPrice(plan: string, cycle: BillingCycle = 'monthly'): number {
  const prices = PLAN_PRICES[normalizePlan(plan)];
  if (!prices) return 0;
  return cycle === 'annual' ? prices.annual : prices.monthly;
}

// Piani ritirati che possono ancora esistere su account vecchi.
const LEGACY_PLAN_ALIASES: Record<string, string> = {
  premium: 'pro',
};

/** Riporta un piano (anche legacy) alla chiave canonica del catalogo. */
export function normalizePlan(plan?: string | null): string {
  const key = (plan || 'free').toLowerCase();
  return LEGACY_PLAN_ALIASES[key] || key;
}

/** Limite di crediti mensili del piano di un utente. */
export function getPlanLimit(plan?: string | null): number {
  return PLAN_LIMITS[normalizePlan(plan)] ?? PLAN_LIMITS.free;
}

/** Nome leggibile del piano di un utente. */
export function getPlanName(plan?: string | null): string {
  return PLAN_NAMES[normalizePlan(plan)] ?? PLAN_NAMES.free;
}

/** `true` per i piani a pagamento (Standard, Pro Pack, Business). */
export function isPaidPlan(plan?: string | null): boolean {
  return normalizePlan(plan) !== 'free';
}

/**
 * Messaggio d'errore quando il pool crediti del piano è esaurito.
 * Definito qui (e non nelle singole route) così le API rispondono sempre con lo
 * stesso testo, con il nome del piano e il limite mensile realmente applicati.
 */
export function creditsExhaustedMessage(plan?: string | null): string {
  return `Crediti esauriti. Il piano ${getPlanName(plan)} include ${getPlanLimit(plan)} crediti al mese: passa a un piano superiore o attendi il rinnovo mensile.`;
}

export type CreditsUsage = {
  plan: string;
  planName: string;
  /** Pool mensile previsto dal piano. */
  limit: number;
  /** Crediti ancora spendibili. */
  remaining: number;
  /** Crediti consumati nel ciclo corrente. */
  used: number;
  /** `true` quando il pool è esaurito: le funzioni AI sono bloccate. */
  exhausted: boolean;
};

/**
 * Calcola l'utilizzo dei crediti di un utente rispetto al *suo* piano.
 *
 * `credits` è il pool rimanente, quindi `used = limit - remaining`. Il valore
 * rimanente viene limitato al pool del piano: un account passato a un piano
 * inferiore (o con crediti residui di un piano più alto) non mostra percentuali
 * sopra il 100%.
 */
export function getCreditsUsage(
  user: { credits?: number | null; plan?: string | null } | null | undefined,
): CreditsUsage {
  const plan = normalizePlan(user?.plan);
  const limit = getPlanLimit(plan);
  const remaining = Math.max(0, Math.min(limit, Number(user?.credits ?? 0)));
  return {
    plan,
    planName: getPlanName(plan),
    limit,
    remaining,
    used: Math.max(0, limit - remaining),
    exhausted: remaining <= 0,
  };
}
