import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

/**
 * 스크래핑 결과가 직전 실행과 같은지 로컬 파일로 판별하는 게이트.
 *
 * 오늘의 책은 서점마다 갱신 시각이 제각각이고(실측: 같은 날에도 교보문고는 16시 이전,
 * 알라딘은 17시대에 바뀜) 예고 없이 바뀐다. 갱신 시각을 추측해 좁은 크론 창을 두면
 * 창 밖에서 바뀐 날은 다음 안전망(4시간 주기)까지 대시보드가 낡은 채로 남는다.
 * 그래서 창을 좁히는 대신 **상시 짧은 주기로 폴링**하되, 내용이 실제로 바뀐 실행에서만
 * ingest를 호출하도록 게이트를 둔다. 덕분에 폴링을 촘촘히 해도
 * DB 쓰기와 알림은 실제 갱신 횟수(하루 1~2회)만큼만 발생한다.
 *
 * 지문은 프로세스 밖(로컬 파일)에 둬야 한다 — 크론은 매 실행이 새 프로세스라
 * 메모리 상태로는 직전 실행과 비교할 수 없다.
 */
export function getStateDir(): string {
  return process.env.NEWBOOK_STATE_DIR ?? path.join(homedir(), ".newbook", "state");
}

/** 지문 문자열들을 하나의 짧은 해시로 접는다. 구분자는 본문에 나올 수 없는 NUL을 쓴다. */
export function fingerprintOf(parts: string[]): string {
  return createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0, 32);
}

function fileFor(key: string): string {
  if (!/^[a-z0-9_-]+$/i.test(key)) {
    throw new Error(`지문 키에 파일명으로 쓸 수 없는 문자가 있습니다: ${key}`);
  }
  return path.join(getStateDir(), `${key}.fp`);
}

/** 저장된 지문. 파일이 없으면(최초 실행·상태 유실) null — 호출부는 "변경됨"으로 취급해야 한다. */
export async function readFingerprint(key: string): Promise<string | null> {
  const file = fileFor(key); // 키 검증 예외가 아래 catch에 삼켜지지 않도록 try 밖에서 호출한다
  try {
    return (await readFile(file, "utf8")).trim() || null;
  } catch {
    return null;
  }
}

export async function writeFingerprint(key: string, fingerprint: string): Promise<void> {
  const file = fileFor(key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${fingerprint}\n`, "utf8");
}
