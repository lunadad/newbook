import { lt } from "drizzle-orm";
import { db } from "@/db/client";
import { literatureNews, newsCollectionRun } from "@/db/schema";
import type { LiteratureNewsItem } from "./schema";

const RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

export async function upsertLiteratureNews(
  collectedAt: Date,
  items: LiteratureNewsItem[],
): Promise<number> {
  const startedAt = new Date();

  try {
    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx
          .insert(literatureNews)
          .values({
            ...item,
            thumbnailUrl: item.thumbnailUrl ?? null,
            publishedAt: new Date(item.publishedAt),
            collectedAt,
          })
          .onConflictDoUpdate({
            target: literatureNews.externalId,
            set: {
              title: item.title,
              publisher: item.publisher,
              publisherType: item.publisherType,
              articleUrl: item.articleUrl,
              thumbnailUrl: item.thumbnailUrl ?? null,
              publishedAt: new Date(item.publishedAt),
              collectedAt,
            },
          });
      }

      await tx
        .delete(literatureNews)
        .where(lt(literatureNews.publishedAt, new Date(collectedAt.getTime() - RETENTION_MS)));

      await tx.insert(newsCollectionRun).values({
        status: "success",
        itemCount: items.length,
        startedAt,
        finishedAt: new Date(),
      });
    });
    return items.length;
  } catch (error) {
    await db.insert(newsCollectionRun).values({
      status: "failed",
      itemCount: 0,
      errorMessage: error instanceof Error ? error.message : String(error),
      startedAt,
      finishedAt: new Date(),
    });
    throw error;
  }
}
