"use client";

import { useState, type ReactNode } from "react";
import type { Vendor } from "@/db/schema";
import { VENDOR_LABEL } from "@/lib/vendors";
import { StatusBadge } from "./StatusBadge";
import type { VendorStatus } from "@/lib/status";

export function VendorTabs({
  vendors,
  statuses,
  panels,
}: {
  vendors: Vendor[];
  statuses: Record<Vendor, VendorStatus>;
  panels: Record<Vendor, ReactNode>;
}) {
  const [active, setActive] = useState<Vendor>(vendors[0]);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0"
          role="tablist"
          aria-label="서점 선택"
        >
          {vendors.map((vendor) => (
            <button
              key={vendor}
              type="button"
              role="tab"
              aria-selected={active === vendor}
              onClick={() => setActive(vendor)}
              className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                active === vendor
                  ? "border-accent bg-accent text-accent-foreground shadow-sm"
                  : "border-border bg-surface text-foreground-muted hover:text-foreground"
              }`}
            >
              {VENDOR_LABEL[vendor]}
            </button>
          ))}
        </div>
        <div className="sm:ml-auto">
          <StatusBadge status={statuses[active]} />
        </div>
      </div>
      <div role="tabpanel">{panels[active]}</div>
    </div>
  );
}
