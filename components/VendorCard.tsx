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
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-[0_1px_0_rgba(0,0,0,0.02)] sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-bold tracking-[-0.02em] text-foreground">{VENDOR_LABEL[vendor]}</h2>
        <StatusBadge status={status} />
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-foreground-subtle py-6 text-center">아직 수집된 데이터가 없습니다</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {items.map((item) => (
            <li key={item.slotNo} className="flex gap-3.5 py-3.5 first:pt-0 last:pb-0">
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-muted shadow-sm"
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
                    className="line-clamp-2 rounded text-[15px] font-semibold leading-snug text-foreground hover:text-accent"
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
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-foreground-subtle">{item.comment}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
