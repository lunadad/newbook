import { scrapeYes24TodayBook } from "@/lib/scraping/yes24TodayBook";
import { scrapeAladinWeekly } from "@/lib/scraping/aladinWeekly";
import { scrapeKyoboTodayBook } from "@/lib/scraping/kyoboTodayBook.playwright";
import { mapTodayBookItems } from "@/lib/ingest/mapItems";
import { postIngest } from "@/lib/ingest/client";
import { politeDelay } from "@/lib/scraping/httpClient";
import { fingerprintOf, readFingerprint, writeFingerprint } from "@/lib/jobs/changeGate";
import type { CoreVendor } from "@/lib/vendors";
import type { NormalizedTodayBookItem } from "@/lib/scraping/types";

const SCRAPERS: Record<CoreVendor, () => Promise<NormalizedTodayBookItem[]>> = {
  yes24: scrapeYes24TodayBook,
  aladin: scrapeAladinWeekly,
  kyobo: scrapeKyoboTodayBook,
};

async function ingestVendor(vendor: CoreVendor, items: NormalizedTodayBookItem[]): Promise<void> {
  const ingestItems = mapTodayBookItems(items);
  await postIngest("today-book", vendor, ingestItems);
  console.log(`[today-book] ${vendor}: ${items.length}건 반영`);
}

/**
 * 변경 판별용 지문. 슬롯 번호·제목과 함께 선정일(periodLabel)도 넣는다 —
 * 서점이 같은 책을 유지한 채 선정 회차만 넘기는 경우도 갱신으로 봐야 하기 때문.
 */
function todayBookFingerprint(items: NormalizedTodayBookItem[]): string {
  return fingerprintOf(
    items.map((i) => `${i.slotNo}|${i.title}|${i.periodLabel ?? ""}`),
  );
}

function fingerprintKey(vendor: CoreVendor): string {
  return `today-book_${vendor}`;
}

/**
 * `--vendors=yes24,aladin` 형태로 수집 대상을 제한한다(미지정 시 전체).
 * 벤더마다 스크래핑 비용이 달라(교보문고는 Playwright로 브라우저를 띄운다) 크론에서
 * 벤더별로 다른 폴링 주기를 주기 위한 옵션이다.
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

/**
 * @param onlyIfChanged 직전 실행과 내용이 같으면 ingest를 건너뛴다(짧은 주기 폴링용).
 *   지문은 어느 경로로든 반영에 성공했을 때 갱신한다 — 안전망 실행(게이트 없음) 직후
 *   폴링이 같은 내용을 또 반영하는 일을 막기 위함.
 */
async function runOnce(vendors: CoreVendor[], onlyIfChanged: boolean): Promise<void> {
  for (const vendor of vendors) {
    try {
      const items = await SCRAPERS[vendor]();
      const fingerprint = todayBookFingerprint(items);

      if (onlyIfChanged && (await readFingerprint(fingerprintKey(vendor))) === fingerprint) {
        console.log(`[today-book] ${vendor}: 변경 없음`);
      } else {
        await ingestVendor(vendor, items);
        await writeFingerprint(fingerprintKey(vendor), fingerprint);
      }
    } catch (err) {
      console.error(`[today-book] ${vendor} 실패:`, err);
    }
    await politeDelay();
  }
}

async function main(): Promise<void> {
  await runOnce(parseVendorsArg(process.argv), process.argv.includes("--if-changed"));
}

main().catch((err) => {
  console.error("runTodayBook 실패:", err);
  process.exit(1);
});
