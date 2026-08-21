import { scrapeLiteratureNews } from "@/lib/scraping/literatureNews";

async function postNews(items: Awaited<ReturnType<typeof scrapeLiteratureNews>>): Promise<void> {
  const baseUrl = process.env.INGEST_BASE_URL;
  const secret = process.env.CRON_INGEST_SECRET;
  if (!baseUrl) throw new Error("INGEST_BASE_URL 환경변수가 설정되지 않았습니다");
  if (!secret) throw new Error("CRON_INGEST_SECRET 환경변수가 설정되지 않았습니다");

  const body = JSON.stringify({ collectedAt: new Date().toISOString(), items });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/ingest/literature-news`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body,
    });
    if (response.ok) return;
    console.error(`문학 뉴스 ingest 실패 (${attempt + 1}/2): ${response.status} ${await response.text()}`);
  }
  throw new Error("문학 뉴스 ingest 최종 실패");
}

async function main(): Promise<void> {
  const items = await scrapeLiteratureNews();
  await postNews(items);
  console.log(`[literature-news] ${items.length}건 반영`);
}

main().catch((error) => {
  console.error("runLiteratureNews 실패:", error);
  process.exit(1);
});
