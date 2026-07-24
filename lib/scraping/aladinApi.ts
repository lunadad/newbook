import type { NormalizedRankedItem } from "./types";
import { ALADIN_LITERATURE_CID, scrapeAladinNewFallback, scrapeAladinBestsellerFallback } from "./aladinProductList";

const API_BASE = "https://www.aladin.co.kr/ttb/api/ItemList.aspx";

// ItemNewSpecial = "주목할만한 새 책"(사이트의 새로나온책 화면과 동일). ItemNewAll(전체 신간)은
// 화면과 목록이 달라 부정확했음. 알라딘 OpenAPI에는 "실시간 베스트셀러"가 없어(주간만 제공)
// Bestseller QueryType은 신상품 폴백 확인용으로만 남기지 않고 아예 쓰지 않는다(아래 참조).
type AladinQueryType = "ItemNewSpecial";

interface AladinApiItem {
  title: string;
  author?: string;
  publisher?: string;
  priceStandard?: number;
  isbn13?: string;
  cover?: string;
}

interface AladinApiResponse {
  errorCode?: number;
  errorMessage?: string;
  item?: AladinApiItem[];
}

function buildUrl(queryType: AladinQueryType, maxResults: number): string {
  const ttbKey = process.env.ALADIN_TTB_KEY;
  if (!ttbKey) {
    throw new Error("ALADIN_TTB_KEY 환경변수가 설정되지 않았습니다");
  }
  const params = new URLSearchParams({
    ttbkey: ttbKey,
    QueryType: queryType,
    SearchTarget: "Book",
    CategoryId: String(ALADIN_LITERATURE_CID),
    MaxResults: String(maxResults),
    start: "1",
    output: "JS",
    Version: "20131101",
    Cover: "Big",
  });
  return `${API_BASE}?${params.toString()}`;
}

async function callAladinApi(
  queryType: AladinQueryType,
  maxResults: number,
): Promise<NormalizedRankedItem[]> {
  const url = buildUrl(queryType, maxResults);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`알라딘 OpenAPI 요청 실패 (${res.status})`);
  }
  const data = (await res.json()) as AladinApiResponse;
  if (data.errorCode) {
    throw new Error(`알라딘 OpenAPI 에러 ${data.errorCode}: ${data.errorMessage}`);
  }
  const items = data.item ?? [];
  return items.map((item, i) => ({
    rank: i + 1,
    title: item.title,
    author: item.author,
    publisher: item.publisher,
    price: item.priceStandard,
    isbn13: item.isbn13,
    coverSourceUrl: item.cover,
  }));
}

interface AladinFetchOptions {
  /** true(기본): API를 우선 시도하고 실패 시 스크래핑으로 폴백. false: 스크래핑만 사용 */
  preferApi?: boolean;
}

export async function fetchAladinNewReleases(
  options: AladinFetchOptions = {},
): Promise<NormalizedRankedItem[]> {
  const { preferApi = true } = options;
  if (preferApi) {
    try {
      return await callAladinApi("ItemNewSpecial", 30);
    } catch (err) {
      console.error("알라딘 OpenAPI(신상품) 실패, 스크래핑 폴백 사용:", err);
    }
  }
  return scrapeAladinNewFallback();
}

export async function fetchAladinBestsellers(): Promise<NormalizedRankedItem[]> {
  // 알라딘 OpenAPI는 주간 베스트만 제공하고 "실시간(지금) 베스트"가 없다.
  // 실시간 순위를 얻으려면 NowBest 화면 스크래핑이 유일한 방법이므로 항상 폴백을 사용한다.
  return scrapeAladinBestsellerFallback();
}
