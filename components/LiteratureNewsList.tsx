import Image from "next/image";

interface NewsItem {
  id: number;
  title: string;
  publisher: string;
  publisherType: string;
  articleUrl: string;
  thumbnailUrl: string | null;
  publishedAt: Date;
}

const KST_DATE = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function LiteratureNewsList({ items }: { items: NewsItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-5 py-16 text-center">
        <p className="text-sm text-foreground-subtle">아직 수집된 문학 뉴스가 없습니다.</p>
        <p className="mt-1 text-xs text-foreground-subtle">매일 오전 8시에 새 기사를 확인합니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {items.map((item, index) => (
        <a
          key={item.id}
          href={item.articleUrl}
          target="_blank"
          rel="noreferrer"
          className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5 hover:border-accent"
        >
          <div className="relative aspect-[16/9] overflow-hidden bg-surface-muted">
            {item.thumbnailUrl ? (
              <Image
                src={`/api/news-thumbnail?url=${encodeURIComponent(item.thumbnailUrl)}`}
                alt=""
                fill
                loading={index < 2 ? "eager" : "lazy"}
                sizes="(max-width: 640px) calc(100vw - 32px), 464px"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="grid h-full place-items-center bg-[linear-gradient(135deg,var(--surface-muted),var(--border))]">
                <span className="text-4xl font-black text-foreground-subtle/50">{item.publisher[0]}</span>
              </div>
            )}
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-accent">{item.publisher}</span>
              <span className="text-foreground-subtle">
                {item.publisherType === "general" ? "종합일간지" : "경제지"}
              </span>
            </div>
            <h2 className="mt-2 line-clamp-2 text-[17px] font-bold leading-snug tracking-[-0.02em] text-foreground group-hover:text-accent">
              {item.title}
            </h2>
            <time dateTime={item.publishedAt.toISOString()} className="mt-3 block text-xs text-foreground-subtle">
              {KST_DATE.format(item.publishedAt)}
            </time>
          </div>
        </a>
      ))}
    </div>
  );
}
