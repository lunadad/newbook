import Image from "next/image";

interface RankRow {
  rank: number;
  title: string;
  author: string | null;
  publisher: string | null;
  price: number | null;
  coverImageUrl: string | null;
  sourceUrl: string | null;
}

function formatPrice(price: number | null, currency: "KRW" | "USD"): string {
  if (price == null) return "-";
  if (currency === "USD") return `$${(price / 100).toFixed(2)}`;
  return `${price.toLocaleString()}원`;
}

export function RankTable({
  rows,
  currency = "KRW",
}: {
  rows: RankRow[];
  /** 아마존만 센트 단위 USD 정수로 저장되어 표시 포맷이 다르다(lib/vendors.ts VENDOR_CURRENCY 참고) */
  currency?: "KRW" | "USD";
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-foreground-subtle py-10 text-center">아직 수집된 데이터가 없습니다</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      <div>
        {rows.map((row) => {
          const cover = (
            <span
              className="relative block h-16 w-11 shrink-0 overflow-hidden rounded-md bg-surface-muted shadow-sm sm:h-[52px] sm:w-9"
            >
              {row.coverImageUrl ? (
                <Image src={row.coverImageUrl} alt="" fill sizes="(max-width: 640px) 44px, 36px" className="object-cover" />
              ) : null}
            </span>
          );
          const meta = (
            <div className="min-w-0">
              <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground transition-colors group-hover:text-accent sm:line-clamp-1 sm:text-sm">
                {row.title}
              </p>
              <p className="mt-1 line-clamp-1 text-xs text-foreground-muted">
                {[row.author, row.publisher].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-1.5 text-xs font-semibold text-foreground sm:hidden">
                {formatPrice(row.price, currency)}
              </p>
            </div>
          );

          return (
            <div
              key={row.rank}
              className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-3 border-b border-border px-3 py-3.5 last:border-b-0 sm:grid-cols-[36px_minmax(0,1fr)_88px] sm:px-4 sm:py-3"
            >
              <span className={`text-center text-sm font-black ${row.rank <= 3 ? "text-accent" : "text-foreground-subtle"}`}>
                {row.rank}
              </span>
              {row.sourceUrl ? (
                <a
                  href={row.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex min-w-0 items-center gap-3 rounded-lg"
                >
                  {cover}
                  {meta}
                </a>
              ) : (
                <div className="flex items-center gap-3 min-w-0">
                  {cover}
                  {meta}
                </div>
              )}
              <span className="hidden text-right text-sm font-medium text-foreground sm:block">
                {formatPrice(row.price, currency)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
