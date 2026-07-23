import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseKyoboBestsellerHtml } from "@/lib/scraping/kyoboBestseller";

const fixture = (name: string) =>
  readFileSync(path.join(__dirname, "../fixtures", name), "utf-8");

describe("parseKyoboBestsellerHtml", () => {
  it("상위 10개, ISBN13이 커버 URL에서 추출됨", () => {
    const items = parseKyoboBestsellerHtml(fixture("kyobo_bestseller.html"));
    expect(items).toHaveLength(10);
    items.forEach((item, i) => {
      expect(item.rank).toBe(i + 1);
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.isbn13).toMatch(/^\d{13}$/);
    });
  });
});
