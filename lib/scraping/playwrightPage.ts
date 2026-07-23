import { chromium, type Browser } from "playwright";
import { SCRAPER_USER_AGENT } from "./userAgent";

const PAGE_TIMEOUT_MS = 15_000;
/** networkidle 이후에도 가격 등 일부 위젯이 비동기로 늦게 채워지는 사이트(아마존 등)가 있어
 * 콘텐츠를 읽기 전 짧게 추가 대기한다(실측: networkidle 직후 캡처 시 가격이 간헐적으로 누락됨). */
const SETTLE_MS = 1_500;

/** CSR 페이지 공용 헤드리스 브라우저 헬퍼. 페이지 로드 타임아웃을 명시해 무한 대기를 방지한다. */
export async function withPlaywrightPage<T>(
  url: string,
  extract: (html: string) => T,
): Promise<T> {
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ userAgent: SCRAPER_USER_AGENT });
    page.setDefaultTimeout(PAGE_TIMEOUT_MS);
    await page.goto(url, { waitUntil: "networkidle", timeout: PAGE_TIMEOUT_MS });
    await page.waitForTimeout(SETTLE_MS);
    const html = await page.content();
    return extract(html);
  } finally {
    await browser?.close();
  }
}
