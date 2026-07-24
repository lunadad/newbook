import * as cheerio from "cheerio";
import { withPlaywrightPage } from "./playwrightPage";
import type { NormalizedRankedItem } from "./types";

const SOURCE_URL = "https://www.amazon.com/Best-Sellers-Books/zgbs/books";
const MAX_ITEMS = 10;

/** ISBN-10 → ISBN-13 변환 (앞 9자리에 978 접두 후 체크디지트 재계산) */
function isbn10to13(isbn10: string): string | undefined {
  if (!/^\d{9}[\dX]$/.test(isbn10)) return undefined;
  const core = "978" + isbn10.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < core.length; i += 1) {
    sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return core + check;
}

/** "$14.98" → 1498 (센트 단위 정수. books.price는 원화 정수 컬럼을 재사용하며,
 * 화면에서는 벤더별로 통화 표시를 분기한다 — RankTable currency prop 참고) */
function parsePriceCents(text: string): number | undefined {
  const match = text.match(/\$([\d,]+\.?\d*)/);
  if (!match) return undefined;
  return Math.round(Number(match[1].replace(/,/g, "")) * 100);
}

export function parseAmazonBestsellerHtml(html: string): NormalizedRankedItem[] {
  const $ = cheerio.load(html);
  const items: NormalizedRankedItem[] = [];

  $("#gridItemRoot").each((_, el) => {
    if (items.length >= MAX_ITEMS) return;
    const node = $(el);

    const rankText = node.find(".zg-bdg-text").first().text().trim();
    const rank = Number(rankText.replace(/^#/, "")) || items.length + 1;

    const coverImg = node.find("img.p13n-product-image").first();
    const title = coverImg.attr("alt")?.trim();
    if (!title) return;

    const author = node.find(".a-row.a-size-small a.a-link-child").first().text().trim() || undefined;
    const priceText = node.find(".a-color-price").first().text().trim();
    const price = parsePriceCents(priceText);
    const coverSourceUrl = coverImg.attr("src") || undefined;

    const asin = node.find("[data-asin]").first().attr("data-asin");
    const isbn13 = asin ? isbn10to13(asin) : undefined;
    // 상세 링크에는 추적용 ref 파라미터가 붙어 있어 ASIN 기준 정규 URL로 정리
    const productUrl = asin ? `https://www.amazon.com/dp/${asin}` : undefined;

    items.push({
      rank,
      title,
      author,
      price,
      isbn13,
      coverSourceUrl,
      productUrl,
    });
  });

  items.sort((a, b) => a.rank - b.rank);
  const top = items.slice(0, MAX_ITEMS);

  if (top.length === 0) {
    throw new Error("아마존 베스트셀러 파싱 결과 0건 — 선택자 확인 필요");
  }

  return top;
}

export async function scrapeAmazonBestseller(): Promise<NormalizedRankedItem[]> {
  return withPlaywrightPage(SOURCE_URL, parseAmazonBestsellerHtml);
}
