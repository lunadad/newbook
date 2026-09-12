import { createHash } from "node:crypto";
import { load } from "cheerio";
import type { LiteratureNewsItem } from "@/lib/ingest/schema";
import { SCRAPER_USER_AGENT } from "./userAgent";
import { areLikelySameLiteratureNews, dedupeLiteratureNews } from "./literatureNewsDedupe";

export const NEWS_PUBLISHERS = {
  general: [
    "경향신문",
    "국민일보",
    "동아일보",
    "문화일보",
    "서울신문",
    "세계일보",
    "조선일보",
    "중앙일보",
    "한겨레",
    "한국일보",
  ],
  economy: [
    "매일경제",
    "머니투데이",
    "서울경제",
    "아시아경제",
    "이데일리",
    "파이낸셜뉴스",
    "한국경제",
    "헤럴드경제",
  ],
} as const;

const PUBLISHER_TYPE = new Map<string, "general" | "economy">([
  ...NEWS_PUBLISHERS.general.map((name) => [name, "general"] as const),
  ...NEWS_PUBLISHERS.economy.map((name) => [name, "economy"] as const),
]);

const LITERATURE_TERMS = [
  "문학",
  "소설가",
  "소설집",
  "장편소설",
  "단편소설",
  "시인",
  "시집",
  "문학상",
  "신간",
  "출판",
  "번역가",
  "서점",
];
const FALSE_POSITIVES = ["문학경기장", "입소설", "연재소설", "전문학"];
const GOOGLE_NEWS_BASE = "https://news.google.com";
const SEARCH_QUERY = "(문학 OR 소설가 OR 시인 OR 시집 OR 문학상 OR 출판 OR 신간 OR 번역가 OR 서점 OR 도서) when:1d";

export const LITERATURE_NEWS_SEARCH_URL = `${GOOGLE_NEWS_BASE}/search?q=${encodeURIComponent(SEARCH_QUERY)}&hl=ko&gl=KR&ceid=KR:ko`;
export const LITERATURE_NEWS_RSS_URL = `${GOOGLE_NEWS_BASE}/rss/search?q=${encodeURIComponent(SEARCH_QUERY)}&hl=ko&gl=KR&ceid=KR:ko`;

function isLiteratureTitle(title: string): boolean {
  return LITERATURE_TERMS.some((term) => title.includes(term))
    && !FALSE_POSITIVES.some((term) => title.includes(term));
}

function findUrl(value: unknown): string | null {
  if (typeof value === "string" && /^https?:\/\//.test(value)) return value;
  if (!Array.isArray(value)) return null;
  for (let index = value.length - 1; index >= 0; index -= 1) {
    const found = findUrl(value[index]);
    if (found) return found;
  }
  return null;
}

function originalArticleUrl(jslog: string | undefined): string | null {
  const encoded = jslog?.match(/(?:^|;\s*)5:([A-Za-z0-9+/=]+)(?:;|$)/)?.[1];
  if (!encoded) return null;
  try {
    return findUrl(JSON.parse(Buffer.from(encoded, "base64").toString("utf8")));
  } catch {
    return null;
  }
}

function externalIdOf(cardId: string | undefined, articleUrl: string): string {
  const googleId = cardId?.split(";")[1];
  return googleId || createHash("sha256").update(articleUrl).digest("hex").slice(0, 40);
}

export function parseLiteratureNews(html: string): LiteratureNewsItem[] {
  const $ = load(html);
  const items: LiteratureNewsItem[] = [];
  const seen = new Set<string>();

  $('img[src*="/api/attachments/"]').each((_, image) => {
    const card = $(image).closest("c-wiz");
    const titleLink = card.find('a[data-n-tid="29"]').first();
    const publisher = card.find('[data-n-tid="9"]').first().text().trim();
    const publisherType = PUBLISHER_TYPE.get(publisher);
    const title = titleLink.text().replace(/\s+/g, " ").trim();
    const publishedAt = card.find("time[datetime]").first().attr("datetime");
    const relativeLink = titleLink.attr("href");
    const srcset = $(image).attr("srcset");
    const thumbnailPath = srcset?.split(",").at(-1)?.trim().split(/\s+/)[0] ?? $(image).attr("src");

    if (!publisherType || !title || !publishedAt || !relativeLink || !isLiteratureTitle(title)) return;

    const googleUrl = new URL(relativeLink, GOOGLE_NEWS_BASE).toString();
    const articleUrl = originalArticleUrl(card.find("a[jslog]").first().attr("jslog")) ?? googleUrl;
    const externalId = externalIdOf(card.attr("jsdata"), articleUrl);
    if (seen.has(externalId) || items.some((item) => areLikelySameLiteratureNews(item.title, title))) return;
    seen.add(externalId);

    items.push({
      externalId,
      title,
      publisher,
      publisherType,
      articleUrl,
      thumbnailUrl: thumbnailPath ? new URL(thumbnailPath, GOOGLE_NEWS_BASE).toString() : undefined,
      publishedAt: new Date(publishedAt).toISOString(),
    });
  });

  return dedupeLiteratureNews(items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))).slice(0, 40);
}

/** Google News HTML 검색이 429를 반환할 때 사용하는 RSS 파서. */
export function parseLiteratureNewsRss(xml: string): LiteratureNewsItem[] {
  const $ = load(xml, { xmlMode: true });
  const items: LiteratureNewsItem[] = [];
  const seen = new Set<string>();

  $("item").each((_, element) => {
    const node = $(element);
    const publisher = node.find("source").first().text().trim();
    const publisherType = PUBLISHER_TYPE.get(publisher);
    const rawTitle = node.find("title").first().text().replace(/\s+/g, " ").trim();
    const title = rawTitle.replace(new RegExp(`\\s+-\\s+${publisher.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}$`), "").trim();
    const articleUrl = node.find("link").first().text().trim();
    const publishedAt = node.find("pubDate").first().text().trim();
    const externalId = node.find("guid").first().text().trim() || createHash("sha256").update(articleUrl).digest("hex").slice(0, 40);

    if (!publisherType || !title || !isLiteratureTitle(title) || !articleUrl || !publishedAt || seen.has(externalId)) return;
    const parsedDate = new Date(publishedAt);
    if (Number.isNaN(parsedDate.getTime())) return;
    if (items.some((item) => areLikelySameLiteratureNews(item.title, title))) return;

    seen.add(externalId);
    items.push({
      externalId,
      title,
      publisher,
      publisherType,
      articleUrl,
      publishedAt: parsedDate.toISOString(),
    });
  });

  return dedupeLiteratureNews(items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))).slice(0, 40);
}

export async function scrapeLiteratureNews(): Promise<LiteratureNewsItem[]> {
  const headers = { "User-Agent": SCRAPER_USER_AGENT, "Accept-Language": "ko-KR,ko;q=0.9" };
  const response = await fetch(LITERATURE_NEWS_SEARCH_URL, { headers, signal: AbortSignal.timeout(20_000) });
  if (response.ok) return parseLiteratureNews(await response.text());

  // Google News HTML 검색은 짧은 시간에 429가 발생한다. RSS는 같은 검색어를
  // 제공하면서 제한이 별도로 적용되므로 수집 중단 대신 RSS로 전환한다.
  const rssResponse = await fetch(LITERATURE_NEWS_RSS_URL, { headers, signal: AbortSignal.timeout(20_000) });
  if (!rssResponse.ok) {
    throw new Error(`문학 뉴스 검색 실패: HTML HTTP ${response.status}, RSS HTTP ${rssResponse.status}`);
  }
  return parseLiteratureNewsRss(await rssResponse.text());
}
