import { describe, expect, it } from "vitest";
import { parseArticleImageUrl } from "@/lib/scraping/articleImage";

const PAGE_URL = "https://www.example-news.co.kr/article/1";

describe("parseArticleImageUrl", () => {
  it("og:image에서 기사 대표 이미지를 뽑는다", () => {
    const html = `<html><head>
      <meta property="og:image" content="https://cdn.example-news.co.kr/2026/09/main.jpg">
    </head></html>`;

    expect(parseArticleImageUrl(html, PAGE_URL)).toBe("https://cdn.example-news.co.kr/2026/09/main.jpg");
  });

  it("og:image가 없으면 twitter:image로 대체한다", () => {
    const html = `<html><head>
      <meta name="twitter:image" content="https://cdn.example-news.co.kr/2026/09/twitter.jpg">
    </head></html>`;

    expect(parseArticleImageUrl(html, PAGE_URL)).toBe("https://cdn.example-news.co.kr/2026/09/twitter.jpg");
  });

  it("og:image가 상대 경로면 기사 URL 기준으로 절대화한다", () => {
    const html = `<html><head><meta property="og:image" content="/images/main.png"></head></html>`;

    expect(parseArticleImageUrl(html, PAGE_URL)).toBe("https://www.example-news.co.kr/images/main.png");
  });

  it("이미지 메타가 없거나 URL이 아니면 null을 반환한다", () => {
    expect(parseArticleImageUrl("<html><head><title>기사</title></head></html>", PAGE_URL)).toBeNull();
    expect(parseArticleImageUrl(`<meta property="og:image" content="data:image/gif;base64,AA">`, PAGE_URL)).toBeNull();
  });
});
