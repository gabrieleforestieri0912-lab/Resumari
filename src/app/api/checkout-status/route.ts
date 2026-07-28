import { NextResponse } from 'next/server';
import Stripe from 'stripe';

let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia' as any,
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json(
      { message: 'Session ID mancante' },
      { status: 400 }
    );
  }

  try {
    const session = await stripe!.checkout.sessions.retrieve(sessionId);

    return NextResponse.json({
      status: session.payment_status,
    });
  } catch (error) {
    console.error('Error retrieving session:', error);
    return NextResponse.json(
      { message: 'Errore nel recupero della sessione' },
      { status: 500 }
    );
  }
}
