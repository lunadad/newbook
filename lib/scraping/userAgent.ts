/**
 * "Mozilla/5.0 (compatible; ...)" 접두사는 Googlebot 등이 쓰는 표준 식별 봇 UA 관용구다.
 * 접두사가 없으면 예스24 이벤트 서버가 UA를 스니핑해 302 에러 페이지로 보낸다(실측 확인).
 * 이름은 robots.txt가 차단하는 알려진 봇/스크래핑 도구명과 겹치지 않는 고유 문자열이다.
 */
export const SCRAPER_USER_AGENT =
  "Mozilla/5.0 (compatible; PersonalBookDashboard/1.0; +miksnah@gmail.com)";

/** 알라딘 robots.txt Crawl-delay(3~5초)를 상회하는 보수적 값. 3사 공통 적용. */
export const MIN_REQUEST_INTERVAL_MS = 6000;
