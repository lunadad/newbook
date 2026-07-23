import type { Vendor } from "@/db/schema";
import type { IngestItem } from "./schema";

type JobEndpoint = "today-book" | "new-releases" | "bestsellers";

async function postOnce(endpoint: JobEndpoint, body: unknown): Promise<Response> {
  const baseUrl = process.env.INGEST_BASE_URL;
  const secret = process.env.CRON_INGEST_SECRET;
  if (!baseUrl) throw new Error("INGEST_BASE_URL 환경변수가 설정되지 않았습니다");
  if (!secret) throw new Error("CRON_INGEST_SECRET 환경변수가 설정되지 않았습니다");

  return fetch(`${baseUrl}/api/ingest/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
  });
}

/** ingest API에 POST한다. 실패 시 1회 재시도 후에도 실패하면 예외를 던진다. */
export async function postIngest(
  endpoint: JobEndpoint,
  vendor: Vendor,
  items: IngestItem[],
): Promise<void> {
  const body = { vendor, scrapedAt: new Date().toISOString(), items };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const res = await postOnce(endpoint, body);
    if (res.ok) return;
    console.error(
      `ingest 실패 (${endpoint}/${vendor}, 시도 ${attempt + 1}): ${res.status} ${await res.text()}`,
    );
  }
  throw new Error(`ingest 최종 실패: ${endpoint}/${vendor}`);
}
