import * as cheerio from "cheerio";
import { withKyoboPage } from "./kyoboPlaywright";
import type { NormalizedTodayBookItem } from "./types";

const SOURCE_URL = "https://store.kyobobook.co.kr/today-book/domestic";

export function parseKyoboTodayBookHtml(html: string): NormalizedTodayBookItem[] {
  const $ = cheerio.load(html);
  const items: NormalizedTodayBookItem[] = [];

  $("div.flex.flex-row.items-start.justify-start.gap-4").each((_, el) => {
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

    const periodLabel = node
      .find("span")
      .filter((__, s) => /^\d{4}\.\d{2}\.\d{2}$/.test($(s).text().trim()))
      .first()
      .text()
      .trim();

    const coverSourceUrl = node.find('img[src*="/pdt/"]').first().attr("src") || undefined;
    const isbn13 = coverSourceUrl?.match(/pdt\/(\d{13})\.jpg/)?.[1];

    const commentSpans = node.find("div.rounded-md.bg-gray-100 span.fz-12");
    const comment = commentSpans.length
      ? $(commentSpans[commentSpans.length - 1]).text().trim()
      : undefined;

    items.push({
      slotNo: items.length + 1,
      isbn13,
      title,
      author: author || undefined,
      publisher: publisher || undefined,
      comment,
      periodLabel: periodLabel || undefined,
      coverSourceUrl,
      sourceUrl: link,
    });
  });

  if (items.length === 0) {
    throw new Error("교보문고 오늘의 선택 파싱 결과 0건 — 선택자 확인 필요");
  }

  return items;
}

export async function scrapeKyoboTodayBook(): Promise<NormalizedTodayBookItem[]> {
  return withKyoboPage(SOURCE_URL, parseKyoboTodayBookHtml);
}
