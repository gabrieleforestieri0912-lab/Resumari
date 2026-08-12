import { NextResponse } from 'next/server';
import { getServiceClient, TABLES } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';

// Usage history for the extension side panel and the dashboard.
// Events come from two sources:
//   - transcripts  → type "transcript" (a transcription saved from the panel/site)
//   - chats        → type "chat" (an AI chat/summary against a video)
// Credits used are recorded on transcripts; every AI chat/summary costs 1 credit
// (see /api/ai/chat and /api/video).

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });

    const [transcriptsRes, chatsRes] = await Promise.all([
      client
        .from(TABLES.TRANSCRIPTS)
        .select('id, video_id, title, channel, credits_used, created_at')
        .eq('user_id', user.id),
      client
        .from(TABLES.CHATS)
        .select('id, video_id, title, created_at')
        .eq('user_id', user.id)
        .not('video_id', 'is', null),
    ]);

    type UsageEvent = {
      id: string;
      type: 'transcript' | 'chat';
      videoId: string | null;
      title: string;
      channel: string | null;
      credits: number;
      createdAt: string;
    };

    const transcriptEvents: UsageEvent[] = (transcriptsRes.data || []).map((t: any) => ({
      id: t.id,
      type: 'transcript' as const,
      videoId: t.video_id,
      title: t.title || 'Video',
      channel: t.channel || null,
      credits: t.credits_used || 1,
      createdAt: t.created_at,
    }));

    const chatEvents: UsageEvent[] = (chatsRes.data || []).map((c: any) => ({
      id: c.id,
      type: 'chat' as const,
      videoId: c.video_id,
      title: c.title || 'Chat con IA',
      channel: null,
      credits: 1,
      createdAt: c.created_at,
    }));

    const events = [...transcriptEvents, ...chatEvents]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 200);

    const videoIds = new Set<string>();
    events.forEach((e) => {
      if (e.videoId) videoIds.add(e.videoId);
    });

    const totals = {
      events: events.length,
      transcripts: transcriptEvents.length,
      chats: chatEvents.length,
      videos: videoIds.size,
      creditsUsed: transcriptEvents.reduce((s: number, e) => s + e.credits, 0) + chatEvents.length,
    };

    return NextResponse.json({ events, totals });
  } catch (error) {
    console.error('Usage history error:', error);
    return NextResponse.json({ message: 'Errore nel recupero dello storico' }, { status: 500 });
  }
}
