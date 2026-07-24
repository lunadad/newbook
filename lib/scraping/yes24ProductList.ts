import * as cheerio from "cheerio";
import { fetchText } from "./httpClient";
import type { NormalizedRankedItem } from "./types";

function parsePrice(text: string): number | undefined {
  const digits = text.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : undefined;
}

/**
 * 예스24 카테고리형 목록 페이지(신상품/실시간베스트셀러) 공용 파서.
 * 두 페이지 모두 `.itemUnit` 반복 구조를 공유한다(실측 확인).
 */
export function parseYes24ProductListHtml(
  html: string,
  maxItems: number,
): NormalizedRankedItem[] {
  const $ = cheerio.load(html);

  const items: NormalizedRankedItem[] = [];

  $(".itemUnit").each((i, el) => {
    if (items.length >= maxItems) return;
    const node = $(el);
    const title = node.find(".gd_name").first().text().trim();
    if (!title) return;

    const rankText = node.find(".img_upper .rank").first().text().trim();
    const rank = rankText ? Number(rankText) : items.length + 1;

    const author = node.find(".info_auth").first().text().trim().replace(/\s+/g, " ") || undefined;
    const publisher = node.find(".info_pub").first().text().trim() || undefined;
    const priceText = node.find(".info_price .txt_num:not(.dash) .yes_b").first().text().trim();
    const price = parsePrice(priceText);
    const coverSourceUrl = node.find("img").first().attr("data-original") || undefined;

    const href = node.find(".gd_name").first().attr("href");
    const productUrl = href
      ? href.startsWith("http")
        ? href
        : `https://www.yes24.com${href}`
      : undefined;

    items.push({
      rank,
      title,
      author,
      publisher,
      price,
      coverSourceUrl,
      productUrl,
    });
  });

  if (items.length === 0) {
    throw new Error(`예스24 상품 목록 파싱 결과 0건 — 선택자 확인 필요`);
  }

  return items;
}

export async function scrapeYes24ProductList(
  url: string,
  maxItems: number,
): Promise<NormalizedRankedItem[]> {
  const html = await fetchText(url);
  return parseYes24ProductListHtml(html, maxItems);
}

export const scrapeYes24NewProduct = () =>
  scrapeYes24ProductList(
    // sortTp=01: 등록일순(최신순). 실측 결과 기본값과 동일하나, 사이트 기본값 변경에
    // 대비해 명시적으로 지정한다(사용자 요청: 최신순 정렬 보장).
    "https://www.yes24.com/product/category/newproduct?categoryNumber=001001046&sortTp=01",
    30,
  );

export const scrapeYes24Bestseller = () =>
  scrapeYes24ProductList(
    "https://www.yes24.com/product/category/realtimebestseller?categoryNumber=001001046",
    10,
  );
