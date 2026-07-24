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

  it("종합 순위에 음반 등 비도서가 섞여도 11위 이상을 끌어오지 않는다", () => {
    // 실제 스냅샷: 4위가 LP(hottracks 링크)라 도서 셀렉터에 안 잡혀 순위에 구멍이 생긴다.
    // 예전 구현은 정렬 후 앞에서 10개를 잘라 11위가 딸려 들어왔고,
    // rank BETWEEN 1 AND 10 제약을 위반해 교보문고 수집 전체가 실패했다.
    const items = parseKyoboBestsellerHtml(fixture("kyobo_bestseller_with_nonbook.html"));

    expect(items.length).toBeGreaterThan(0);
    // 허용 범위를 벗어난 순위가 절대 섞이면 안 된다
    items.forEach((item) => {
      expect(item.rank).toBeGreaterThanOrEqual(1);
      expect(item.rank).toBeLessThanOrEqual(10);
    });
    // 비도서가 차지한 순위는 임의로 당겨 매기지 않고 비워 둔다(순위 정확도 우선)
    expect(items.map((i) => i.rank)).not.toContain(4);
    expect(items.length).toBe(9);
    // 순위는 오름차순
    const ranks = items.map((i) => i.rank);
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
  });
});
