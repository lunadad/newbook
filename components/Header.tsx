import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "홈" },
  { href: "/today-book", label: "오늘의 책" },
  { href: "/new-releases", label: "문학 신상품" },
  { href: "/bestsellers", label: "실시간 베스트셀러" },
];

export function Header() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link href="/" className="font-bold text-foreground shrink-0">
          오늘의 책 대시보드
        </Link>
        <nav className="flex gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 rounded-lg text-sm text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
