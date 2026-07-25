import Image from "next/image";
import type { Vendor } from "@/db/schema";
import { VENDOR_LABEL } from "@/lib/vendors";
import { StatusBadge } from "./StatusBadge";
import type { VendorStatus } from "@/lib/status";

interface TodayBookItem {
  slotNo: number;
  comment: string | null;
  periodLabel: string | null;
  sourceUrl: string;
  title: string;
  author: string | null;
  publisher: string | null;
  coverImageUrl: string | null;
}

export function VendorCard({
  vendor,
  items,
  status,
}: {
  vendor: Vendor;
  items: TodayBookItem[];
  status: VendorStatus;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-foreground">{VENDOR_LABEL[vendor]}</h2>
        <StatusBadge status={status} />
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-foreground-subtle py-6 text-center">아직 수집된 데이터가 없습니다</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {items.map((item) => (
            <li key={item.slotNo} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 w-16 h-24 rounded-lg overflow-hidden bg-surface-muted relative"
              >
                {item.coverImageUrl ? (
                  <Image
                    src={item.coverImageUrl}
                    alt={item.title}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : null}
              </a>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-foreground hover:text-accent line-clamp-2"
                  >
                    {item.title}
                  </a>
                  {item.periodLabel ? (
                    <span className="shrink-0 text-[11px] text-foreground-subtle whitespace-nowrap mt-0.5">
                      {item.periodLabel}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-foreground-muted mt-0.5 line-clamp-1">
                  {[item.author, item.publisher].filter(Boolean).join(" · ")}
                </p>
                {item.comment ? (
                  <p className="text-xs text-foreground-subtle mt-1 line-clamp-2">{item.comment}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
