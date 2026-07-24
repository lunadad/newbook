import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseAmazonBestsellerHtml } from "@/lib/scraping/amazonBestseller";

const fixture = (name: string) =>
  readFileSync(path.join(__dirname, "../fixtures", name), "utf-8");

describe("parseAmazonBestsellerHtml", () => {
  it("상위 10개, rank 1부터 순차, ISBN13 변환 포함", () => {
    const items = parseAmazonBestsellerHtml(fixture("amazon_bestseller_rendered.html"));
    expect(items).toHaveLength(10);
    items.forEach((item, i) => {
      expect(item.rank).toBe(i + 1);
      expect(item.title.length).toBeGreaterThan(0);
    });
    expect(items[0].isbn13).toMatch(/^\d{13}$/);
    // 가격은 센트 단위로 저장된다 (예: $14.98 -> 1498)
    expect(items[0].price).toBe(1498);
    // 상품 URL은 ASIN 기준 정규 형태
    expect(items[0].productUrl).toMatch(/^https:\/\/www\.amazon\.com\/dp\/\w{10}$/);
  });
});
