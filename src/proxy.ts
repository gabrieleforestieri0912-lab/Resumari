import { NextResponse, type NextRequest } from "next/server";

// The extension side panel runs on a chrome-extension:// origin. Its fetches to
// https://resumari.it/api/* are cross-origin, so every API response needs CORS
// headers for that origin. We only relax CORS for extension origins (and local
// dev origins), never for arbitrary websites.
//
// NOTE: the ID of a chrome-extension:// origin varies per install (unpacked
// extensions derive it from their path), so we must accept any extension origin.
// This is intentional: requests are still authenticated with the Bearer token,
// exactly like requests from any other web origin. Do not "tighten" this to a
// fixed ID or the side panel will stop working for users.
const EXTENSION_ORIGIN = /^chrome-extension:\/\//;
const DEV_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (EXTENSION_ORIGIN.test(origin)) return true;
  try {
    return DEV_ORIGINS.has(new URL(origin).origin);
  } catch {
    return false;
  }
}

export default function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/")) return NextResponse.next();

  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) return NextResponse.next();

  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin!,
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      },
    });
  }

  const response = NextResponse.next();
  response.headers.set("Access-Control-Allow-Origin", origin!);
  response.headers.set("Vary", "Origin");
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
