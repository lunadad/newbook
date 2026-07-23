import { ensureCoverUploaded } from "@/lib/images/uploadCover";
import type { NormalizedRankedItem, NormalizedTodayBookItem } from "@/lib/scraping/types";
import type { IngestItem } from "./schema";

export async function mapTodayBookItems(
  items: NormalizedTodayBookItem[],
): Promise<IngestItem[]> {
  return Promise.all(
    items.map(async (item) => ({
      isbn13: item.isbn13,
      title: item.title,
      author: item.author,
      publisher: item.publisher,
      coverSourceUrl: item.coverSourceUrl,
      coverBlobUrl: (await ensureCoverUploaded(item.isbn13, item.coverSourceUrl)) ?? undefined,
      slotNo: item.slotNo,
      comment: item.comment,
      periodLabel: item.periodLabel,
      sourceUrl: item.sourceUrl,
    })),
  );
}

export async function mapRankedItems(items: NormalizedRankedItem[]): Promise<IngestItem[]> {
  return Promise.all(
    items.map(async (item) => ({
      isbn13: item.isbn13,
      title: item.title,
      author: item.author,
      publisher: item.publisher,
      price: item.price,
      coverSourceUrl: item.coverSourceUrl,
      coverBlobUrl: (await ensureCoverUploaded(item.isbn13, item.coverSourceUrl)) ?? undefined,
      rank: item.rank,
      categoryLabel: item.categoryLabel,
    })),
  );
}
