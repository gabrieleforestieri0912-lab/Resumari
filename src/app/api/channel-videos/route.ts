import { NextResponse } from "next/server";
import { fetchChannelVideos } from "@/lib/youtube";

/**
 * Endpoint API per recuperare l'elenco dei video caricati da un canale YouTube.
 * Supporta la ricerca tramite URL del canale e recupera fino a 50 video.
 *
 * Aspetta un JSON con il campo 'channelUrl'.
 */
export async function POST(request: Request) {
  try {
    const { channelUrl } = await request.json();

    if (!channelUrl) {
      return NextResponse.json(
        { message: "URL canale obbligatorio" },
        { status: 400 },
      );
    }

    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json(
        { message: "YouTube API non configurata" },
        { status: 500 },
      );
    }

    const result = await fetchChannelVideos(channelUrl, 50);
    if (!result) {
      return NextResponse.json(
        { message: "Canale non trovato o non valido" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      channelId: result.channelId,
      channelTitle: result.channelTitle,
      channelThumbnail: result.channelThumbnail,
      channelDescription: result.channelDescription,
      videos: result.videos,
      totalVideos: result.videos.length,
    });
  } catch (error) {
    console.error("Error fetching channel videos:", error);
    return NextResponse.json(
      { message: "Errore nel recupero video del canale" },
      { status: 500 },
    );
  }
}

