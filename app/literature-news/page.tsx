import type { Metadata } from "next";
import { LiteratureNewsList } from "@/components/LiteratureNewsList";
import { getLatestLiteratureNews, getLatestNewsCollectionRun } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "문학 뉴스 | 책 레이더",
  description: "국내 종합일간지와 경제지의 최신 문학 뉴스를 매일 모아봅니다.",
};

const KST_UPDATED_AT = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export default async function LiteratureNewsPage() {
  const [items, latestRun] = await Promise.all([
    getLatestLiteratureNews(),
    getLatestNewsCollectionRun(),
  ]);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <header>
        <p className="text-xs font-bold tracking-[0.14em] text-accent">LITERARY NEWS</p>
        <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] sm:text-4xl">문학 뉴스</h1>
        <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
          국내 종합일간지와 경제지가 전한 문학 소식을 매일 오전 8시에 모읍니다.
        </p>
        {latestRun ? (
          <p className="mt-3 text-xs font-medium text-foreground-subtle">
            최근 수집 {KST_UPDATED_AT.format(latestRun.finishedAt)} · {latestRun.itemCount}건
          </p>
        ) : null}
      </header>
      <LiteratureNewsList items={items} />
    </div>
  );
}
