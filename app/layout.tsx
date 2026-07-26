import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "오늘의 책 대시보드",
  description: "예스24·교보문고·알라딘 오늘의 책 / 신상품 / 베스트셀러 모니터링 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Header />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 pt-6 pb-28 sm:px-6 sm:py-10">{children}</main>
      </body>
    </html>
  );
}
