import * as cheerio from "cheerio";
import { fetchText } from "./httpClient";
import type { NormalizedRankedItem } from "./types";

function parsePrice(text: string): number | undefined {
  const digits = text.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : undefined;
}

/** 신상품 페이지의 실제 목록. 상단 추천 히어로(`.newGoodsSubBox`)는 이 밖에 있다. */
export const YES24_NEW_LIST_SELECTOR = "#yesNewList";
/** 실시간 베스트셀러 페이지의 순위 목록. */
export const YES24_BEST_LIST_SELECTOR = "#yesBestList";

/**
 * 예스24 카테고리형 목록 페이지(신상품/실시간베스트셀러) 공용 파서.
 * 두 페이지 모두 `.itemUnit` 반복 구조를 공유한다(실측 확인).
 *
 * `listSelector`로 목록 컨테이너를 반드시 지정한다 — `.itemUnit`만 훑으면 신상품 페이지
 * 상단 추천 히어로 4권까지 섞여 들어온다. 히어로는 편집 추천이라 등록일순도 아니고,
 * 목록에 있는 책을 다시 노출해 중복까지 만든다(실측: 전체 28 = 히어로 4 + 목록 24).
 */
export function parseYes24ProductListHtml(
  html: string,
  maxItems: number,
  listSelector: string,
): NormalizedRankedItem[] {
  const $ = cheerio.load(html);

  const items: NormalizedRankedItem[] = [];

  $(listSelector).find(".itemUnit").each((i, el) => {
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
    throw new Error(`예스24 상품 목록 파싱 결과 0건 — 선택자 확인 필요 (${listSelector})`);
  }

  return items;
}

export async function scrapeYes24ProductList(
  url: string,
  maxItems: number,
  listSelector: string,
): Promise<NormalizedRankedItem[]> {
  const html = await fetchText(url);
  return parseYes24ProductListHtml(html, maxItems, listSelector);
}

export const scrapeYes24NewProduct = () =>
  scrapeYes24ProductList(
    // sortTp=01: 등록일순(최신순). 실측 결과 기본값과 동일하나, 사이트 기본값 변경에
    // 대비해 명시적으로 지정한다(사용자 요청: 최신순 정렬 보장).
    "https://www.yes24.com/product/category/newproduct?categoryNumber=001001046&sortTp=01",
    30,
    YES24_NEW_LIST_SELECTOR,
  );

export const scrapeYes24Bestseller = () =>
  scrapeYes24ProductList(
    "https://www.yes24.com/product/category/realtimebestseller?categoryNumber=001001046",
    10,
    YES24_BEST_LIST_SELECTOR,
  );
