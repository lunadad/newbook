import type { NormalizedRankedItem } from "./types";
import { ALADIN_LITERATURE_CID, scrapeAladinNewFallback, scrapeAladinBestsellerFallback } from "./aladinProductList";

const API_BASE = "https://www.aladin.co.kr/ttb/api/ItemList.aspx";

type AladinQueryType = "ItemNewAll" | "Bestseller";

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
      return await callAladinApi("ItemNewAll", 30);
    } catch (err) {
      console.error("알라딘 OpenAPI(신상품) 실패, 스크래핑 폴백 사용:", err);
    }
  }
  return scrapeAladinNewFallback();
}

export async function fetchAladinBestsellers(
  options: AladinFetchOptions = {},
): Promise<NormalizedRankedItem[]> {
  const { preferApi = true } = options;
  if (preferApi) {
    try {
      return await callAladinApi("Bestseller", 10);
    } catch (err) {
      console.error("알라딘 OpenAPI(베스트셀러) 실패, 스크래핑 폴백 사용:", err);
    }
  }
  return scrapeAladinBestsellerFallback();
}
