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

export function StatusBadge({ status }: { status: VendorStatus }) {
  const timeLabel = status.lastFinishedLabel ?? "기록 없음";

  return (
    <span
      title={status.note ?? undefined}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-foreground-muted whitespace-nowrap"
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${DOT_COLOR[status.state]}`} />
      {LABEL[status.state]}
      <span className="text-foreground-subtle">{timeLabel}</span>
    </span>
  );
}
