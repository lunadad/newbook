import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseYes24TodayBookHtml } from "@/lib/scraping/yes24TodayBook";
import { parseYes24ProductListHtml } from "@/lib/scraping/yes24ProductList";

const fixture = (name: string) =>
  readFileSync(path.join(__dirname, "../fixtures", name), "utf-8");

describe("parseYes24TodayBookHtml", () => {
  it("추출: 4개 슬롯, 제목/저자/코멘트 채워짐", () => {
    const items = parseYes24TodayBookHtml(fixture("yes24_todaybook.html"));
    expect(items).toHaveLength(4);
    items.forEach((item, i) => {
      expect(item.slotNo).toBe(i + 1);
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.sourceUrl).toMatch(/^https:\/\//);
    });
    expect(items[0].comment).toBeTruthy();
    expect(items[0].periodLabel).toMatch(/\d{4}년 \d{1,2}월/);
  });
});

describe("parseYes24ProductListHtml (신상품)", () => {
  it("최대 30개, rank가 1부터 순차 증가", () => {
    const items = parseYes24ProductListHtml(fixture("yes24_newproduct.html"), 30);
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(30);
    items.forEach((item, i) => {
      expect(item.rank).toBe(i + 1);
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.price).toBeGreaterThan(0);
    });
  });
});

describe("parseYes24ProductListHtml (베스트셀러)", () => {
  it("상위 10개만 추출", () => {
    const items = parseYes24ProductListHtml(fixture("yes24_bestseller.html"), 10);
    expect(items).toHaveLength(10);
    expect(items[0].rank).toBe(1);
  });
});
