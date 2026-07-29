import Link from "next/link";
import { HeroCarousel } from "@/components/HeroCarousel";
import { VendorCard } from "@/components/VendorCard";
import { StatusBadge } from "@/components/StatusBadge";
import { getTodayBooksByVendor, VENDORS } from "@/lib/queries";
import { BESTSELLER_VENDORS } from "@/lib/vendors";
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
    getJobTypeStatus("new_release", VENDORS),
    getJobTypeStatus("bestseller", BESTSELLER_VENDORS),
  ]);

  return (
    <div className="flex flex-col gap-9 sm:gap-12">
      <HeroCarousel />

      <section className="flex flex-col gap-4 sm:gap-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.12em] text-accent">CURATED TODAY</p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.03em] sm:text-2xl">오늘의 책</h2>
          </div>
          <Link href="/today-book" className="min-h-11 rounded-full px-3 py-3 text-sm font-semibold text-accent hover:bg-surface-muted">
            전체 보기 →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {todayBookSections.map((section) => (
            <VendorCard
              key={section.vendor}
              vendor={section.vendor}
              items={section.items.slice(0, 4)}
              status={section.status}
            />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {SECTION_LINKS.map((link, i) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex min-h-24 items-center justify-between rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5 hover:border-accent"
          >
            <span>
              <span className="block font-bold text-foreground">{link.label}</span>
              <span className="mt-2 block text-xs font-semibold text-accent">바로가기 →</span>
            </span>
            <StatusBadge status={i === 0 ? newReleaseStatus : bestsellerStatus} />
          </Link>
        ))}
      </section>
    </div>
  );
}
