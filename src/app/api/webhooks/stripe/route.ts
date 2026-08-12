import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServiceClient, TABLES } from '@/lib/supabase';
import { setPlanCredits } from '@/lib/credits';

let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia' as any,
  });
}

// Plan is passed through the checkout `subscription_data.metadata`; fall back to
// the product name for subscriptions created before that was added.
function planFromSubscription(subscription: any): string {
  const metaPlan = subscription?.metadata?.plan;
  if (metaPlan === 'pro' || metaPlan === 'business') return metaPlan;
  const productName = subscription?.items?.data?.[0]?.price?.product?.name;
  if (typeof productName === 'string' && productName.toLowerCase().includes('business')) {
    return 'business';
  }
  return 'pro';
}

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json(
      { message: 'Stripe non configurato' },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { message: 'Signature mancante' },
      { status: 400 }
    );
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { message: 'Signature invalida' },
      { status: 400 }
    );
  }

  try {
    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;

        if (userId && plan) {
          await client
            .from(TABLES.USERS)
            .update({
              plan: plan,
              stripe_subscription_id: session.subscription,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
          // Grant the full monthly credit pool on activation.
          await setPlanCredits(userId, plan);
          console.log(`User ${userId} upgraded to ${plan} — credits granted`);
        }
        break;
      }

      case 'invoice.paid': {
        // Fires on the first invoice AND at every monthly renewal. Resetting to
        // the plan limit is idempotent, so granting twice at checkout (also via
        // checkout.session.completed) is harmless — it simply re-sets the pool.
        const invoice = event.data.object as any;
        if (!invoice.subscription) break;

        try {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          const userId = subscription.metadata?.userId;
          const plan = planFromSubscription(subscription);
          if (userId && plan && plan !== 'free') {
            await setPlanCredits(userId, plan);
            await client
              .from(TABLES.USERS)
              .update({
                plan,
                stripe_subscription_id: subscription.id,
                updated_at: new Date().toISOString(),
              })
              .eq('id', userId);
            console.log(`Monthly credits reset for user ${userId} (${plan})`);
          }
        } catch (err) {
          console.error('Failed to reset credits on invoice.paid:', err);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const userId = subscription.metadata?.userId;

        if (userId) {
          const status = subscription.status;
          const plan = status === 'active' ? planFromSubscription(subscription) : 'free';

          await client
            .from(TABLES.USERS)
            .update({
              plan: plan,
              stripe_subscription_id: subscription.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
          console.log(`Subscription for user ${userId} → ${plan}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await client
            .from(TABLES.USERS)
            .update({
              plan: 'free',
              stripe_subscription_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
          // Credits already paid for are kept; the plan simply drops to free.
          console.log(`User ${userId} subscription cancelled`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { message: 'Errore processamento webhook' },
      { status: 500 }
    );
  }
}
