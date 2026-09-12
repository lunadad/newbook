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
    // Playwright가 업데이트되면 관리형 Chromium 캐시가 비어 있는 경우가 있다.
    // 로컬 cron 환경에는 이미 설치된 Chrome이 있으므로 이를 폴백으로 사용해
    // "Executable doesn't exist" 때문에 교보 수집 전체가 중단되지 않게 한다.
    try {
      browser = await chromium.launch();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/Executable doesn't exist|Please run `npx playwright install/i.test(message)) {
        throw error;
      }
      browser = await chromium.launch({ channel: "chrome" });
    }
    const page = await browser.newPage({ userAgent: SCRAPER_USER_AGENT });
    page.setDefaultTimeout(PAGE_TIMEOUT_MS);
    await page.goto(url, { waitUntil: "networkidle", timeout: PAGE_TIMEOUT_MS });
    const html = await page.content();
    return extract(html);
  } finally {
    await browser?.close();
  }
}
