import { getServiceClient, TABLES } from '@/lib/supabase'

// Monthly credit pool per plan. Credits are consumed by transcriptions and AI
// chat, and are reset to the full pool at every subscription renewal (see the
// `invoice.paid` handler in /api/webhooks/stripe).
export const PLAN_LIMITS: Record<string, number> = {
  free: 10,
  standard: 750,
  pro: 1000,
  business: 3000,
}

// Credits charged per operation type.
export const CREDIT_COSTS = {
  transcription: 1, // /api/video and /api/video/transcribe
  transcriptionApi: 2, // /api/v1/transcript (public API)
  chat: 1, // /api/ai/chat
} as const

export function getPlanLimit(plan?: string | null): number {
  return PLAN_LIMITS[plan || 'free'] ?? PLAN_LIMITS.free
}

/** Every plan (free included) works on the same pool: enough credits or not. */
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
  if (!client || cost <= 0) return null

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
  if (!client) return
  await client
    .from(TABLES.USERS)
    .update({ credits: getPlanLimit(plan), updated_at: new Date().toISOString() })
    .eq('id', userId)
}
