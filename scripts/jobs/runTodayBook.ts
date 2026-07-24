import { scrapeYes24TodayBook } from "@/lib/scraping/yes24TodayBook";
import { scrapeAladinWeekly } from "@/lib/scraping/aladinWeekly";
import { scrapeKyoboTodayBook } from "@/lib/scraping/kyoboTodayBook.playwright";
import { mapTodayBookItems } from "@/lib/ingest/mapItems";
import { postIngest } from "@/lib/ingest/client";
import { politeDelay } from "@/lib/scraping/httpClient";
import { runHighfreqPoll } from "@/lib/jobs/highfreqPoll";
import type { CoreVendor } from "@/lib/vendors";
import type { NormalizedTodayBookItem } from "@/lib/scraping/types";

const POLL_INTERVAL_MS = 60_000;

/**
 * 고빈도 폴링을 유지할 시간(잡 시작 시점 기준).
 *
 * 원래 설계는 "19:00 KST"라는 절대 시각 컷오프였으나(design.md Phase 9), GitHub Actions가
 * 스케줄 워크플로우를 상시 지연시키기 때문에(실측: 다른 워크플로우들이 86~109분 지연) 잡이
 * 컷오프 이후에 기동하면 while 조건이 처음부터 거짓이라 폴링을 단 한 번도 못 돌고 즉시 종료된다.
 * 그래서 절대 시각 대신 **기동 시점 기준 상대 창**으로 바꿔, 몇 시에 기동되든 폴링 창을 보장한다.
 * 워크플로우의 timeout-minutes는 이 값보다 넉넉히 크게 잡아야 한다.
 */
const HIGHFREQ_WINDOW_MS = 90 * 60 * 1000;

const SCRAPERS: Record<CoreVendor, () => Promise<NormalizedTodayBookItem[]>> = {
  yes24: scrapeYes24TodayBook,
  aladin: scrapeAladinWeekly,
  kyobo: scrapeKyoboTodayBook,
};

function titleSetOf(items: NormalizedTodayBookItem[]): Set<string> {
  return new Set(items.map((i) => i.title));
}

async function ingestVendor(vendor: CoreVendor, items: NormalizedTodayBookItem[]): Promise<void> {
  const ingestItems = await mapTodayBookItems(items);
  await postIngest("today-book", vendor, ingestItems);
  console.log(`[today-book] ${vendor}: ${items.length}건 반영`);
}

/**
 * `--vendors=yes24,aladin` 형태로 수집 대상을 제한한다(미지정 시 전체).
 * 벤더마다 갱신 시각이 달라(예스24 16:30 전후, 교보문고·알라딘 18:00 전후) 크론에서
 * 해당 시간대에 필요한 벤더만 돌리기 위한 옵션이다 — 불필요한 스크래핑을 줄인다.
 */
function parseVendorsArg(argv: string[]): CoreVendor[] {
  const all = Object.keys(SCRAPERS) as CoreVendor[];
  const arg = argv.find((a) => a.startsWith("--vendors="));
  if (!arg) return all;
  const requested = arg.slice("--vendors=".length).split(",").map((s) => s.trim());
  const selected = all.filter((v) => requested.includes(v));
  if (selected.length === 0) {
    throw new Error(`--vendors 값이 올바르지 않습니다: ${arg} (사용 가능: ${all.join(",")})`);
  }
  return selected;
}

async function runOnce(vendors: CoreVendor[]): Promise<void> {
  for (const vendor of vendors) {
    try {
      const items = await SCRAPERS[vendor]();
      await ingestVendor(vendor, items);
    } catch (err) {
      console.error(`[today-book] ${vendor} 실패:`, err);
    }
    await politeDelay();
  }
}

/**
 * 화/금 전용: 폴링 창이 끝날 때까지 교보문고·알라딘을 60초 간격으로 재확인한다.
 * yes24는 today-book-normal.yml(하루 2회)이 별도로 처리하므로 여기서는 다루지 않는다.
 *
 * 최초 관측치는 (1) 곧바로 ingest해 두고 (2) 비교 기준선으로도 기록한 뒤 폴링을 계속한다.
 * 두 가지를 다 하는 이유:
 *  - 그냥 기준선으로만 두면, 잡이 지연 기동돼 이미 갱신이 끝난 뒤에 시작한 경우 이후로 변화가
 *    없어 폴링만 하다 아무것도 반영하지 못한 채 끝난다.
 *  - 반대로 ingest 후 폴링까지 종료해 버리면(원래 동작) 매번 첫 시도에서 끝나 60초 재확인
 *    루프 자체가 무의미해진다.
 * upsert는 멱등이라 첫 관측이 기존 DB와 같은 내용이어도 부작용이 없다.
 */
async function runHighfreq(): Promise<void> {
  const endsAt = new Date(Date.now() + HIGHFREQ_WINDOW_MS);
  console.log(`[today-book:highfreq] 폴링 시작, 종료 예정 ${endsAt.toISOString()}`);

  const result = await runHighfreqPoll<CoreVendor, NormalizedTodayBookItem>({
    vendors: ["kyobo", "aladin"],
    scrape: (vendor) => SCRAPERS[vendor](),
    fingerprint: titleSetOf,
    ingest: ingestVendor,
    windowMs: HIGHFREQ_WINDOW_MS,
    intervalMs: POLL_INTERVAL_MS,
    politeDelay,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    log: (message) => console.log(`[today-book:highfreq] ${message}`),
    onError: (vendor, err) => console.error(`[today-book:highfreq] ${vendor} 실패:`, err),
  });

  console.log(
    `[today-book:highfreq] 종료 (${result.iterations}회 폴링) — 변경 감지: ${result.changed.join(",") || "없음"} / 미감지: ${result.unchanged.join(",") || "없음"}`,
  );
}

async function main(): Promise<void> {
  const isHighfreq = process.argv.includes("--poll=highfreq");
  await (isHighfreq ? runHighfreq() : runOnce(parseVendorsArg(process.argv)));
}

main().catch((err) => {
  console.error("runTodayBook 실패:", err);
  process.exit(1);
});
