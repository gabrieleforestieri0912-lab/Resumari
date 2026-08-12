import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { createMockSupabaseClient } from '../helpers/supabase-mock'

const { constructEventMock, retrieveSubscriptionMock, getServiceClientMock } = vi.hoisted(() => ({
  constructEventMock: vi.fn(),
  retrieveSubscriptionMock: vi.fn(),
  getServiceClientMock: vi.fn(),
}))

vi.mock('stripe', () => ({
  __esModule: true,
  default: vi.fn().mockImplementation(() => ({
    webhooks: { constructEvent: constructEventMock },
    subscriptions: { retrieve: retrieveSubscriptionMock },
  })),
}))

vi.mock('@/lib/supabase', () => ({
  getServiceClient: getServiceClientMock,
  getSupabaseClient: vi.fn(),
  TABLES: { USERS: 'users' },
}))

// The route instantiates Stripe at import time, so the env vars must be set
// before the module is loaded.
let POST: (request: Request) => Promise<Response>
beforeAll(async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_123'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  vi.resetModules()
  const mod = await import('@/app/api/webhooks/stripe/route')
  POST = mod.POST
})

const client = createMockSupabaseClient()
vi.mocked(getServiceClientMock).mockReturnValue(client)

const user = {
  id: 'user-1',
  email: 'test@example.com',
  credits: 5,
  plan: 'free',
  stripe_subscription_id: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

function webhookRequest(event: any): Request {
  constructEventMock.mockReturnValue(event)
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': 'sig' },
    body: '{}',
  })
}

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServiceClientMock).mockReturnValue(client)
    client.setData('users', [{ ...user }])
  })

  it('grants the full monthly credit pool on checkout.session.completed', async () => {
    const res = await POST(
      webhookRequest({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'user-1', plan: 'pro' },
            subscription: 'sub_123',
          },
        },
      }),
    )
    expect(res.status).toBe(200)
    const stored = client.getData('users')[0]
    expect(stored.plan).toBe('pro')
    expect(stored.stripe_subscription_id).toBe('sub_123')
    expect(stored.credits).toBe(1000)
  })

  it('resets credits to the plan limit on monthly invoice.paid', async () => {
    client.setData('users', [{ ...user, plan: 'business', credits: 0, stripe_subscription_id: 'sub_123' }])
    retrieveSubscriptionMock.mockResolvedValue({
      id: 'sub_123',
      metadata: { userId: 'user-1', plan: 'business' },
    })

    const res = await POST(
      webhookRequest({
        type: 'invoice.paid',
        data: { object: { subscription: 'sub_123' } },
      }),
    )
    expect(res.status).toBe(200)
    expect(retrieveSubscriptionMock).toHaveBeenCalledWith('sub_123')
    const stored = client.getData('users')[0]
    expect(stored.plan).toBe('business')
    expect(stored.credits).toBe(3000)
  })

  it('supports the standard plan (metadata and product-name fallback)', async () => {
    // Metadata path: invoice.paid resets the standard pool to 750.
    client.setData('users', [{ ...user, plan: 'standard', credits: 0, stripe_subscription_id: 'sub_std' }])
    retrieveSubscriptionMock.mockResolvedValue({
      id: 'sub_std',
      metadata: { userId: 'user-1', plan: 'standard' },
    })
    const res = await POST(
      webhookRequest({
        type: 'invoice.paid',
        data: { object: { subscription: 'sub_std' } },
      }),
    )
    expect(res.status).toBe(200)
    expect(client.getData('users')[0].credits).toBe(750)

    // Fallback path: product name only (no plan in metadata; userId always
    // comes from the subscription metadata).
    client.setData('users', [{ ...user, plan: 'standard', credits: 0, stripe_subscription_id: 'sub_std2' }])
    retrieveSubscriptionMock.mockResolvedValue({
      id: 'sub_std2',
      metadata: { userId: 'user-1' },
      items: { data: [{ price: { product: { name: 'Standard' } } }] },
    })
    const res2 = await POST(
      webhookRequest({
        type: 'invoice.paid',
        data: { object: { subscription: 'sub_std2' } },
      }),
    )
    expect(res2.status).toBe(200)
    expect(client.getData('users')[0].plan).toBe('standard')
    expect(client.getData('users')[0].credits).toBe(750)
  })

  it('does not reset credits when invoice.paid has no subscription', async () => {
    client.setData('users', [{ ...user, plan: 'pro', credits: 42 }])
    const res = await POST(
      webhookRequest({
        type: 'invoice.paid',
        data: { object: { subscription: null } },
      }),
    )
    expect(res.status).toBe(200)
    expect(retrieveSubscriptionMock).not.toHaveBeenCalled()
    expect(client.getData('users')[0].credits).toBe(42)
  })

  it('syncs the plan on customer.subscription.updated (from metadata)', async () => {
    const res = await POST(
      webhookRequest({
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            status: 'active',
            metadata: { userId: 'user-1', plan: 'business' },
          },
        },
      }),
    )
    expect(res.status).toBe(200)
    const stored = client.getData('users')[0]
    expect(stored.plan).toBe('business')
    expect(stored.stripe_subscription_id).toBe('sub_123')
  })

  it('downgrades to free on customer.subscription.deleted keeping credits', async () => {
    client.setData('users', [{ ...user, plan: 'pro', credits: 350 }])
    const res = await POST(
      webhookRequest({
        type: 'customer.subscription.deleted',
        data: {
          object: { id: 'sub_123', metadata: { userId: 'user-1' } },
        },
      }),
    )
    expect(res.status).toBe(200)
    const stored = client.getData('users')[0]
    expect(stored.plan).toBe('free')
    expect(stored.stripe_subscription_id).toBeNull()
    expect(stored.credits).toBe(350)
  })
})
