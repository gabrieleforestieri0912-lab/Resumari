import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { getPlanName, getPlanLimit, getPlanPrice, type BillingCycle } from '@/lib/plans';

const JWT_SECRET = process.env.JWT_SECRET;
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia' as any,
  });
}

// Prezzi e crediti dei piani vivono in `@/lib/plans` (fonte unica condivisa con
// la landing e con l'account), così l'importo addebitato coincide sempre con
// quello pubblicizzato.
const PLAN_DATA: Record<string, { name: string; description: string }> = {
  standard: { name: getPlanName('standard'), description: 'Piano Standard mensile' },
  pro: { name: getPlanName('pro'), description: 'Piano Pro mensile' },
  business: { name: getPlanName('business'), description: 'Piano Business mensile' },
};

function getUserFromToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    if (!JWT_SECRET) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!JWT_SECRET) {
    return NextResponse.json(
      { message: 'JWT non configurato' },
      { status: 500 }
    );
  }

  const decoded = getUserFromToken(request);
  if (!decoded) {
    return NextResponse.json(
      { message: 'Non autorizzato' },
      { status: 401 }
    );
  }

  try {
    const { plan, billingCycle } = await request.json();

    if (!plan || !PLAN_DATA[plan]) {
      return NextResponse.json(
        { message: 'Piano non valido' },
        { status: 400 }
      );
    }

    const cycle: BillingCycle = billingCycle === 'annual' ? 'annual' : 'monthly';
    const planInfo = PLAN_DATA[plan];
    const price = getPlanPrice(plan, cycle);
    const monthlyLimit = getPlanLimit(plan);

    if (!stripe) {
      return NextResponse.json(
        { message: 'Servizio Stripe non configurato' },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: planInfo.name,
              description: `${planInfo.description} — ${monthlyLimit} crediti al mese`,
            },
            unit_amount: Math.round(price * 100),
            recurring: {
              interval: cycle === 'annual' ? 'year' : 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://resumari.vercel.app'}/?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://resumari.vercel.app'}/?canceled=true`,
      metadata: {
        userId: decoded.userId,
        plan,
        billingCycle: cycle,
      },
      // The subscription (and its invoices) inherit this metadata, so the
      // webhook can attribute renewals and reset the monthly credit pool.
      subscription_data: {
        metadata: {
          userId: decoded.userId,
          plan,
          billingCycle: cycle,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { message: 'Errore durante la creazione della sessione di checkout' },
      { status: 500 }
    );
  }
}
