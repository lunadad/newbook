import type { NormalizedRankedItem, NormalizedTodayBookItem } from "@/lib/scraping/types";
import type { IngestItem } from "./schema";

// 표지 이미지는 Vercel Blob에 업로드하지 않고 벤더 CDN 원본 URL(coverSourceUrl)을 그대로
// 대시보드에서 핫링크한다. Blob은 무료 티어가 월 2000 오퍼레이션인데, 스크래핑마다 책마다
// head/put이 나가 하루 만에 한도를 초과했다. 핫링크는 Blob 오퍼레이션이 0이다.
// (next.config.ts의 images.unoptimized=true로 Vercel 이미지 최적화 한도도 쓰지 않는다.)

export function mapTodayBookItems(items: NormalizedTodayBookItem[]): IngestItem[] {
  return items.map((item) => ({
    isbn13: item.isbn13,
    title: item.title,
    author: item.author,
    publisher: item.publisher,
    coverSourceUrl: item.coverSourceUrl,
    slotNo: item.slotNo,
    comment: item.comment,
    periodLabel: item.periodLabel,
    sourceUrl: item.sourceUrl,
  }));
}

export function mapRankedItems(items: NormalizedRankedItem[]): IngestItem[] {
  return items.map((item) => ({
    isbn13: item.isbn13,
    title: item.title,
    author: item.author,
    publisher: item.publisher,
    price: item.price,
    coverSourceUrl: item.coverSourceUrl,
    rank: item.rank,
    categoryLabel: item.categoryLabel,
    sourceUrl: item.productUrl,
  }));
}
