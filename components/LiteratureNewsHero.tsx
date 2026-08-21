import Image from "next/image";
import Link from "next/link";

interface HeroNewsItem {
  id: number;
  title: string;
  publisher: string;
  articleUrl: string;
  thumbnailUrl: string | null;
}

export function LiteratureNewsHero({ items }: { items: HeroNewsItem[] }) {
  return (
    <section aria-labelledby="news-hero-title" className="relative">
      <h1 id="news-hero-title" className="sr-only">
        오늘 읽을 책과 문학 소식을 가장 빠르게 발견하는 책 레이더
      </h1>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        {items.map((item) => (
          <a
            key={item.id}
            href={item.articleUrl}
            target="_blank"
            rel="noreferrer"
            className="group relative aspect-[4/5] overflow-hidden rounded-[22px] bg-surface-muted shadow-[0_12px_40px_rgba(24,32,28,0.08)] sm:aspect-[16/9] sm:rounded-[28px]"
          >
            {item.thumbnailUrl ? (
              <Image
                src={`/api/news-thumbnail?url=${encodeURIComponent(item.thumbnailUrl)}`}
                alt=""
                fill
                loading="eager"
                sizes="(max-width: 640px) calc((100vw - 42px) / 2), 480px"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="grid h-full place-items-center bg-[linear-gradient(145deg,var(--surface-muted),var(--border))]">
                <span className="text-5xl font-black text-foreground-subtle/40">{item.publisher[0]}</span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3.5 text-white sm:p-6">
              <span className="inline-flex rounded-full bg-white/18 px-2.5 py-1 text-[10px] font-bold backdrop-blur-sm sm:text-xs">
                {item.publisher}
              </span>
              <h2 className="mt-2 line-clamp-3 text-sm font-bold leading-snug tracking-[-0.02em] sm:line-clamp-2 sm:text-xl">
                {item.title}
              </h2>
            </div>
          </a>
        ))}
      </div>

      <Link
        href="/literature-news"
        className="absolute right-3 top-3 rounded-full border border-white/70 bg-white/85 px-3 py-2 text-xs font-bold text-foreground shadow-sm backdrop-blur transition-colors hover:bg-white sm:right-5 sm:top-5 sm:text-sm"
      >
        문학 뉴스 →
      </Link>
    </section>
  );
}
