import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getServiceClient, TABLES } from '@/lib/supabase';

const JWT_SECRET = process.env.JWT_SECRET;

function getUserFromToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    if (!JWT_SECRET) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch {
    return null;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const decoded = getUserFromToken(request);
  if (!decoded) {
    return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });
    await client
      .from(TABLES.CHATS)
      .delete()
      .eq('user_id', decoded.userId)
      .eq('chat_id', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete chat error:', error);
    return NextResponse.json({ message: 'Errore nell\'eliminazione chat' }, { status: 500 });
  }
}
