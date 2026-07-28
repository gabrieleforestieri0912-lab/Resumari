import { getServiceClient, TABLES } from '@/lib/supabase';

export async function GET() {
  try {
    const client = getServiceClient();
    if (!client) return Response.json({ message: 'Server error' }, { status: 500 });
    const { count: userCount } = await client
      .from(TABLES.USERS)
      .select('id', { count: 'exact', head: true });

    const { count: chatCount } = await client
      .from(TABLES.CHATS)
      .select('id', { count: 'exact', head: true });

    const { data: withVideo, error: videoErr } = await client
      .from(TABLES.CHATS)
      .select('id')
      .not('video_id', 'is', null);

    if (videoErr) console.error('Stats video error:', videoErr);

    return Response.json({
      users: userCount || 0,
      chats: chatCount || 0,
      videos: withVideo?.length || 0,
    });
  } catch (e) {
    console.error('Stats error:', e);
    return Response.json(
      { message: 'Errore nel recupero delle statistiche' },
      { status: 500 },
    );
  }
}
