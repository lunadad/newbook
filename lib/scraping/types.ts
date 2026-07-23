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
}
