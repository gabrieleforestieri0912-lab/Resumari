import { NextResponse } from 'next/server';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

/**
 * Mappa di shortcut per canali YouTube popolari.
 * Permette un recupero immediato dell'ID canale senza dover interrogare l'API di ricerca.
 */
const CHANNEL_SLUG_TO_ID: Record<string, string> = {
  "hubermanlab": "UC2D2CMWXMOVWx7giW1n3LIg",
  "hubermanlabclips": "UCkZjTZNvuxq1CYMS3cwZa1Q",
  "hamza": "UCWsslCoN3b_wBaFVWK_ye_A",
  "lexfridman": "UCSHZKyawb77ixDdsGog4iWA",
  "aliabdaal": "UCoOae5nYA7VqaXzerajD0lg",
  "veritasium": "UCHnyfMqiRRG1u-2MsSQLbXA",
  "danzakaria": "UCX3R4xuKXIhoaxj44HGmhlw"
};

/**
 * Endpoint API per recuperare l'elenco dei video di un canale specifico.
 * Accetta un parametro query 'channel' (nome del canale o slug).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channelName = searchParams.get('channel');

  if (!channelName) {
    return NextResponse.json({ message: "Channel name required" }, { status: 400 });
  }

  if (!YOUTUBE_API_KEY) {
    return NextResponse.json({ message: "YouTube API key not configured" }, { status: 500 });
  }

  try {
    // 1. Tentativo di recupero ID canale tramite la mappa locale di slug
    let channelId = CHANNEL_SLUG_TO_ID[channelName.toLowerCase().replace(/ /g, "")];

    // 2. Se non trovato localmente, interroga l'API di ricerca di YouTube
    if (!channelId) {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(channelName)}&type=channel&key=${YOUTUBE_API_KEY}`;
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (searchData.items && searchData.items.length > 0) {
        channelId = searchData.items[0].id.channelId;
      } else {
        return NextResponse.json({ message: "Channel not found" }, { status: 404 });
      }
    }

    // 3. Recupero dell'ID della playlist 'uploads' del canale
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`;
    const channelResponse = await fetch(channelUrl);
    const channelData = await channelResponse.json();

    if (!channelData.items || channelData.items.length === 0) {
      return NextResponse.json({ message: "Channel details not found" }, { status: 404 });
    }

    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

    // 4. Recupero dei primi 10 video caricati dal canale
    const videosUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=10&key=${YOUTUBE_API_KEY}`;
    const videosResponse = await fetch(videosUrl);
    const videosData = await videosResponse.json();

    if (!videosData.items) {
      return NextResponse.json({ message: "No videos found" }, { status: 404 });
    }

    const videos = videosData.items.map((item: any) => ({
      id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url
    })).filter((v: any) => v.id);

    return NextResponse.json({ videos });
  } catch (error) {
    console.error('YouTube API error:', error);
    return NextResponse.json({ message: "Error fetching videos" }, { status: 500 });
  }
}
