import { describe, expect, it } from "vitest";
import { runHighfreqPoll } from "@/lib/jobs/highfreqPoll";

type Item = { title: string };
const items = (...titles: string[]): Item[] => titles.map((title) => ({ title }));
const fingerprint = (list: Item[]) => new Set(list.map((i) => i.title));

/** 가상 시계: sleep/politeDelay가 실제로 기다리지 않고 시간만 진행시킨다 */
function fakeClock(startMs = 0) {
  let current = startMs;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
  };
}

interface HarnessOptions {
  /** 폴링 회차별로 반환할 데이터 (마지막 값은 이후 계속 유지) */
  responses: Item[][];
  windowMs?: number;
}

function harness({ responses, windowMs = 10 * 60_000 }: HarnessOptions) {
  const clock = fakeClock();
  const ingested: { vendor: string; titles: string[] }[] = [];
  let call = 0;

  const run = () =>
    runHighfreqPoll<"kyobo", Item>({
      vendors: ["kyobo"],
      scrape: async () => {
        const value = responses[Math.min(call, responses.length - 1)];
        call += 1;
        return value;
      },
      fingerprint,
      ingest: async (vendor, list) => {
        ingested.push({ vendor, titles: list.map((i) => i.title) });
      },
      windowMs,
      intervalMs: 60_000,
      politeDelay: async () => clock.advance(6_000),
      sleep: async (ms) => clock.advance(ms),
      now: clock.now,
    });

  return { run, ingested };
}

describe("runHighfreqPoll", () => {
  it("최초 관측치를 즉시 반영하고, 폴링은 계속한다", async () => {
    // 지연 기동으로 이미 갱신이 끝난 뒤 시작한 상황: 이후 내용이 계속 동일해도
    // 최초 1회는 반드시 반영돼야 한다(반영 없이 끝나면 데이터가 갱신되지 않음).
    const { run, ingested } = harness({ responses: [items("A", "B")] });
    const result = await run();

    expect(ingested).toHaveLength(1);
    expect(ingested[0].titles).toEqual(["A", "B"]);
    // 첫 회차에 끝나지 않고 폴링 창이 다 찰 때까지 계속 확인해야 한다
    expect(result.iterations).toBeGreaterThan(1);
    expect(result.unchanged).toEqual(["kyobo"]);
    expect(result.changed).toEqual([]);
  });

  it("변경이 감지되면 다시 반영하고 해당 벤더 폴링을 종료한다", async () => {
    const { run, ingested } = harness({
      responses: [items("A", "B"), items("A", "B"), items("C", "D")],
    });
    const result = await run();

    // 최초 반영 + 변경 감지 반영 = 2회
    expect(ingested.map((i) => i.titles)).toEqual([
      ["A", "B"],
      ["C", "D"],
    ]);
    expect(result.changed).toEqual(["kyobo"]);
    expect(result.unchanged).toEqual([]);
    expect(result.iterations).toBe(3);
  });

  it("내용이 그대로면 중복 반영하지 않는다", async () => {
    const { run, ingested } = harness({ responses: [items("A")] });
    await run();
    expect(ingested).toHaveLength(1);
  });

  it("폴링 창은 기동 시점 기준이라 늦게 시작해도 창이 보장된다", async () => {
    // 절대 시각 컷오프였다면 지연 기동 시 0회 폴링으로 끝났던 회귀 케이스
    const { run } = harness({ responses: [items("A")], windowMs: 5 * 60_000 });
    const result = await run();
    expect(result.iterations).toBeGreaterThan(1);
  });

  it("한 벤더가 실패해도 다른 벤더는 계속 진행한다", async () => {
    const clock = fakeClock();
    const ingested: string[] = [];
    const errors: string[] = [];

    const result = await runHighfreqPoll<"kyobo" | "aladin", Item>({
      vendors: ["kyobo", "aladin"],
      scrape: async (vendor) => {
        if (vendor === "kyobo") throw new Error("스크래핑 실패");
        return items("A");
      },
      fingerprint,
      ingest: async (vendor) => {
        ingested.push(vendor);
      },
      windowMs: 3 * 60_000,
      intervalMs: 60_000,
      politeDelay: async () => clock.advance(6_000),
      sleep: async (ms) => clock.advance(ms),
      now: clock.now,
      onError: (vendor) => errors.push(vendor),
    });

    expect(ingested).toContain("aladin");
    expect(errors.every((v) => v === "kyobo")).toBe(true);
    expect(result.unchanged).toContain("kyobo");
  });
});
