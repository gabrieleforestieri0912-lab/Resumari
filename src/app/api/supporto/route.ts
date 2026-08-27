import { NextResponse } from 'next/server';
import { getServiceClient, TABLES } from '@/lib/supabase';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: Request) {
  try {
    const { nome, email, messaggio } = await request.json();

    if (!messaggio || !String(messaggio).trim()) {
      return NextResponse.json(
        { message: 'Scrivi un feedback prima di inviare.' },
        { status: 400 }
      );
    }

    const nomePulito = nome ? String(nome).trim() : '';
    const emailPulita = email ? String(email).trim().toLowerCase() : '';

    if (emailPulita) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailPulita)) {
        return NextResponse.json(
          { message: 'Email non valida.' },
          { status: 400 }
        );
      }
    }

    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });
    await client
      .from(TABLES.MESSAGES)
      .insert({
        nome: nomePulito || 'Anonimo',
        email: emailPulita,
        messaggio: String(messaggio).trim(),
        created_at: new Date().toISOString(),
      });

    try {
      if (!resend) throw new Error('Resend not configured');
      await resend.emails.send({
        from: 'Resumari <noreply@resumari.com>',
        to: process.env.SUPPORT_EMAIL || 'gabriele.forestieri0912@gmail.com',
        subject: `Nuovo feedback${nomePulito ? ` da ${nomePulito}` : ''}`,
        html: `
          <h2>Nuovo feedback</h2>
          <p><strong>Nome:</strong> ${nomePulito || 'Anonimo'}</p>
          <p><strong>Email:</strong> ${emailPulita || 'non fornita'}</p>
          <p><strong>Feedback:</strong></p>
          <p>${String(messaggio).trim()}</p>
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
