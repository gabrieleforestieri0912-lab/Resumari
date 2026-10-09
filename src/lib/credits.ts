import { getServiceClient, TABLES } from '@/lib/supabase'
import { getPlanLimit } from '@/lib/plans'

// Catalogo dei piani (limiti, nomi, utilizzo) in `@/lib/plans`, così anche i
// componenti client mostrano gli stessi limiti applicati qui lato server.
// `CREDIT_COSTS` vive nello stesso modulo perché la pagina /api-keys è client
// e deve mostrare gli stessi costi che il server applica.
export {
  PLAN_LIMITS,
  PLAN_NAMES,
  CREDIT_COSTS,
  getPlanLimit,
  getPlanName,
  isPaidPlan,
  getCreditsUsage,
  creditsExhaustedMessage,
} from '@/lib/plans'

// Credits are consumed by transcriptions and AI chat, and are reset to the full
// pool at every subscription renewal (see the `invoice.paid` handler in
// /api/webhooks/stripe).

import { CREDIT_COSTS } from '@/lib/plans'

export function hasEnoughCredits(
  user: { credits?: number; plan?: string } | null | undefined,
  cost: number,
): boolean {
  if (!user) return false
  return (Number(user.credits) || 0) >= cost
}

/**
 * Atomic credit deduction.
 *
 * Reads the current balance, then updates with a guard on the exact value that
 * was read (optimistic concurrency), so two parallel requests can never both
 * spend the same credit. If another request wins the race the guard matches no
 * rows and we retry with a fresh read.
 *
 * Returns the new remaining balance, or `null` when the user does not have
 * enough credits (or the update never succeeded after the retries).
 */
export async function deductCredits(
  userId: string,
  cost: number,
  maxAttempts = 3,
): Promise<number | null> {
  const client = getServiceClient()
  if (cost <= 0) return null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data: current } = await client
      .from(TABLES.USERS)
      .select('credits')
      .eq('id', userId)
      .single()

    const currentCredits = Number(current?.credits ?? 0)
    if (currentCredits < cost) return null

    const newCredits = currentCredits - cost
    const { data, error } = await client
      .from(TABLES.USERS)
      .update({ credits: newCredits, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .eq('credits', currentCredits)
      .select('credits')

    if (!error && data && data.length > 0 && typeof data[0]?.credits === 'number') {
      return data[0].credits
    }
    // Guard failed → a concurrent request changed the balance → retry.
  }

  return null
}

/** Grants (or resets) the full monthly credit pool for a plan. */
export async function setPlanCredits(userId: string, plan: string): Promise<void> {
  const client = getServiceClient()
  await client
    .from(TABLES.USERS)
    .update({ credits: getPlanLimit(plan), updated_at: new Date().toISOString() })
    .eq('id', userId)
}
