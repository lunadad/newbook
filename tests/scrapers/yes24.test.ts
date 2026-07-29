import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseYes24TodayBookHtml } from "@/lib/scraping/yes24TodayBook";
import {
  parseYes24ProductListHtml,
  YES24_BEST_LIST_SELECTOR,
  YES24_NEW_LIST_SELECTOR,
} from "@/lib/scraping/yes24ProductList";

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
  const parseNewProduct = () =>
    parseYes24ProductListHtml(fixture("yes24_newproduct.html"), 30, YES24_NEW_LIST_SELECTOR);

  it("최대 30개, rank가 1부터 순차 증가", () => {
    const items = parseNewProduct();
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(30);
    items.forEach((item, i) => {
      expect(item.rank).toBe(i + 1);
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.price).toBeGreaterThan(0);
    });
  });

  it("상단 히어로 섹션 4권을 제외하고 목록만 추출", () => {
    const items = parseNewProduct();
    const titles = items.map((i) => i.title);

    // 픽스처의 히어로 4권 중 목록에 없는 3권 — 제외되지 않으면 여기 남는다
    expect(titles).not.toContain("투명한 나선");
    expect(titles).not.toContain("지푸라기 왕관을 쓴 여자");
    expect(titles).not.toContain("그대를 소각한다");

    // 히어로는 목록의 책을 다시 노출하기도 한다("태양 아래 올리브") — 중복이 남으면 안 된다
    expect(new Set(titles).size).toBe(titles.length);

    expect(items).toHaveLength(24); // 히어로 4 제외, 목록 전체
    expect(items[0].title).toBe("한강은 노래하네"); // 목록의 첫 항목
  });
});

describe("parseYes24ProductListHtml (베스트셀러)", () => {
  it("상위 10개만 추출", () => {
    const items = parseYes24ProductListHtml(
      fixture("yes24_bestseller.html"),
      10,
      YES24_BEST_LIST_SELECTOR,
    );
    expect(items).toHaveLength(10);
    expect(items[0].rank).toBe(1);
  });
});
