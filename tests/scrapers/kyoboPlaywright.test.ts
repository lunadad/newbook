import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseKyoboTodayBookHtml } from "@/lib/scraping/kyoboTodayBook.playwright";
import { parseKyoboNewReleaseHtml } from "@/lib/scraping/kyoboNewRelease.playwright";

const fixture = (name: string) =>
  readFileSync(path.join(__dirname, "../fixtures", name), "utf-8");

describe("parseKyoboTodayBookHtml", () => {
  it("렌더링된 오늘의 선택 목록에서 20건 추출", () => {
    const items = parseKyoboTodayBookHtml(fixture("kyobo_todaybook_rendered.html"));
    expect(items).toHaveLength(20);
    items.forEach((item, i) => {
      expect(item.slotNo).toBe(i + 1);
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.isbn13).toMatch(/^\d{13}$/);
      expect(item.sourceUrl).toContain("product.kyobobook.co.kr/detail");
    });
  });
});

describe("parseKyoboNewReleaseHtml", () => {
  it("렌더링된 신상품 목록에서 rank 1부터 순차 추출", () => {
    const items = parseKyoboNewReleaseHtml(fixture("kyobo_newrelease_rendered.html"));
    expect(items.length).toBeGreaterThan(0);
    items.forEach((item, i) => {
      expect(item.rank).toBe(i + 1);
      expect(item.title.length).toBeGreaterThan(0);
    });
  });
});
