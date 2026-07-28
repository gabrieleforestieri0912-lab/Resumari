import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServiceClient, TABLES } from '@/lib/supabase';

let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia' as any,
  });
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
          console.log(`User ${userId} upgraded to ${plan}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const userId = subscription.metadata?.userId;

        if (userId) {
          const status = subscription.status;
          const plan = status === 'active'
            ? (subscription.items?.data[0]?.price?.product?.name?.toLowerCase().includes('business') ? 'business' : 'pro')
            : 'free';

          await client
            .from(TABLES.USERS)
            .update({
              plan: plan,
              stripe_subscription_id: subscription.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
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
