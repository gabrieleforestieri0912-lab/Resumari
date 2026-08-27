import { NextResponse } from "next/server";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";

const DEMO_CHANNELS = [
  {
    channelId: "UC2D2CMWXMOVWx7giW1n3LIg",
    channelTitle: "Andrew Huberman",
    channelDescription: "Neuroscienze e salute",
    channelThumbnail: "https://yt3.googleusercontent.com/Y8lhyl8aHY42phxwoAwUqwLGDp-z8nmtj3Z7_JB-Oh4yIZ1OFYb-MlJRuz_oygqsYQU-VgGqiOM=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCWsslCoN3b_wBaFVWK_ye_A",
    channelTitle: "Hamza Ahmed",
    channelDescription: "Self improvement",
    channelThumbnail: "https://yt3.googleusercontent.com/8Tt9b6dIMjnzYEpH68lsjJwCgrl2RcFoolkY_MMgh8ZR_9GbdEnWBQnmkTV7UaRS88V4LiTd=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCX3R4xuKXIhoaxj44HGmhlw",
    channelTitle: "Dan Zakaria",
    channelDescription: "Crescita personale e business",
    channelThumbnail: "https://yt3.googleusercontent.com/Lj-jgk-WUNu9nsUWalpnjKzCtbmV59tEPrRzvEznyx0Udiy4-f90UM6rlF3ZyOfger2Hxj1JrPc=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCcefcZRL2oaA_uBNeo5UOWg",
    channelTitle: "Y Combinator",
    channelDescription: "Startup e innovazione",
    channelThumbnail: "https://yt3.googleusercontent.com/dGyATx87Fp_s1nZvnupUFSnMqbAPZ6nqRby9Esk1m6YE41iBq-9Z8iGoIgHTCT9SiDBUpP2V=s176-c-k-c0x00ffffff-no-rj",
  },
];

const PREMIUM_CHANNELS = [
  {
    channelId: "UC7_YxT-KIDQl7z3Gk3bH4xw",
    channelTitle: "Lex Fridman",
    channelDescription: "Podcast e intelligenza artificiale",
    channelThumbnail: "https://yt3.googleusercontent.com/ytc/AIdro_ljfMy9kUR1PH9VRf-XsTsPqFMgORC_zodOQVEAm4hx36lC=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCsBjURrPoezykLs9EqgamOA",
    channelTitle: "Fireship",
    channelDescription: "Programmazione e tech",
    channelThumbnail: "https://yt3.googleusercontent.com/3fPNbkf_xPyCleq77ZhcxyeorY97NtMHVNUbaAON_RBDH9ydL4hJkjxC8x_4mpuopkB8oI7Ct6Y=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UC8butISFwT-Wl7EV0hUK0BQ",
    channelTitle: "freeCodeCamp",
    channelDescription: "Imparare a programmare",
    channelThumbnail: "https://yt3.googleusercontent.com/ytc/AIdro_lGRc-05M2OoE1ejQdxeFhyP7OkJg9h4Y-7CK_5je3QqFI=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCvqRdlKsE5Q8mf8kxA1Q7wA",
    channelTitle: "Veritasium",
    channelDescription: "Scienza e curiosità",
    channelThumbnail: "https://yt3.googleusercontent.com/7vCbvtCqtjQ3YLgsJt7Y952MQV1sBvhllSCSxHP8_sVZdcPCBrITfhkN2RdyCuwPnsByq-1GoA=s176-c-k-c0x00ffffff-no-rj",
  },
  {
    channelId: "UCJ0-OtVpF0wOKEqT2Z1Zt_A",
    channelTitle: "Jeff Su",
    channelDescription: "Produttività e carriera",
    channelThumbnail: "https://yt3.googleusercontent.com/fHDMaIjQYS0XTz17AL-iIxdfyrGJfLliAJTQmJE931P1OareLsLIvFeJDcDtI3QpkD9HLnvI7Gw=s176-c-k-c0x00ffffff-no-rj",
  },
];

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const isAuthenticated = !!(authHeader?.startsWith("Bearer "));

  // Hardcoded list acts as the canonical fallback: it always carries a real
  // thumbnail URL, so the demo never shows an empty avatar.
  const fallback = isAuthenticated ? [...DEMO_CHANNELS, ...PREMIUM_CHANNELS] : DEMO_CHANNELS;

  if (!YOUTUBE_API_KEY) {
    return NextResponse.json(fallback);
  }

  try {
    const ids = fallback.map((ch) => ch.channelId).join(",");
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${ids}&key=${YOUTUBE_API_KEY}`
    );

    // The API can return a non-2xx (quota exceeded, key restricted, …) without
    // throwing; in that case `items` is missing and we must not return `[]`.
    if (!res.ok) {
      return NextResponse.json(fallback);
    }

    const data = await res.json();
    const items = data.items || [];
    if (items.length === 0) {
      return NextResponse.json(fallback);
    }

    const byId = new Map(fallback.map((ch) => [ch.channelId, ch]));
    const channels = items.map((item: any) => ({
      channelId: item.id,
      channelTitle: item.snippet?.title || byId.get(item.id)?.channelTitle,
      channelDescription: item.snippet?.description || byId.get(item.id)?.channelDescription,
      channelThumbnail:
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.default?.url ||
        byId.get(item.id)?.channelThumbnail ||
        null,
    }));

    // Fill any channel the API did not return (e.g. terminated accounts) so the
    // sidebar list stays complete.
    const returnedIds = new Set(channels.map((c: any) => c.channelId));
    fallback.forEach((ch) => {
      if (!returnedIds.has(ch.channelId)) channels.push(ch);
    });

    return NextResponse.json(channels);
  } catch (error) {
    return NextResponse.json(fallback);
  }
}
