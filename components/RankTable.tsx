import Image from "next/image";

interface RankRow {
  rank: number;
  title: string;
  author: string | null;
  publisher: string | null;
  price: number | null;
  coverBlobUrl: string | null;
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
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <div className="min-w-[480px]">
        {rows.map((row) => (
          <div
            key={row.rank}
            className="grid items-center gap-3 px-4 py-3 border-b border-border last:border-b-0"
            style={{ gridTemplateColumns: "36px minmax(0,1fr) 88px" }}
          >
            <span className="text-sm font-bold text-foreground-subtle text-center">{row.rank}</span>
            <div className="flex items-center gap-3 min-w-0">
              <span className="shrink-0 rounded bg-surface-muted overflow-hidden relative" style={{ width: "36px", height: "52px" }}>
                {row.coverBlobUrl ? (
                  <Image src={row.coverBlobUrl} alt={row.title} fill sizes="36px" className="object-cover" />
                ) : null}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground line-clamp-1">{row.title}</p>
                <p className="text-xs text-foreground-muted line-clamp-1">
                  {[row.author, row.publisher].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <span className="text-sm text-foreground text-right">{formatPrice(row.price, currency)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
