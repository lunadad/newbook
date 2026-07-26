import { RankTable } from "@/components/RankTable";
import { VendorTabs } from "@/components/VendorTabs";
import { getNewReleasesByVendor, VENDORS } from "@/lib/queries";
import { getVendorStatus } from "@/lib/status";
import type { Vendor } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function NewReleasesPage() {
  const entries = await Promise.all(
    VENDORS.map(async (vendor) => ({
      vendor,
      rows: await getNewReleasesByVendor(vendor),
      status: await getVendorStatus("new_release", vendor),
    })),
  );

  const panels = Object.fromEntries(
    entries.map((e) => [e.vendor, <RankTable key={e.vendor} rows={e.rows} />]),
  ) as Record<Vendor, React.ReactNode>;
  const statuses = Object.fromEntries(entries.map((e) => [e.vendor, e.status])) as Record<
    Vendor,
    (typeof entries)[number]["status"]
  >;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <header>
        <p className="text-xs font-bold tracking-[0.14em] text-accent">NEW &amp; NOTEWORTHY</p>
        <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] sm:text-4xl">문학 신상품</h1>
        <p className="mt-2 text-sm leading-relaxed text-foreground-muted">방금 서점에 도착한 새로운 문학 작품을 살펴보세요.</p>
      </header>
      <VendorTabs vendors={VENDORS} statuses={statuses} panels={panels} />
    </div>
  );
}
