import { NextResponse } from "next/server";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";

const DEMO_CHANNELS = [
  {
    channelId: "UC2D2CMWXMOVWx7giW1n3LIg",
    channelTitle: "Andrew Huberman",
    channelDescription: "Neuroscienze e salute",
    channelThumbnail: "https://yt3.googleusercontent.com/ytc/AIdro_ni1vPcWHlX1JQ7V3x7XEGn3r5V3e0x7vnSR8Q5jQ=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCWsslCoN3b_wBaFVWK_ye_A",
    channelTitle: "Hamza Ahmed",
    channelDescription: "Self improvement",
    channelThumbnail: "https://yt3.googleusercontent.com/mXh-LRMQKGFqH4Ean52o0HSYRDI5o5vRHS8XjYQWP9W2rYw_u6ZByG0qI5cTnZRGiX4JRMXJ=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCX3R4xuKXIhoaxj44HGmhlw",
    channelTitle: "Dan Zakaria",
    channelDescription: "Crescita personale e business",
    channelThumbnail: "https://yt3.googleusercontent.com/U6XhF-gg2Al9AMOGGNdE9f8B4G6e2lKJxHGeRpfmpFy5BQPmh9hBh2N5r9v6n8zF5eBxq_A=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCcefcZRL2oaA_uBNeo5UOWg",
    channelTitle: "Y Combinator",
    channelDescription: "Startup e innovazione",
    channelThumbnail: "https://yt3.googleusercontent.com/3gGJ0x8qWLGDq1F6T5n0sQ5z0k5D5R5JBc5L5k5x5J5n5d5k5l5L5D5R5JBc5L5k5x5J5n5d5k5=s176-c-k-c0x00ffffff-no-rj",
  },
];

const PREMIUM_CHANNELS = [
  {
    channelId: "UC7_YxT-KIDQl7z3Gk3bH4xw",
    channelTitle: "Lex Fridman",
    channelDescription: "Podcast e intelligenza artificiale",
    channelThumbnail: "https://yt3.googleusercontent.com/ytc/AIdro_n0a9Lz2dLx3hBz3G8k4H5jK6L7m8N9o0pQ1rS2tU3vW4xY5zA6B7C8D9=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCsBjURrPoezykLs9EqgamOA",
    channelTitle: "Fireship",
    channelDescription: "Programmazione e tech",
    channelThumbnail: "https://yt3.googleusercontent.com/ytc/AIdro_n0a9Lz2dLx3hBz3G8k4H5jK6L7m8N9o0pQ1rS2tU3vW4xY5zA6B7C8D9=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UC8butISFwT-Wl7EV0hUK0BQ",
    channelTitle: "freeCodeCamp",
    channelDescription: "Imparare a programmare",
    channelThumbnail: "https://yt3.googleusercontent.com/ytc/AIdro_n0a9Lz2dLx3hBz3G8k4H5jK6L7m8N9o0pQ1rS2tU3vW4xY5zA6B7C8D9=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCvqRdlKsE5Q8mf8kxA1Q7wA",
    channelTitle: "Veritasium",
    channelDescription: "Scienza e curiosità",
    channelThumbnail: "https://yt3.googleusercontent.com/ytc/AIdro_n0a9Lz2dLx3hBz3G8k4H5jK6L7m8N9o0pQ1rS2tU3vW4xY5zA6B7C8D9=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCJ0-OtVpF0wOKEqT2Z1Zt_A",
    channelTitle: "Jeff Su",
    channelDescription: "Produttività e carriera",
    channelThumbnail: "https://yt3.googleusercontent.com/ytc/AIdro_n0a9Lz2dLx3hBz3G8k4H5jK6L7m8N9o0pQ1rS2tU3vW4xY5zA6B7C8D9=s176-c-k-c0x00ffffff-no-rj",
  },
];

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const isAuthenticated = !!(authHeader?.startsWith("Bearer "));

  const allChannels = isAuthenticated ? [...DEMO_CHANNELS, ...PREMIUM_CHANNELS] : DEMO_CHANNELS;

  try {
    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(allChannels);
    }

    const ids = allChannels.map((ch) => ch.channelId).join(",");
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${ids}&key=${YOUTUBE_API_KEY}`
    );
    const data = await res.json();

    const channels = (data.items || []).map((item: any) => ({
      channelId: item.id,
      channelTitle: item.snippet.title,
      channelDescription: item.snippet.description,
      channelThumbnail:
        item.snippet.thumbnails?.high?.url ||
        item.snippet.thumbnails?.default?.url ||
        null,
    }));

    return NextResponse.json(channels);
  } catch (error) {
    return NextResponse.json(allChannels);
  }
}
