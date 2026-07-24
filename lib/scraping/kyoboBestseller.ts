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
 * 실제 순위 목록은 `<ol class="grid ...">` 두 개(1~10위/11~20위)로 나뉘어 있으므로
 * 반드시 그 안의 `<li>`만 순회해야 한다 — 페이지 전체의 `<li>`(약 100개 이상, 배너/추천
 * 위젯 포함)를 스캔하면 무관한 상품이 섞여 순위가 어긋난다(실측으로 확인한 버그).
 * 순위 배지는 1위만 SVG(`<desc>교보문고 Best N</desc>`), 2위 이하는 일반 텍스트 span이라
 * 두 경우를 모두 읽어 실제 순위를 사용한다(DOM 등장 순서에 의존하지 않음).
 *
 * 교보문고 실시간 베스트는 카테고리 필터가 없는 **종합** 순위라 음반·굿즈가 섞인다.
 * 그런 항목은 도서 상세(product.kyobobook.co.kr/detail/)가 아니라 hottracks 링크라
 * 여기서 걸러지는데, 그러면 순위에 구멍이 생긴다(예: 4위가 LP면 1,2,3,5,...).
 * 이때 상위 N개를 "앞에서 N개 자르기"로 뽑으면 11위가 딸려 들어와
 * `rank BETWEEN 1 AND 10` 제약을 위반하므로, 반드시 **실제 순위값으로 필터**해야 한다.
 * 도서가 아닌 순위는 비워 두는 편이 순위를 임의로 당겨 매기는 것보다 정확하다.
 */
export function parseKyoboBestsellerHtml(html: string): NormalizedRankedItem[] {
  const $ = cheerio.load(html);

  const seen = new Set<string>();
  const items: NormalizedRankedItem[] = [];

  $("ol.grid > li").each((domIndex, el) => {
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

    const bestDesc = node
      .find("desc")
      .filter((__, d) => /Best\s*\d+/.test($(d).text()))
      .first()
      .text();
    const bestMatch = bestDesc.match(/Best\s*(\d+)/);
    const rankSpanText = node
      .find("span")
      .filter(
        (__, s) =>
          $(s).attr("class") ===
          "fz-12 flex min-h-[22px] w-fit min-w-[22px] items-center justify-center rounded bg-gray-700 px-0.5 font-bold text-white",
      )
      .first()
      .text()
      .trim();
    // 배지를 못 읽으면 DOM 위치(1-based)를 쓴다 — items.length는 걸러진 항목을 빼고 세므로
    // 실제 순위와 어긋난다(음반 등이 걸러졌을 때 순위가 당겨짐).
    const rank = bestMatch ? Number(bestMatch[1]) : Number(rankSpanText) || domIndex + 1;

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
      rank,
      title,
      author: author || undefined,
      publisher: publisher || undefined,
      price,
      isbn13: isbnMatch ? isbnMatch[1] : undefined,
      coverSourceUrl,
      productUrl: link,
    });
  });

  // 앞에서 N개 자르기(slice)가 아니라 실제 순위값으로 거른다 — 위 주석 참고.
  const top = items.filter((i) => i.rank >= 1 && i.rank <= MAX_ITEMS).sort((a, b) => a.rank - b.rank);

  if (top.length === 0) {
    throw new Error("교보문고 실시간 베스트셀러 파싱 결과 0건 — 선택자 확인 필요");
  }

  return top;
}

export async function scrapeKyoboBestseller(): Promise<NormalizedRankedItem[]> {
  const html = await fetchText(SOURCE_URL);
  return parseKyoboBestsellerHtml(html);
}
