import { timingSafeEqual } from "node:crypto";

/** Bearer 시크릿을 상수시간 비교로 검증한다(타이밍 공격 방지, design.md Phase 8). */
export function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_INGEST_SECRET;
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return false;

  const expectedBuf = Buffer.from(expected);
  const tokenBuf = Buffer.from(token);
  if (expectedBuf.length !== tokenBuf.length) return false;

  return timingSafeEqual(expectedBuf, tokenBuf);
}
