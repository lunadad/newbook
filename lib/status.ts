import { desc, eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { scrapeRun, type JobType, type Vendor } from "@/db/schema";

export type StatusState = "ok" | "stale" | "failed";

export interface VendorStatus {
  state: StatusState;
  lastFinishedAt: Date | null;
  note?: string;
}

const EXPECTED_INTERVAL_MS: Record<JobType, number> = {
  today_book: 12 * 60 * 60 * 1000,
  new_release: 30 * 60 * 1000,
  bestseller: 60 * 60 * 1000,
};

export async function getVendorStatus(jobType: JobType, vendor: Vendor): Promise<VendorStatus> {
  const [latest] = await db
    .select()
    .from(scrapeRun)
    .where(and(eq(scrapeRun.jobType, jobType), eq(scrapeRun.vendor, vendor)))
    .orderBy(desc(scrapeRun.finishedAt))
    .limit(1);

  if (!latest) {
    return { state: "stale", lastFinishedAt: null, note: "아직 수집 기록 없음" };
  }

  const threshold = EXPECTED_INTERVAL_MS[jobType] * 2;
  const age = Date.now() - latest.finishedAt.getTime();

  if (latest.status === "failed") {
    return { state: "failed", lastFinishedAt: latest.finishedAt, note: latest.errorMessage ?? undefined };
  }
  if (age > threshold) {
    return { state: "stale", lastFinishedAt: latest.finishedAt };
  }
  if (latest.status === "partial") {
    return { state: "ok", lastFinishedAt: latest.finishedAt, note: "일부 표지 누락" };
  }
  return { state: "ok", lastFinishedAt: latest.finishedAt };
}

/** 홈 화면 섹션 요약용: 벤더 중 가장 나쁜 상태를 대표값으로 반환 */
export async function getJobTypeStatus(jobType: JobType, vendors: Vendor[]): Promise<VendorStatus> {
  const statuses = await Promise.all(vendors.map((v) => getVendorStatus(jobType, v)));
  const priority: Record<StatusState, number> = { failed: 2, stale: 1, ok: 0 };
  return statuses.reduce((worst, cur) =>
    priority[cur.state] > priority[worst.state] ? cur : worst,
  );
}
