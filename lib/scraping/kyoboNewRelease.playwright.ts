import * as cheerio from "cheerio";
import { withKyoboPage } from "./kyoboPlaywright";
import type { NormalizedRankedItem } from "./types";

const SOURCE_URL = "https://store.kyobobook.co.kr/new/latest/domestic/01";
const MAX_ITEMS = 30;

function parsePrice(text: string): number | undefined {
  const digits = text.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : undefined;
}

export function parseKyoboNewReleaseHtml(html: string): NormalizedRankedItem[] {
  const $ = cheerio.load(html);
  const items: NormalizedRankedItem[] = [];

  $("div.flex.flex-row.items-start.justify-start.gap-4").each((_, el) => {
    if (items.length >= MAX_ITEMS) return;
    const node = $(el);
    const link = node.find('a[href*="product.kyobobook.co.kr/detail"]').first().attr("href");
    if (!link) return;

    const title = node.find("p.line-clamp-2.fz-16.font-medium").first().text().trim();
    if (!title) return;

    const authorPub = node
      .find("span.line-clamp-1.font-medium.text-gray-800.fz-14")
      .first()
      .text()
      .trim();
    const [author, publisher] = authorPub.split("·").map((s) => s.trim());

    const priceText = node.find("p.place-items-center.fz-16").first().text().trim();
    const coverSourceUrl = node.find('img[src*="/pdt/"]').first().attr("src") || undefined;
    const isbn13 = coverSourceUrl?.match(/pdt\/(\d{13})\.jpg/)?.[1];

    items.push({
      rank: items.length + 1,
      title,
      author: author || undefined,
      publisher: publisher || undefined,
      price: parsePrice(priceText),
      isbn13,
      coverSourceUrl,
    });
  });

  if (items.length === 0) {
    throw new Error("교보문고 문학 신상품 파싱 결과 0건 — 선택자 확인 필요");
  }

  return items;
}

export async function scrapeKyoboNewRelease(): Promise<NormalizedRankedItem[]> {
  return withKyoboPage(SOURCE_URL, parseKyoboNewReleaseHtml);
}
