export type Vendor = "yes24" | "kyobo" | "aladin";

export interface NormalizedTodayBookItem {
  slotNo: number;
  isbn13?: string;
  title: string;
  author?: string;
  publisher?: string;
  comment?: string;
  periodLabel?: string;
  coverSourceUrl?: string;
  sourceUrl: string;
}

export interface NormalizedRankedItem {
  rank: number;
  title: string;
  author?: string;
  publisher?: string;
  isbn13?: string;
  price?: number;
  coverSourceUrl?: string;
  categoryLabel?: string;
  /** 해당 벤더의 상품 상세 페이지 URL(클릭 시 이동) */
  productUrl?: string;
}
