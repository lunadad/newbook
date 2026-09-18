import { SCRAPER_USER_AGENT } from "./userAgent";

const ARTICLE_ID_PATTERN = /^https:\/\/news\.google\.com\/(?:rss\/)?(?:articles|read)\/([^?#/]+)/;
const BATCH_EXECUTE_URL = "https://news.google.com/_/DotsSplashUi/data/batchexecute";
const REQUEST_HEADERS = { "User-Agent": SCRAPER_USER_AGENT, "Accept-Language": "ko-KR,ko;q=0.9" };

export function googleNewsArticleId(url: string): string | null {
  return url.match(ARTICLE_ID_PATTERN)?.[1] ?? null;
}

/**
 * 구글 뉴스 기사 링크는 원문 URL을 담지 않는 불투명 토큰이고, 인터스티셜 페이지는
 * 자바스크립트로만 원문을 여는 SPA다. 페이지에 심어진 서명(sg)·타임스탬프(ts)를 뽑아
 * batchexecute에 넘기면 구글이 원문 URL을 그대로 돌려준다.
 */
export function parseArticleSignature(html: string): { signature: string; timestamp: number } | null {
  const signature = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
  const timestamp = Number(html.match(/data-n-a-ts="(\d+)"/)?.[1]);
  if (!signature || !Number.isFinite(timestamp)) return null;
  return { signature, timestamp };
}

export function buildDecodeRequestBody(
  articleId: string,
  { signature, timestamp }: { signature: string; timestamp: number },
): URLSearchParams {
  const payload = JSON.stringify([
    "garturlreq",
    [
      ["X", "X", ["X", "X"], null, null, 1, 1, "US:en", null, 1, null, null, null, null, null, 0, 1],
      "X",
      "X",
      1,
      [1, 1, 1],
      1,
      1,
      null,
      0,
      0,
      null,
      0,
    ],
    articleId,
    timestamp,
    signature,
  ]);
  return new URLSearchParams({ "f.req": JSON.stringify([[["Fbv4je", payload, null, "generic"]]]) });
}

export function parseDecodedArticleUrl(responseText: string): string | null {
  const line = responseText.split("\n").find((candidate) => candidate.includes("garturlres"));
  if (!line) return null;

  try {
    for (const envelope of JSON.parse(line) as unknown[][]) {
      if (envelope[0] !== "wrb.fr" || typeof envelope[2] !== "string") continue;
      const url = (JSON.parse(envelope[2]) as unknown[])[1];
      if (typeof url === "string" && /^https?:\/\//.test(url)) return url;
    }
  } catch {
    return null;
  }
  return null;
}

/** 구글 뉴스 링크가 아니거나 해석에 실패하면 null을 반환한다(호출 측에서 원본 링크 유지). */
export async function resolveGoogleNewsArticleUrl(url: string): Promise<string | null> {
  const articleId = googleNewsArticleId(url);
  if (!articleId) return null;

  const page = await fetch(url, { headers: REQUEST_HEADERS, signal: AbortSignal.timeout(10_000) });
  if (!page.ok) return null;

  const signature = parseArticleSignature(await page.text());
  if (!signature) return null;

  const response = await fetch(BATCH_EXECUTE_URL, {
    method: "POST",
    headers: { ...REQUEST_HEADERS, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: buildDecodeRequestBody(articleId, signature),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;

  return parseDecodedArticleUrl(await response.text());
}
