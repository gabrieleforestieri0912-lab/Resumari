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
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const decoded = getUserFromToken(request);
  if (!decoded) {
    return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });
    const { data: chats } = await client
      .from(TABLES.CHATS)
      .select()
      .eq('user_id', decoded.userId)
      .order('updated_at', { ascending: false });

    return NextResponse.json(chats || []);
  } catch (error) {
    console.error('Get chats error:', error);
    return NextResponse.json({ message: 'Errore nel recupero chat' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const decoded = getUserFromToken(request);
  if (!decoded) {
    return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const { chatId, title, messages } = await request.json();

    if (!chatId) {
      return NextResponse.json({ message: 'Chat ID obbligatorio' }, { status: 400 });
    }

    const chatData = {
      user_id: decoded.userId,
      chat_id: chatId,
      title: title || 'Nuova Conversazione',
      messages: messages || [],
      updated_at: new Date().toISOString(),
    };

    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });

    // Check if chat exists
    const { data: existingChat } = await client
      .from(TABLES.CHATS)
      .select('id')
      .eq('user_id', decoded.userId)
      .eq('chat_id', chatId)
      .single();

    if (existingChat) {
      await client
        .from(TABLES.CHATS)
        .update(chatData)
        .eq('id', existingChat.id);
    } else {
      await client
        .from(TABLES.CHATS)
        .insert({ ...chatData, created_at: new Date().toISOString() });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save chat error:', error);
    return NextResponse.json({ message: 'Errore nel salvataggio chat' }, { status: 500 });
  }
}
