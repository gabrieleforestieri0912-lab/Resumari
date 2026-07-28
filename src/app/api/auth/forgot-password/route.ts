import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServiceClient, TABLES } from '@/lib/supabase';
import { Resend } from 'resend';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const RESET_TOKEN_EXPIRY = 3600000;

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const { success: rlSuccess } = rateLimit(ip);
  if (!rlSuccess) {
    return NextResponse.json({ message: 'Troppe richieste. Riprova più tardi.' }, { status: 429 });
  }

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: 'Email obbligatoria' },
        { status: 400 }
      );
    }

    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });
    const { data: user } = await client
      .from(TABLES.USERS)
      .select()
      .eq('email', email.toLowerCase())
      .single();

    if (user) {
      const locale = user.locale || 'it';
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = Date.now() + RESET_TOKEN_EXPIRY;

      await client
        .from(TABLES.USERS)
        .update({
          reset_token: resetToken,
          reset_token_expiry: resetTokenExpiry,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/resetpassword?token=${resetToken}`;

      if (!process.env.RESEND_API_KEY) {
        return NextResponse.json(
          { message: 'Servizio di reset password non configurato' },
          { status: 500 }
        );
      }

      const resend = new Resend(process.env.RESEND_API_KEY);

      const subject = locale === 'it' ? 'Reimposta la tua password - Resumari' : 'Reset your password - Resumari';

      const html = locale === 'it' ? `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .card { background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); padding: 40px; }
                .logo { font-size: 24px; font-weight: bold; color: #9333ea; margin-bottom: 20px; }
                .title { font-size: 20px; font-weight: bold; margin-bottom: 16px; }
                .text { color: #6b7280; margin-bottom: 24px; }
                .button { display: inline-block; background: #9333ea; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; }
                .footer { margin-top: 24px; font-size: 12px; color: #9ca3af; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="card">
                  <div class="logo">Resumari</div>
                  <div class="title">Hai richiesto di reimpostare la tua password</div>
                  <div class="text">
                    Ciao,<br><br>
                    Abbiamo ricevuto una richiesta per reimpostare la password del tuo account Resumari.<br><br>
                    Clicca sul pulsante qui sotto per creare una nuova password:
                  </div>
                  <a href="${resetUrl}" class="button" style="color: white;">Reimposta password</a>
                  <div class="text" style="margin-top: 24px;">
                    Se non hai richiesto questo cambiamento, puoi ignorare questa email.<br><br>
                    Il link scade tra 1 ora.
                  </div>
                  <div class="footer">
                    Se il pulsante non funziona, copia e incolla questo link nel tuo browser:<br>
                    ${resetUrl}
                  </div>
                </div>
              </div>
            </body>
            </html>
          ` : `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .card { background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); padding: 40px; }
                .logo { font-size: 24px; font-weight: bold; color: #9333ea; margin-bottom: 20px; }
                .title { font-size: 20px; font-weight: bold; margin-bottom: 16px; }
                .text { color: #6b7280; margin-bottom: 24px; }
                .button { display: inline-block; background: #9333ea; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; }
                .footer { margin-top: 24px; font-size: 12px; color: #9ca3af; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="card">
                  <div class="logo">Resumari</div>
                  <div class="title">Reset your password</div>
                  <div class="text">
                    Hello,<br><br>
                    We received a request to reset the password for your Resumari account.<br><br>
                    Click the button below to create a new password:
                  </div>
                  <a href="${resetUrl}" class="button" style="color: white;">Reset password</a>
                  <div class="text" style="margin-top: 24px;">
                    If you did not request this change, you can ignore this email.<br><br>
                    The link expires in 1 hour.
                  </div>
                  <div class="footer">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    ${resetUrl}
                  </div>
                </div>
              </div>
            </body>
            </html>
          `;

      try {
        await resend.emails.send({
          from: 'Resumari <noreply@resumari.it>',
          to: email.toLowerCase(),
          subject,
          html,
        });
      } catch (emailError) {
        console.error('Email send error:', emailError);
      }
    }

    return NextResponse.json({
      message: 'Se esiste un account con questa email, riceverai un link per reimpostare la password.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { message: 'Errore. Riprova più tardi.' },
      { status: 500 }
    );
  }
}
