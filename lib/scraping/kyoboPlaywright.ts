import { chromium, type Browser } from "playwright";
import { SCRAPER_USER_AGENT } from "./userAgent";

const PAGE_TIMEOUT_MS = 15_000;

/**
 * 교보문고 CSR 페이지 전용 헤드리스 브라우저 헬퍼.
 * 페이지 로드/렌더링 타임아웃을 명시해 무한 대기를 방지한다(design.md §7-#5).
 */
export async function withKyoboPage<T>(
  url: string,
  extract: (html: string) => T,
): Promise<T> {
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ userAgent: SCRAPER_USER_AGENT });
    page.setDefaultTimeout(PAGE_TIMEOUT_MS);
    await page.goto(url, { waitUntil: "networkidle", timeout: PAGE_TIMEOUT_MS });
    const html = await page.content();
    return extract(html);
  } finally {
    await browser?.close();
  }
}
