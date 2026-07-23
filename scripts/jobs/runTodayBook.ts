import { scrapeYes24TodayBook } from "@/lib/scraping/yes24TodayBook";
import { scrapeAladinWeekly } from "@/lib/scraping/aladinWeekly";
import { scrapeKyoboTodayBook } from "@/lib/scraping/kyoboTodayBook.playwright";
import { mapTodayBookItems } from "@/lib/ingest/mapItems";
import { postIngest } from "@/lib/ingest/client";
import { politeDelay } from "@/lib/scraping/httpClient";
import type { CoreVendor } from "@/lib/vendors";
import type { NormalizedTodayBookItem } from "@/lib/scraping/types";

const POLL_INTERVAL_MS = 60_000;

/** 화/금 고빈도 폴링 컷오프: 그날(UTC) 10:00 = 19:00 KST (design.md Phase 9) */
function highfreqCutoff(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 10, 0, 0),
  );
}

const SCRAPERS: Record<CoreVendor, () => Promise<NormalizedTodayBookItem[]>> = {
  yes24: scrapeYes24TodayBook,
  aladin: scrapeAladinWeekly,
  kyobo: scrapeKyoboTodayBook,
};

function titleSetOf(items: NormalizedTodayBookItem[]): Set<string> {
  return new Set(items.map((i) => i.title));
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  return a.size === b.size && [...a].every((t) => b.has(t));
}

async function ingestVendor(vendor: CoreVendor, items: NormalizedTodayBookItem[]): Promise<void> {
  const ingestItems = await mapTodayBookItems(items);
  await postIngest("today-book", vendor, ingestItems);
  console.log(`[today-book] ${vendor}: ${items.length}건 반영`);
}

async function runOnce(): Promise<void> {
  for (const vendor of Object.keys(SCRAPERS) as CoreVendor[]) {
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
 * 화/금 전용: 컷오프까지 교보문고·알라딘만 60초 간격으로 재확인하고,
 * 각 벤더는 이전 결과 대비 제목 목록이 바뀌면 즉시 ingest한 뒤 해당 벤더 폴링을 종료한다.
 * yes24는 today-book-normal.yml(하루 2회)이 별도로 처리하므로 여기서는 다루지 않는다.
 */
async function runHighfreq(): Promise<void> {
  const cutoff = highfreqCutoff();
  const pending = new Set<CoreVendor>(["kyobo", "aladin"]);
  const lastSeen = new Map<CoreVendor, Set<string>>();

  while (pending.size > 0 && new Date() < cutoff) {
    for (const vendor of [...pending]) {
      try {
        const items = await SCRAPERS[vendor]();
        const current = titleSetOf(items);
        const previous = lastSeen.get(vendor);

        if (!previous) {
          // 최초 관측치는 비교 기준선으로만 기록한다. 이를 "변경"으로 취급해 즉시
          // ingest하면 매번 첫 시도에서 폴링이 끝나버려 60초 재확인 루프가 무의미해진다.
          lastSeen.set(vendor, current);
        } else if (!setsEqual(previous, current)) {
          await ingestVendor(vendor, items);
          pending.delete(vendor);
        }
      } catch (err) {
        console.error(`[today-book:highfreq] ${vendor} 실패:`, err);
      }
      await politeDelay();
    }

    if (pending.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }

  if (pending.size > 0) {
    console.log(`[today-book:highfreq] 컷오프(19:00 KST) 도달, 미확인 벤더: ${[...pending]}`);
  }
}

async function main(): Promise<void> {
  const isHighfreq = process.argv.includes("--poll=highfreq");
  await (isHighfreq ? runHighfreq() : runOnce());
}

main().catch((err) => {
  console.error("runTodayBook 실패:", err);
  process.exit(1);
});
