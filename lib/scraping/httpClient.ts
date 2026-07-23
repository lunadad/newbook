import { SCRAPER_USER_AGENT, MIN_REQUEST_INTERVAL_MS } from "./userAgent";

const DEFAULT_TIMEOUT_MS = 10_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOnce(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { "User-Agent": SCRAPER_USER_AGENT },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 커스텀 User-Agent를 붙이는 fetch 래퍼. 타임아웃과 실패 시 1회 재시도를 포함한다.
 */
export async function fetchWithUserAgent(
  url: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  try {
    return await fetchOnce(url, timeoutMs);
  } catch {
    return await fetchOnce(url, timeoutMs);
  }
}

export async function fetchText(url: string, timeoutMs?: number): Promise<string> {
  const res = await fetchWithUserAgent(url, timeoutMs);
  if (!res.ok) {
    throw new Error(`요청 실패 (${res.status}): ${url}`);
  }
  return res.text();
}

/** 벤더별 순차 호출 사이에 삽입할 최소 지연 (알라딘 Crawl-delay 3~5초를 상회하는 보수적 값) */
export async function politeDelay(
  ms: number = MIN_REQUEST_INTERVAL_MS,
): Promise<void> {
  await sleep(ms);
}
