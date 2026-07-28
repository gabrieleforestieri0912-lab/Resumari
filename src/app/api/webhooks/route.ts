import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServiceClient, TABLES } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const CREDITS_BY_PLAN: Record<string, number> = {
  pro: 1000,
  business: 3000,
};

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig!, endpointSecret!);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const userId = session.metadata.userId;
    const plan = session.metadata.plan;

    if (userId && plan) {
    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });
      await client
        .from(TABLES.USERS)
        .update({
          plan: plan,
          credits: CREDITS_BY_PLAN[plan] || 10,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    }
  }

  return NextResponse.json({ received: true });
}
