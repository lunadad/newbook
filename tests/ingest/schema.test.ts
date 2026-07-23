import { describe, expect, it } from "vitest";
import { ingestRequestSchema } from "@/lib/ingest/schema";

describe("ingestRequestSchema", () => {
  it("정상 payload를 통과시킨다", () => {
    const result = ingestRequestSchema.safeParse({
      vendor: "yes24",
      scrapedAt: new Date().toISOString(),
      items: [{ title: "테스트 도서", rank: 1, price: 12000 }],
    });
    expect(result.success).toBe(true);
  });

  it("잘못된 vendor는 거부한다", () => {
    const result = ingestRequestSchema.safeParse({
      vendor: "unknown-vendor",
      scrapedAt: new Date().toISOString(),
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it("title이 없는 item은 거부한다", () => {
    const result = ingestRequestSchema.safeParse({
      vendor: "kyobo",
      scrapedAt: new Date().toISOString(),
      items: [{ rank: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it("scrapedAt이 ISO datetime이 아니면 거부한다", () => {
    const result = ingestRequestSchema.safeParse({
      vendor: "aladin",
      scrapedAt: "2026-07-23",
      items: [],
    });
    expect(result.success).toBe(false);
  });
});
