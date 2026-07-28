import { NextResponse } from "next/server";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");

    if (!channelId) {
      return NextResponse.json({ message: "channelId obbligatorio" }, { status: 400 });
    }

    if (!YOUTUBE_API_KEY) {
      return NextResponse.json({ message: "YouTube API non configurata" }, { status: 500 });
    }

    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`;
    const channelRes = await fetch(channelUrl);
    const channelData = await channelRes.json();

    if (!channelData.items || channelData.items.length === 0) {
      return NextResponse.json({ message: "Canale non trovato" }, { status: 404 });
    }

    const snippet = channelData.items[0].snippet;
    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

    const videos: Array<{ videoId: string; title: string; publishedAt: string; thumbnails: any }> = [];
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=12&key=${YOUTUBE_API_KEY}`;
    const playlistRes = await fetch(playlistUrl);
    const playlistData = await playlistRes.json();

    if (playlistData.items) {
      for (const item of playlistData.items) {
        if (item.snippet?.resourceId?.videoId) {
          videos.push({
            videoId: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            publishedAt: item.snippet.publishedAt,
            thumbnails: item.snippet.thumbnails,
          });
        }
      }
    }

    return NextResponse.json({
      channelId,
      channelTitle: snippet.title,
      channelThumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || null,
      channelDescription: snippet.description || "",
      videos,
    });
  } catch (error) {
    console.error("Error fetching channel info:", error);
    return NextResponse.json({ message: "Errore nel recupero info canale" }, { status: 500 });
  }
}
