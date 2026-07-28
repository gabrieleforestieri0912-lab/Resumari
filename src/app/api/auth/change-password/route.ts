import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServiceClient, TABLES } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: 'Tutti i campi sono obbligatori' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: 'La nuova password deve avere almeno 6 caratteri' },
        { status: 400 }
      );
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password || '');
    if (!isMatch) {
      return NextResponse.json(
        { message: 'Password attuale errata' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });

    // Update password
    await client
      .from(TABLES.USERS)
      .update({
        password: hashedPassword,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    return NextResponse.json({
      message: 'Password aggiornata con successo'
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { message: 'Errore durante l\'aggiornamento della password' },
      { status: 500 }
    );
  }
}
