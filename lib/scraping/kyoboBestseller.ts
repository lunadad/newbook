import * as cheerio from "cheerio";
import { fetchText } from "./httpClient";
import type { NormalizedRankedItem } from "./types";

const SOURCE_URL = "https://store.kyobobook.co.kr/bestseller/realtime?type=list";
const MAX_ITEMS = 10;

function parsePrice(text: string): number | undefined {
  const digits = text.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : undefined;
}

/**
 * 교보문고는 유틸리티(Tailwind류) 클래스만 노출해 의미 있는 클래스명이 없다.
 * `<li>` 반복 구조와 상품 상세 링크(prod_link)를 기준으로 항목을 식별하고,
 * 순위 배지 아이콘이 1위만 다른 마크업을 쓰는 것으로 확인되어(실측) DOM 등장 순서를 순위로 사용한다.
 */
export function parseKyoboBestsellerHtml(html: string): NormalizedRankedItem[] {
  const $ = cheerio.load(html);

  const seen = new Set<string>();
  const items: NormalizedRankedItem[] = [];

  $("li").each((_, el) => {
    if (items.length >= MAX_ITEMS) return;
    const node = $(el);
    const link = node.find('a.prod_link[href*="/detail/"]').first().attr("href");
    if (!link || seen.has(link)) return;

    const titleAnchor = node.find("a.prod_link.line-clamp-2").first();
    if (!titleAnchor.length) return;
    seen.add(link);

    const titleClone = titleAnchor.clone();
    titleClone.find("span").remove();
    const title = titleClone.text().trim();
    if (!title) return;

    const meta = node.find("div.line-clamp-2.flex.overflow-hidden").first();
    const metaClone = meta.clone();
    metaClone.find("span.date").remove();
    const [author, publisher] = metaClone
      .text()
      .trim()
      .replace(/\s*·\s*$/, "")
      .split("·")
      .map((s) => s.trim());

    const priceText = node
      .find("span")
      .filter((__, s) => $(s).attr("class") === "inline-block align-top fz-16")
      .first()
      .text();
    const price = parsePrice(priceText);

    const coverSourceUrl = node.find('img[src*="/pdt/"]').first().attr("src") || undefined;
    const isbnMatch = coverSourceUrl?.match(/pdt\/(\d{13})\.jpg/);

    items.push({
      rank: items.length + 1,
      title,
      author: author || undefined,
      publisher: publisher || undefined,
      price,
      isbn13: isbnMatch ? isbnMatch[1] : undefined,
      coverSourceUrl,
    });
  });

  if (items.length === 0) {
    throw new Error("교보문고 실시간 베스트셀러 파싱 결과 0건 — 선택자 확인 필요");
  }

  return items;
}

export async function scrapeKyoboBestseller(): Promise<NormalizedRankedItem[]> {
  const html = await fetchText(SOURCE_URL);
  return parseKyoboBestsellerHtml(html);
}
