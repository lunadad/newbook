import { scrapeYes24NewProduct } from "@/lib/scraping/yes24ProductList";
import { scrapeKyoboNewRelease } from "@/lib/scraping/kyoboNewRelease.playwright";
import { fetchAladinNewReleases } from "@/lib/scraping/aladinApi";
import { mapRankedItems } from "@/lib/ingest/mapItems";
import { postIngest } from "@/lib/ingest/client";
import { politeDelay } from "@/lib/scraping/httpClient";
import type { Vendor } from "@/db/schema";
import type { NormalizedRankedItem } from "@/lib/scraping/types";

const SCRAPERS: Record<Vendor, () => Promise<NormalizedRankedItem[]>> = {
  yes24: scrapeYes24NewProduct,
  kyobo: scrapeKyoboNewRelease,
  aladin: () => fetchAladinNewReleases(),
};

async function main(): Promise<void> {
  for (const vendor of Object.keys(SCRAPERS) as Vendor[]) {
    try {
      const items = (await SCRAPERS[vendor]()).slice(0, 30);
      const ingestItems = await mapRankedItems(items);
      await postIngest("new-releases", vendor, ingestItems);
      console.log(`[new-releases] ${vendor}: ${items.length}건 반영`);
    } catch (err) {
      console.error(`[new-releases] ${vendor} 실패:`, err);
    }
    await politeDelay();
  }
}

main().catch((err) => {
  console.error("runNewReleases 실패:", err);
  process.exit(1);
});
