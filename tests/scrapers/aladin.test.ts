import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseAladinWeeklyHtml } from "@/lib/scraping/aladinWeekly";
import { parseAladinProductListHtml } from "@/lib/scraping/aladinProductList";

const fixture = (name: string) =>
  readFileSync(path.join(__dirname, "../fixtures", name), "utf-8");

describe("parseAladinWeeklyHtml", () => {
  it("편집장의 선택 4건, 저자/출판사 분리", () => {
    const items = parseAladinWeeklyHtml(fixture("aladin_weekly.html"));
    expect(items).toHaveLength(4);
    items.forEach((item) => {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.publisher).toBeTruthy();
      expect(item.sourceUrl).toContain("wproduct.aspx");
    });
  });
});

describe("parseAladinProductListHtml (신상품 폴백)", () => {
  it("국내 문학 신상품 목록 추출", () => {
    const items = parseAladinProductListHtml(fixture("aladin_new_fallback.html"), 30);
    expect(items.length).toBeGreaterThan(0);
    items.forEach((item, i) => {
      expect(item.rank).toBe(i + 1);
      expect(item.title.length).toBeGreaterThan(0);
    });
  });
});

describe("parseAladinProductListHtml (베스트셀러 폴백)", () => {
  it("상위 10개로 절단", () => {
    const items = parseAladinProductListHtml(fixture("aladin_bestseller_fallback.html"), 10);
    expect(items).toHaveLength(10);
  });
});
