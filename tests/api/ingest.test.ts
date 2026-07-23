import { describe, expect, it, beforeAll } from "vitest";

const hasDb = !!process.env.DATABASE_URL;

// db/client.ts는 모듈 로드 시점에 DATABASE_URL이 없으면 즉시 예외를 던지므로(fail-fast),
// DB가 없는 환경(CI 등)에서는 describe 블록 자체를 등록하지 않아 동적 import가 실행되지 않게 한다.
if (hasDb) {
  registerIngestTests();
} else {
  describe.skip("upsertIngestBatch (DATABASE_URL 없음 — 스킵)", () => {
    it("DB 연결 필요", () => {});
  });
}

function registerIngestTests() {
  describe("upsertIngestBatch (로컬/Neon 브랜치 DB 필요)", async () => {
    const { eq, and } = await import("drizzle-orm");
    const { db } = await import("@/db/client");
    const { vendorBestseller, scrapeRun } = await import("@/db/schema");
    const { upsertIngestBatch } = await import("@/lib/ingest/upsert");

    beforeAll(async () => {
      await db.delete(vendorBestseller).where(eq(vendorBestseller.vendor, "yes24"));
    });

    it("신규 payload를 upsert하고 scrape_run을 success로 기록한다", async () => {
      const result = await upsertIngestBatch("bestseller", "yes24", new Date(), [
        { title: "통합테스트 도서 A", rank: 1, price: 10000 },
        { title: "통합테스트 도서 B", rank: 2, price: 20000 },
      ]);
      expect(result.status).toBe("success");
      expect(result.itemCount).toBe(2);

      const rows = await db
        .select()
        .from(vendorBestseller)
        .where(eq(vendorBestseller.vendor, "yes24"));
      expect(rows).toHaveLength(2);
    });

    it("이전 응답에 없는 rank는 삭제된다(전량 교체)", async () => {
      await upsertIngestBatch("bestseller", "yes24", new Date(), [
        { title: "통합테스트 도서 C", rank: 1, price: 15000 },
      ]);

      const rows = await db
        .select()
        .from(vendorBestseller)
        .where(eq(vendorBestseller.vendor, "yes24"));
      expect(rows).toHaveLength(1);
      expect(rows[0].rank).toBe(1);
    });

    it("표지 URL이 일부 누락되면 status=partial로 기록된다", async () => {
      const result = await upsertIngestBatch("bestseller", "yes24", new Date(), [
        { title: "통합테스트 도서 D", rank: 1, coverSourceUrl: "https://example.com/a.jpg" },
      ]);
      expect(result.status).toBe("partial");

      const latestRuns = await db
        .select()
        .from(scrapeRun)
        .where(and(eq(scrapeRun.jobType, "bestseller"), eq(scrapeRun.vendor, "yes24")));
      expect(latestRuns.length).toBeGreaterThan(0);
    });

    it("rank가 없는 항목은 예외를 던지고 failed 상태를 기록한다", async () => {
      await expect(
        upsertIngestBatch("bestseller", "yes24", new Date(), [{ title: "rank 누락 도서" }]),
      ).rejects.toThrow();

      const runs = await db
        .select()
        .from(scrapeRun)
        .where(and(eq(scrapeRun.jobType, "bestseller"), eq(scrapeRun.vendor, "yes24")));
      expect(runs.some((r) => r.status === "failed")).toBe(true);
    });
  });
}
