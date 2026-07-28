import { desc, eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { scrapeRun, type JobType, type Vendor } from "@/db/schema";

export type StatusState = "ok" | "stale" | "failed";

export interface VendorStatus {
  state: StatusState;
  lastFinishedAt: Date | null;
  /** 서버에서 미리 포맷한 KST 갱신 시각. 클라이언트 컴포넌트(VendorTabs) 안에서 렌더되므로
   * Date.now() 기반 상대시간을 쓰면 하이드레이션 불일치가 나 절대시각 문자열로 내려보낸다. */
  lastFinishedLabel: string | null;
  note?: string;
}

/**
 * "갱신 지연" 판정 임계값.
 *
 * cron에 적은 주기가 아니라 **실측 실행 간격**에 여유를 더해 잡는다. 주기의 2배 같은 값을 쓰면
 * 한 번만 밀려도 정상 동작 중에 "지연"으로 표시되기 때문이다.
 * (초기에는 GitHub Actions가 스케줄을 86~109분씩 지연시켜 여유가 크게 필요했다. 지금은 로컬
 * 헤르메스 cron이 제시간에 돌지만, 맥이 잠들어 있으면 실행이 밀릴 수 있어 여유는 유지한다.)
 */
const STALE_THRESHOLD_MS: Record<JobType, number> = {
  today_book: 5 * 60 * 60 * 1000, // 4시간 주기 안전망(강제 반영) + 여유
  new_release: 3 * 60 * 60 * 1000, // 실측 ~86분 + 여유
  bestseller: 4 * 60 * 60 * 1000, // 실측 ~109분 + 여유
};

const KST_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatKst(date: Date): string {
  return KST_FORMATTER.format(date);
}

export async function getVendorStatus(jobType: JobType, vendor: Vendor): Promise<VendorStatus> {
  const [latest] = await db
    .select()
    .from(scrapeRun)
    .where(and(eq(scrapeRun.jobType, jobType), eq(scrapeRun.vendor, vendor)))
    .orderBy(desc(scrapeRun.finishedAt))
    .limit(1);

  if (!latest) {
    return {
      state: "stale",
      lastFinishedAt: null,
      lastFinishedLabel: null,
      note: "아직 수집 기록 없음",
    };
  }

  const base = {
    lastFinishedAt: latest.finishedAt,
    lastFinishedLabel: formatKst(latest.finishedAt),
  };
  const age = Date.now() - latest.finishedAt.getTime();

  if (latest.status === "failed") {
    return { ...base, state: "failed", note: latest.errorMessage ?? undefined };
  }
  if (age > STALE_THRESHOLD_MS[jobType]) {
    return { ...base, state: "stale" };
  }
  if (latest.status === "partial") {
    return { ...base, state: "ok", note: "일부 표지 누락" };
  }
  return { ...base, state: "ok" };
}

/** 홈 화면 섹션 요약용: 벤더 중 가장 나쁜 상태를 대표값으로 반환 */
export async function getJobTypeStatus(jobType: JobType, vendors: Vendor[]): Promise<VendorStatus> {
  const statuses = await Promise.all(vendors.map((v) => getVendorStatus(jobType, v)));
  const priority: Record<StatusState, number> = { failed: 2, stale: 1, ok: 0 };
  return statuses.reduce((worst, cur) =>
    priority[cur.state] > priority[worst.state] ? cur : worst,
  );
}
