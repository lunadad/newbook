import type { VendorStatus } from "@/lib/status";

const LABEL: Record<VendorStatus["state"], string> = {
  ok: "정상",
  stale: "갱신 지연",
  failed: "실패",
};

const DOT_COLOR: Record<VendorStatus["state"], string> = {
  ok: "bg-status-ok",
  stale: "bg-status-stale",
  failed: "bg-status-failed",
};

function formatRelative(date: Date | null): string {
  if (!date) return "기록 없음";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "방금 전 갱신";
  if (minutes < 60) return `${minutes}분 전 갱신`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}시간 전 갱신`;
  const days = Math.round(hours / 24);
  return `${days}일 전 갱신`;
}

export function StatusBadge({ status }: { status: VendorStatus }) {
  const title = [formatRelative(status.lastFinishedAt), status.note].filter(Boolean).join(" · ");

  return (
    <span
      title={title}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-foreground-muted"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_COLOR[status.state]}`} />
      {LABEL[status.state]}
    </span>
  );
}
