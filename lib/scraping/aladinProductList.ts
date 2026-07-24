import * as cheerio from "cheerio";
import { fetchText } from "./httpClient";
import type { NormalizedRankedItem } from "./types";

/** 국내도서 > 소설/시/희곡 카테고리 ID (사이트 내비게이션에서 실측 확인, design.md §0-4 후속 확정) */
export const ALADIN_LITERATURE_CID = 1;

function parsePrice(text: string): number | undefined {
  const digits = text.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : undefined;
}

/**
 * 알라딘 OpenAPI 장애/한도초과 시 사용하는 스크래핑 폴백.
 * wnew.aspx(신상품)·wbest.aspx(베스트셀러) 모두 `.ss_book_box` 반복 구조를 공유한다(실측 확인).
 */
export function parseAladinProductListHtml(
  html: string,
  maxItems: number,
): NormalizedRankedItem[] {
  const $ = cheerio.load(html);

  const items: NormalizedRankedItem[] = [];

  $(".ss_book_box").each((i, el) => {
    if (items.length >= maxItems) return;
    const node = $(el);
    const title = node.find("a.bo3").first().text().trim();
    if (!title) return;

    const infoLine = node
      .find(".ss_book_list li")
      .filter((__, li) => /\(지은이\)|\(엮은이\)|\(옮긴이\)/.test($(li).text()))
      .first()
      .text()
      .trim();
    const [authorPart, publisherPart] = infoLine.split("|").map((s) => s.trim());
    const author =
      authorPart?.replace(/\(지은이\)|\(엮은이\)|\(옮긴이\)/g, "").replace(/,\s*$/, "").trim() ||
      undefined;
    const publisher = publisherPart || undefined;

    const priceText = node.find(".ss_p2").first().text().trim();
    const price = parsePrice(priceText);

    const coverSourceUrl = node.find(".cover_area_other img").first().attr("src") || undefined;

    const href = node.find("a.bo3").first().attr("href");
    const productUrl = href
      ? href.startsWith("http")
        ? href
        : `https://www.aladin.co.kr${href}`
      : undefined;

    items.push({
      rank: items.length + 1,
      title,
      author,
      publisher,
      price,
      coverSourceUrl,
      productUrl,
    });
  });

  if (items.length === 0) {
    throw new Error(`알라딘 폴백 스크래핑 결과 0건 — 선택자 확인 필요`);
  }

  return items;
}

export async function scrapeAladinProductListPage(
  url: string,
  maxItems: number,
): Promise<NormalizedRankedItem[]> {
  const html = await fetchText(url);
  return parseAladinProductListHtml(html, maxItems);
}

export const scrapeAladinNewFallback = () =>
  scrapeAladinProductListPage(
    // "주목할만한 새 책"(NewType=SpecialNew) — 알라딘 사이트에서 "새로나온책 > 소설/시/희곡"을
    // 눌렀을 때 나오는 정규 화면. 기본 정렬이 등록일순(최신 등록 우선, 출간일 12주 이내)이라
    // yes24의 등록일순과 일관된다. (이전 BranchType=7 URL은 사이트 화면과 다른 목록을 반환했음)
    `https://www.aladin.co.kr/shop/common/wnew.aspx?NewType=SpecialNew&BranchType=1&CID=${ALADIN_LITERATURE_CID}`,
    30,
  );

export const scrapeAladinBestsellerFallback = () =>
  scrapeAladinProductListPage(
    // BestType=NowBest — "지금 베스트"(실시간). 기본값(주간 베스트)은 실시간이 아니므로 반드시 명시.
    // yes24/교보문고 "실시간 베스트셀러"와 성격이 일치한다.
    `https://www.aladin.co.kr/shop/common/wbest.aspx?BestType=NowBest&BranchType=1&CID=${ALADIN_LITERATURE_CID}`,
    10,
  );
