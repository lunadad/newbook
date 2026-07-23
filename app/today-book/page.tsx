import { VendorCard } from "@/components/VendorCard";
import { getTodayBooksByVendor, VENDORS } from "@/lib/queries";
import { getVendorStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function TodayBookPage() {
  const sections = await Promise.all(
    VENDORS.map(async (vendor) => ({
      vendor,
      items: await getTodayBooksByVendor(vendor),
      status: await getVendorStatus("today_book", vendor),
    })),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">오늘의 책</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sections.map((section) => (
          <VendorCard
            key={section.vendor}
            vendor={section.vendor}
            items={section.items}
            status={section.status}
          />
        ))}
      </div>
    </div>
  );
}
