import { and, eq, isNull, notInArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  books,
  scrapeRun,
  vendorTodayBook,
  vendorNewRelease,
  vendorBestseller,
  type JobType,
  type RunStatus,
  type Vendor,
} from "@/db/schema";
import type { IngestItem } from "./schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * ISBN이 있으면 isbn13으로, 없으면 title+author+publisher 완전일치로 매칭하고,
 * 그마저 없으면 신규 books 행을 만든다(design.md §7-#6).
 */
async function resolveBookId(tx: Tx, item: IngestItem): Promise<number> {
  if (item.isbn13) {
    const [row] = await tx
      .insert(books)
      .values({
        isbn13: item.isbn13,
        title: item.title,
        author: item.author,
        publisher: item.publisher,
        pubDate: item.pubDate,
        price: item.price,
        coverSourceUrl: item.coverSourceUrl,
        coverBlobUrl: item.coverBlobUrl,
      })
      .onConflictDoUpdate({
        target: books.isbn13,
        set: {
          title: item.title,
          author: item.author,
          publisher: item.publisher,
          pubDate: item.pubDate,
          price: item.price,
          coverSourceUrl: item.coverSourceUrl,
          coverBlobUrl: item.coverBlobUrl,
          updatedAt: new Date(),
        },
      })
      .returning({ id: books.id });
    return row.id;
  }

  const authorCond = item.author ? eq(books.author, item.author) : isNull(books.author);
  const publisherCond = item.publisher
    ? eq(books.publisher, item.publisher)
    : isNull(books.publisher);

  const [existing] = await tx
    .select({ id: books.id })
    .from(books)
    .where(and(eq(books.title, item.title), authorCond, publisherCond))
    .limit(1);

  if (existing) {
    await tx
      .update(books)
      .set({
        price: item.price,
        coverSourceUrl: item.coverSourceUrl,
        coverBlobUrl: item.coverBlobUrl,
        updatedAt: new Date(),
      })
      .where(eq(books.id, existing.id));
    return existing.id;
  }

  const [inserted] = await tx
    .insert(books)
    .values({
      title: item.title,
      author: item.author,
      publisher: item.publisher,
      pubDate: item.pubDate,
      price: item.price,
      coverSourceUrl: item.coverSourceUrl,
      coverBlobUrl: item.coverBlobUrl,
    })
    .returning({ id: books.id });
  return inserted.id;
}

function computeStatus(items: IngestItem[]): RunStatus {
  // 표지를 Blob에 올리지 않고 원본 URL을 핫링크하므로 "표지 업로드 부분 실패(partial)" 개념이
  // 사라졌다. 목록을 정상 수집했으면 success다(수집 자체 실패는 상위에서 failed로 기록).
  return items.length > 0 ? "success" : "failed";
}

export async function upsertIngestBatch(
  jobType: JobType,
  vendor: Vendor,
  scrapedAt: Date,
  items: IngestItem[],
): Promise<{ status: RunStatus; itemCount: number }> {
  const startedAt = new Date();
  const status = computeStatus(items);

  // DB CHECK 제약(rank BETWEEN 1 AND N)에 걸리면 원인을 알기 어려운 SQL 에러로 배치 전체가
  // 실패한다. 스크래퍼가 범위 밖 순위를 넘기는 실수를 바로 알아볼 수 있도록 미리 검증한다.
  const maxRank = jobType === "new_release" ? 30 : jobType === "bestseller" ? 10 : null;
  if (maxRank !== null) {
    const bad = items.find((i) => i.rank != null && (i.rank < 1 || i.rank > maxRank));
    if (bad) {
      throw new Error(
        `${jobType} 순위가 허용 범위(1~${maxRank})를 벗어남: rank=${bad.rank} "${bad.title}" — 스크래퍼 순위 산출 확인 필요`,
      );
    }
  }

  try {
    await db.transaction(async (tx) => {
      if (jobType === "today_book") {
        const slots: number[] = [];
        for (const item of items) {
          if (!item.slotNo) throw new Error(`slotNo가 없는 today_book 항목: ${item.title}`);
          if (!item.sourceUrl) throw new Error(`sourceUrl이 없는 today_book 항목: ${item.title}`);
          const bookId = await resolveBookId(tx, item);
          slots.push(item.slotNo);
          await tx
            .insert(vendorTodayBook)
            .values({
              vendor,
              bookId,
              slotNo: item.slotNo,
              comment: item.comment,
              periodLabel: item.periodLabel,
              sourceUrl: item.sourceUrl,
              scrapedAt,
            })
            .onConflictDoUpdate({
              target: [vendorTodayBook.vendor, vendorTodayBook.slotNo],
              set: {
                bookId,
                comment: item.comment,
                periodLabel: item.periodLabel,
                sourceUrl: item.sourceUrl,
                scrapedAt,
              },
            });
        }
        await tx
          .delete(vendorTodayBook)
          .where(
            and(
              eq(vendorTodayBook.vendor, vendor),
              slots.length > 0 ? notInArray(vendorTodayBook.slotNo, slots) : undefined,
            ),
          );
      } else if (jobType === "new_release") {
        const ranks: number[] = [];
        for (const item of items) {
          if (!item.rank) throw new Error(`rank가 없는 new_release 항목: ${item.title}`);
          const bookId = await resolveBookId(tx, item);
          ranks.push(item.rank);
          await tx
            .insert(vendorNewRelease)
            .values({
              vendor,
              bookId,
              rank: item.rank,
              categoryLabel: item.categoryLabel,
              sourceUrl: item.sourceUrl,
              scrapedAt,
            })
            .onConflictDoUpdate({
              target: [vendorNewRelease.vendor, vendorNewRelease.rank],
              set: {
                bookId,
                categoryLabel: item.categoryLabel,
                sourceUrl: item.sourceUrl,
                scrapedAt,
              },
            });
        }
        await tx
          .delete(vendorNewRelease)
          .where(
            and(
              eq(vendorNewRelease.vendor, vendor),
              ranks.length > 0 ? notInArray(vendorNewRelease.rank, ranks) : undefined,
            ),
          );
      } else {
        const ranks: number[] = [];
        for (const item of items) {
          if (!item.rank) throw new Error(`rank가 없는 bestseller 항목: ${item.title}`);
          const bookId = await resolveBookId(tx, item);
          ranks.push(item.rank);
          await tx
            .insert(vendorBestseller)
            .values({ vendor, bookId, rank: item.rank, sourceUrl: item.sourceUrl, scrapedAt })
            .onConflictDoUpdate({
              target: [vendorBestseller.vendor, vendorBestseller.rank],
              set: { bookId, sourceUrl: item.sourceUrl, scrapedAt },
            });
        }
        await tx
          .delete(vendorBestseller)
          .where(
            and(
              eq(vendorBestseller.vendor, vendor),
              ranks.length > 0 ? notInArray(vendorBestseller.rank, ranks) : undefined,
            ),
          );
      }

      await tx.insert(scrapeRun).values({
        jobType,
        vendor,
        status,
        itemCount: items.length,
        startedAt,
        finishedAt: new Date(),
      });
    });

    return { status, itemCount: items.length };
  } catch (err) {
    await db.insert(scrapeRun).values({
      jobType,
      vendor,
      status: "failed",
      itemCount: 0,
      errorMessage: err instanceof Error ? err.message : String(err),
      startedAt,
      finishedAt: new Date(),
    });
    throw err;
  }
}
