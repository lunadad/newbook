import { RankTable } from "@/components/RankTable";
import { VendorTabs } from "@/components/VendorTabs";
import { getBestsellersByVendor } from "@/lib/queries";
import { BESTSELLER_VENDORS, VENDOR_CURRENCY } from "@/lib/vendors";
import { getVendorStatus } from "@/lib/status";
import type { Vendor } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function BestsellersPage() {
  const entries = await Promise.all(
    BESTSELLER_VENDORS.map(async (vendor) => ({
      vendor,
      rows: await getBestsellersByVendor(vendor),
      status: await getVendorStatus("bestseller", vendor),
    })),
  );

  const panels = Object.fromEntries(
    entries.map((e) => [
      e.vendor,
      <RankTable key={e.vendor} rows={e.rows} currency={VENDOR_CURRENCY[e.vendor]} />,
    ]),
  ) as Record<Vendor, React.ReactNode>;
  const statuses = Object.fromEntries(entries.map((e) => [e.vendor, e.status])) as Record<
    Vendor,
    (typeof entries)[number]["status"]
  >;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <header>
        <p className="text-xs font-bold tracking-[0.14em] text-accent">TRENDING NOW</p>
        <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] sm:text-4xl">실시간 베스트셀러</h1>
        <p className="mt-2 text-sm leading-relaxed text-foreground-muted">지금 독자들이 가장 많이 찾는 책의 흐름을 확인하세요.</p>
      </header>
      <VendorTabs vendors={BESTSELLER_VENDORS} statuses={statuses} panels={panels} />
    </div>
  );
}
