import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Inizializzazione del client Stripe utilizzando la chiave segreta dalle variabili d'ambiente
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia' as any,
  });
}

/**
 * Endpoint API per verificare lo stato di un checkout di Stripe.
 * Viene utilizzato dopo che l'utente è stato reindirizzato al sito dal portale di pagamento.
 *
 * Richiede il parametro query 'session_id'.
 */
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
    // Recupera i dettagli della sessione di checkout tramite l'API di Stripe
    const session = await stripe!.checkout.sessions.retrieve(sessionId);

    // Restituisce lo stato del pagamento (es. 'paid', 'unpaid')
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
