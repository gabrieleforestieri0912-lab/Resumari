import { NextResponse } from 'next/server';
import { getServiceClient, TABLES } from '@/lib/supabase';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: Request) {
  try {
    const { nome, email, messaggio } = await request.json();

    if (!nome || !email || !messaggio) {
      return NextResponse.json(
        { message: 'Compila tutti i campi.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Email non valida.' },
        { status: 400 }
      );
    }

    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });
    await client
      .from(TABLES.MESSAGES)
      .insert({
        nome,
        email: email.toLowerCase(),
        messaggio,
        created_at: new Date().toISOString(),
      });

    try {
      if (!resend) throw new Error('Resend not configured');
      await resend.emails.send({
        from: 'Resumari <noreply@resumari.it>',
        to: process.env.SUPPORT_EMAIL || 'gabriele.forestieri0912@gmail.com',
        subject: `Nuovo messaggio da ${nome}`,
        html: `
          <h2>Nuovo messaggio dal form Contattaci</h2>
          <p><strong>Nome:</strong> ${nome}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Messaggio:</strong></p>
          <p>${messaggio}</p>
        `,
      });
    } catch (emailError) {
      console.error('Email send error:', emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Supporto error:', error);
    return NextResponse.json(
      { message: 'Errore del server.' },
      { status: 500 }
    );
  }
}
