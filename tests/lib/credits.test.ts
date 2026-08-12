import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabaseClient } from '../helpers/supabase-mock'

const { getServiceClientMock } = vi.hoisted(() => ({
  getServiceClientMock: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  getServiceClient: getServiceClientMock,
  getSupabaseClient: vi.fn(),
  TABLES: { USERS: 'users' },
}))

import {
  PLAN_LIMITS,
  CREDIT_COSTS,
  getPlanLimit,
  hasEnoughCredits,
  deductCredits,
  setPlanCredits,
} from '@/lib/credits'

const client = createMockSupabaseClient()
vi.mocked(getServiceClientMock).mockReturnValue(client)

const userRow = (overrides: Record<string, any> = {}) => ({
  id: 'user-1',
  credits: 10,
  plan: 'free',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

describe('credits module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServiceClientMock).mockReturnValue(client)
    client.setData('users', [userRow()])
  })

  it('defines the monthly credit pools per plan', () => {
    expect(PLAN_LIMITS).toEqual({ free: 10, standard: 750, pro: 1000, business: 3000 })
    expect(CREDIT_COSTS.transcription).toBe(1)
    expect(CREDIT_COSTS.transcriptionApi).toBe(2)
    expect(CREDIT_COSTS.chat).toBe(1)
  })

  it('resolves the plan limit (unknown plans fall back to free)', () => {
    expect(getPlanLimit('free')).toBe(10)
    expect(getPlanLimit('standard')).toBe(750)
    expect(getPlanLimit('pro')).toBe(1000)
    expect(getPlanLimit('business')).toBe(3000)
    expect(getPlanLimit('nonexistent')).toBe(10)
    expect(getPlanLimit(null)).toBe(10)
    expect(getPlanLimit(undefined)).toBe(10)
  })

  it('checks whether a user has enough credits regardless of plan', () => {
    expect(hasEnoughCredits({ credits: 5 }, 5)).toBe(true)
    expect(hasEnoughCredits({ credits: 4, plan: 'business' }, 5)).toBe(false)
    expect(hasEnoughCredits({ credits: 0, plan: 'pro' }, 1)).toBe(false)
    expect(hasEnoughCredits(null, 1)).toBe(false)
  })

  it('deducts credits and returns the new balance', async () => {
    const remaining = await deductCredits('user-1', 2)
    expect(remaining).toBe(8)
    expect(client.getData('users')[0].credits).toBe(8)
  })

  it('returns null without touching the balance when credits are insufficient', async () => {
    client.setData('users', [userRow({ credits: 1 })])
    const remaining = await deductCredits('user-1', 2)
    expect(remaining).toBeNull()
    expect(client.getData('users')[0].credits).toBe(1)
  })

  it('returns null for non-positive costs', async () => {
    expect(await deductCredits('user-1', 0)).toBeNull()
    expect(await deductCredits('user-1', -1)).toBeNull()
  })

  it('does not overspend under concurrent deductions (optimistic guard)', async () => {
    client.setData('users', [userRow({ credits: 5 })])

    // Two parallel deductions of 1 from a balance of 5: both read 5, only one
    // write passes the `credits = 5` guard, the other retries on the new value.
    const [a, b] = await Promise.all([
      deductCredits('user-1', 1),
      deductCredits('user-1', 1),
    ])

    // Exactly 2 credits spent, never below zero, both callers get a balance.
    expect([a, b].sort()).toEqual([3, 4])
    expect(client.getData('users')[0].credits).toBe(3)
  })

  it('grants the full monthly pool for a plan', async () => {
    await setPlanCredits('user-1', 'business')
    expect(client.getData('users')[0].credits).toBe(3000)
    await setPlanCredits('user-1', 'pro')
    expect(client.getData('users')[0].credits).toBe(1000)
    await setPlanCredits('user-1', 'standard')
    expect(client.getData('users')[0].credits).toBe(750)
    await setPlanCredits('user-1', 'free')
    expect(client.getData('users')[0].credits).toBe(10)
  })
})
