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
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        {vendors.map((vendor) => (
          <button
            key={vendor}
            onClick={() => setActive(vendor)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              active === vendor
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-surface text-foreground-muted border-border hover:text-foreground"
            }`}
          >
            {VENDOR_LABEL[vendor]}
          </button>
        ))}
        <div className="ml-auto">
          <StatusBadge status={statuses[active]} />
        </div>
      </div>
      {panels[active]}
    </div>
  );
}
