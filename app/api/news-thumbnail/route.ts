import { isPublicHost } from "@/lib/net/publicHost";
import { SCRAPER_USER_AGENT } from "@/lib/scraping/userAgent";

export async function GET(request: Request) {
  const rawUrl = new URL(request.url).searchParams.get("url");
  if (!rawUrl) return new Response("missing_url", { status: 400 });

  let source: URL;
  try {
    source = new URL(rawUrl);
  } catch {
    return new Response("invalid_url", { status: 400 });
  }

  // 기사 대표 이미지는 언론사마다 다른 CDN에 있어 호스트를 고정할 수 없다.
  // 대신 https + 공인 IP + 이미지 응답이라는 조건으로 프록시 범위를 제한한다.
  if (source.protocol !== "https:" || !(await isPublicHost(source.hostname))) {
    return new Response("forbidden_url", { status: 403 });
  }

  const response = await fetch(source, {
    // 핫링크를 막는 언론사 CDN은 이미지와 같은 출처의 Referer를 요구한다.
    headers: { "User-Agent": SCRAPER_USER_AGENT, Referer: source.origin },
    signal: AbortSignal.timeout(10_000),
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !response.body || !contentType.startsWith("image/")) {
    return new Response("thumbnail_unavailable", { status: 502 });
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
