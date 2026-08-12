import { NextResponse } from 'next/server';
import { getServiceClient, TABLES } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';

// List and save the authenticated user's collected transcriptions.

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });
    const { data } = await client
      .from(TABLES.TRANSCRIPTS)
      .select()
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Get transcripts error:', error);
    return NextResponse.json({ message: 'Errore nel recupero trascrizioni' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const { videoId, title, channel, thumbnail, transcript, language, isGenerated, durationSec, creditsUsed } = await request.json();

    if (!videoId) {
      return NextResponse.json({ message: 'videoId obbligatorio' }, { status: 400 });
    }
    if (!Array.isArray(transcript)) {
      return NextResponse.json({ message: 'transcript obbligatorio' }, { status: 400 });
    }

    const client = getServiceClient();
    if (!client) return NextResponse.json({ message: 'Server error' }, { status: 500 });

    const now = new Date().toISOString();
    const row = {
      user_id: user.id,
      video_id: videoId,
      title: title || 'Video',
      channel: channel || null,
      thumbnail: thumbnail || null,
      transcript,
      language: language || null,
      is_generated: !!isGenerated,
      duration_sec: durationSec || 0,
      credits_used: creditsUsed || 1,
      updated_at: now,
    };

    // Upsert on (user_id, video_id) — transcribing the same video twice
    // refreshes the existing record instead of duplicating it.
    const { data: existing } = await client
      .from(TABLES.TRANSCRIPTS)
      .select('id')
      .eq('user_id', user.id)
      .eq('video_id', videoId)
      .maybeSingle();

    let saved;
    if (existing) {
      const { data } = await client
        .from(TABLES.TRANSCRIPTS)
        .update(row)
        .eq('id', existing.id)
        .select()
        .single();
      saved = data;
    } else {
      const { data } = await client
        .from(TABLES.TRANSCRIPTS)
        .insert({ ...row, created_at: now })
        .select()
        .single();
      saved = data;
    }

    return NextResponse.json(saved);
  } catch (error) {
    console.error('Save transcript error:', error);
    return NextResponse.json({ message: 'Errore nel salvataggio trascrizione' }, { status: 500 });
  }
}
