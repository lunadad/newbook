import { scrapeYes24Bestseller } from "@/lib/scraping/yes24ProductList";
import { scrapeKyoboBestseller } from "@/lib/scraping/kyoboBestseller";
import { fetchAladinBestsellers } from "@/lib/scraping/aladinApi";
import { scrapeAmazonBestseller } from "@/lib/scraping/amazonBestseller";
import { mapRankedItems } from "@/lib/ingest/mapItems";
import { postIngest } from "@/lib/ingest/client";
import { politeDelay } from "@/lib/scraping/httpClient";
import type { Vendor } from "@/db/schema";
import type { NormalizedRankedItem } from "@/lib/scraping/types";

const SCRAPERS: Record<Vendor, () => Promise<NormalizedRankedItem[]>> = {
  yes24: scrapeYes24Bestseller,
  kyobo: scrapeKyoboBestseller,
  aladin: () => fetchAladinBestsellers(),
  amazon: scrapeAmazonBestseller,
};

async function main(): Promise<void> {
  for (const vendor of Object.keys(SCRAPERS) as Vendor[]) {
    try {
      const items = (await SCRAPERS[vendor]()).slice(0, 10);
      const ingestItems = await mapRankedItems(items);
      await postIngest("bestsellers", vendor, ingestItems);
      console.log(`[bestsellers] ${vendor}: ${items.length}건 반영`);
    } catch (err) {
      console.error(`[bestsellers] ${vendor} 실패:`, err);
    }
    await politeDelay();
  }
}

main().catch((err) => {
  console.error("runBestsellers 실패:", err);
  process.exit(1);
});
