import { NextResponse } from "next/server";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";

/**
 * Estrae l'identificatore del canale YouTube da un URL.
 * Gestisce diversi formati: handle (@utente), ID canale (/channel/ID), /user/nome o /c/nome.
 *
 * @param url L'URL del canale YouTube.
 * @returns Un oggetto contenente il tipo (handle o id) e il valore, oppure null se non valido.
 */
function getYouTubeChannelId(url: string) {
  const patterns = [
    /youtube\.com\/@([a-zA-Z0-9_-]+)/,
    /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        type: pattern.source.includes("@") ? "handle" as const : "id" as const,
        value: match[1],
      };
    }
  }
  return null;
}

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

    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { message: "YouTube API non configurata" },
        { status: 500 },
      );
    }

    // 1. Identificazione dell'ID canale dall'URL
    const channelInfo = getYouTubeChannelId(channelUrl);
    if (!channelInfo) {
      return NextResponse.json(
        { message: "URL canale YouTube non valido" },
        { status: 400 },
      );
    }

    let channelId = channelInfo.value;

    // Se l'URL era un handle (@nome), dobbiamo prima risolvere l'ID reale del canale tramite l'API di ricerca
    if (channelInfo.type === "handle") {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(channelId)}&key=${YOUTUBE_API_KEY}&maxResults=1`;
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (!searchData.items || searchData.items.length === 0) {
        return NextResponse.json(
          { message: "Canale non trovato" },
          { status: 404 },
        );
      }

      channelId = searchData.items[0].id.channelId;
    }

    // 2. Recupero dei dettagli del canale e della playlist degli upload
    const channelDetailsUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`;
    const channelResponse = await fetch(channelDetailsUrl);
    const channelData = await channelResponse.json();

    if (!channelData.items || channelData.items.length === 0) {
      return NextResponse.json(
        { message: "Canale non trovato" },
        { status: 404 },
      );
    }

    const channelTitle = channelData.items[0].snippet.title;
    const channelThumbnail =
      channelData.items[0].snippet.thumbnails?.high?.url ||
      channelData.items[0].snippet.thumbnails?.default?.url ||
      null;
    const channelDescription = channelData.items[0].snippet.description || "";
    const uploadsPlaylistId =
      channelData.items[0].contentDetails.relatedPlaylists.uploads;

    // 3. Recupero dei video dalla playlist 'uploads' con paginazione (max 5 pagine)
    const videos: Array<{ videoId: string; title: string; publishedAt: string }> = [];
    let nextPageToken = "";
    let pageCount = 0;
    const maxPages = 5;

    while (pageCount < maxPages) {
      const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50&pageToken=${nextPageToken}&key=${YOUTUBE_API_KEY}`;
      const playlistResponse = await fetch(playlistUrl);
      const playlistData = await playlistResponse.json();

      if (!playlistData.items) break;

      for (const item of playlistData.items) {
        if (
          item.snippet &&
          item.snippet.resourceId &&
          item.snippet.resourceId.videoId
        ) {
          videos.push({
            videoId: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            publishedAt: item.snippet.publishedAt,
          });
        }
      }

      nextPageToken = playlistData.nextPageToken;
      if (!nextPageToken) break;
      pageCount++;
    }

    return NextResponse.json({
      channelId,
      channelTitle,
      channelThumbnail,
      channelDescription,
      videos: videos.slice(0, 50),
      totalVideos: videos.length,
    });
  } catch (error) {
    console.error("Error fetching channel videos:", error);
    return NextResponse.json(
      { message: "Errore nel recupero video del canale" },
      { status: 500 },
    );
  }
}
