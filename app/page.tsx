import Link from "next/link";
import { VendorCard } from "@/components/VendorCard";
import { StatusBadge } from "@/components/StatusBadge";
import { getTodayBooksByVendor, VENDORS } from "@/lib/queries";
import { getVendorStatus, getJobTypeStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

const SECTION_LINKS = [
  { href: "/new-releases", label: "문학 신상품 보기" },
  { href: "/bestsellers", label: "실시간 베스트셀러 보기" },
];

export default async function HomePage() {
  const [todayBookSections, newReleaseStatus, bestsellerStatus] = await Promise.all([
    Promise.all(
      VENDORS.map(async (vendor) => ({
        vendor,
        items: await getTodayBooksByVendor(vendor),
        status: await getVendorStatus("today_book", vendor),
      })),
    ),
    getJobTypeStatus("new_release"),
    getJobTypeStatus("bestseller"),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">오늘의 책</h1>
          <Link href="/today-book" className="text-sm text-accent hover:underline">
            전체 보기
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {todayBookSections.map((section) => (
            <VendorCard
              key={section.vendor}
              vendor={section.vendor}
              items={section.items.slice(0, 2)}
              status={section.status}
            />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SECTION_LINKS.map((link, i) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-2xl border border-border bg-surface p-5 flex items-center justify-between hover:border-accent transition-colors"
          >
            <span className="font-medium text-foreground">{link.label}</span>
            <StatusBadge status={i === 0 ? newReleaseStatus : bestsellerStatus} />
          </Link>
        ))}
      </section>
    </div>
  );
}
