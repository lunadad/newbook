import { SCRAPER_USER_AGENT } from "@/lib/scraping/userAgent";

const ALLOWED_HOST = "news.google.com";
const ALLOWED_PATH_PREFIX = "/api/attachments/";

export async function GET(request: Request) {
  const rawUrl = new URL(request.url).searchParams.get("url");
  if (!rawUrl) return new Response("missing_url", { status: 400 });

  let source: URL;
  try {
    source = new URL(rawUrl);
  } catch {
    return new Response("invalid_url", { status: 400 });
  }

  if (source.protocol !== "https:" || source.hostname !== ALLOWED_HOST || !source.pathname.startsWith(ALLOWED_PATH_PREFIX)) {
    return new Response("forbidden_url", { status: 403 });
  }

  const response = await fetch(source, {
    headers: { "User-Agent": SCRAPER_USER_AGENT, Referer: "https://news.google.com/" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok || !response.body) return new Response("thumbnail_unavailable", { status: 502 });

  return new Response(response.body, {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
