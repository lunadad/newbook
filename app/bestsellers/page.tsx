import { RankTable } from "@/components/RankTable";
import { VendorTabs } from "@/components/VendorTabs";
import { getBestsellersByVendor, VENDORS } from "@/lib/queries";
import { getVendorStatus } from "@/lib/status";
import type { Vendor } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function BestsellersPage() {
  const entries = await Promise.all(
    VENDORS.map(async (vendor) => ({
      vendor,
      rows: await getBestsellersByVendor(vendor),
      status: await getVendorStatus("bestseller", vendor),
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
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">실시간 베스트셀러</h1>
      <VendorTabs statuses={statuses} panels={panels} />
    </div>
  );
}
