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
    <div className="flex flex-col gap-6 sm:gap-8">
      <header>
        <p className="text-xs font-bold tracking-[0.14em] text-accent">CURATED TODAY</p>
        <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] sm:text-4xl">오늘의 책</h1>
        <p className="mt-2 text-sm leading-relaxed text-foreground-muted">각 서점이 오늘 주목한 책을 한눈에 모았습니다.</p>
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
