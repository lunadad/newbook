import { load } from "cheerio";
import { SCRAPER_USER_AGENT } from "./userAgent";

/** 국내 언론사는 기사 대표 이미지를 이 메타 태그 중 하나로 노출한다(우선순위 순). */
const IMAGE_META_KEYS = [
  "og:image",
  "og:image:secure_url",
  "og:image:url",
  "twitter:image",
  "twitter:image:src",
];

export function parseArticleImageUrl(html: string, pageUrl: string): string | null {
  const $ = load(html);

  for (const key of IMAGE_META_KEYS) {
    const content = $(`meta[property="${key}"], meta[name="${key}"]`).first().attr("content")?.trim();
    if (!content) continue;

    try {
      // 일부 매체는 og:image에 상대 경로를 넣으므로 기사 URL 기준으로 절대화한다.
      const resolved = new URL(content, pageUrl);
      if (resolved.protocol === "https:" || resolved.protocol === "http:") return resolved.toString();
    } catch {
      continue;
    }
  }

  return null;
}

export async function fetchArticleImageUrl(articleUrl: string): Promise<string | null> {
  const response = await fetch(articleUrl, {
    headers: { "User-Agent": SCRAPER_USER_AGENT, "Accept-Language": "ko-KR,ko;q=0.9" },
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });
  // 삭제·이동된 기사(404/410)는 언론사 로고를 og:image로 돌려주므로 본문 이미지로 쓰지 않는다.
  if (!response.ok) return null;
  if (!(response.headers.get("content-type") ?? "").includes("html")) return null;

  return parseArticleImageUrl(await response.text(), response.url);
}
