import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServiceClient, TABLES } from '@/lib/supabase';
import { Resend } from 'resend';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const CODE_EXPIRY = 600000;

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const { success } = rateLimit(ip);
  if (!success) {
    return NextResponse.json({ message: 'Troppe richieste. Riprova più tardi.' }, { status: 429 });
  }

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ message: 'Email obbligatoria' }, { status: 400 });
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const codeExpiry = new Date(Date.now() + CODE_EXPIRY);

    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });

    // Upsert verification code
    const { data: existing } = await client
      .from(TABLES.VERIFICATION_CODES)
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      await client
        .from(TABLES.VERIFICATION_CODES)
        .update({
          code,
          expires_at: codeExpiry.toISOString(),
          used: false,
          created_at: new Date().toISOString(),
        })
        .eq('email', email.toLowerCase());
    } else {
      await client
        .from(TABLES.VERIFICATION_CODES)
        .insert({
          email: email.toLowerCase(),
          code,
          expires_at: codeExpiry.toISOString(),
          used: false,
          created_at: new Date().toISOString(),
        });
    }

    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'Resumari <noreply@resumari.it>',
          to: email.toLowerCase(),
          subject: 'Il tuo codice di verifica - Resumari',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .card { background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); padding: 40px; text-align: center; }
                .logo { font-size: 24px; font-weight: bold; color: #9333ea; margin-bottom: 20px; }
                .title { font-size: 20px; font-weight: bold; margin-bottom: 16px; }
                .text { color: #6b7280; margin-bottom: 24px; }
                .code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #9333ea; background: #f5f3ff; padding: 16px 24px; border-radius: 12px; display: inline-block; margin: 16px 0; }
                .footer { margin-top: 24px; font-size: 12px; color: #9ca3af; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="card">
                  <div class="logo">Resumari</div>
                  <div class="title">Ecco il tuo codice di verifica</div>
                  <div class="text">
                    Usa questo codice per accedere a Resumari. Il codice scade tra 10 minuti.
                  </div>
                  <div class="code">${code}</div>
                  <div class="footer">
                    Se non hai richiesto questo codice, ignora questa email.
                  </div>
                </div>
              </div>
            </body>
            </html>
          `
        });
      } catch (emailError) {
        console.error('Send code email error:', emailError);
      }
    }

    return NextResponse.json({
      message: 'Codice di verifica inviato alla tua email.'
    });
  } catch (error) {
    console.error('Send code error:', error);
    return NextResponse.json({ message: 'Errore durante l\'invio del codice' }, { status: 500 });
  }
}
