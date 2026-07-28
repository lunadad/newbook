import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fingerprintOf, getStateDir, readFingerprint, writeFingerprint } from "@/lib/jobs/changeGate";

let dir: string;
const originalStateDir = process.env.NEWBOOK_STATE_DIR;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "newbook-state-"));
  process.env.NEWBOOK_STATE_DIR = dir;
});

afterEach(async () => {
  if (originalStateDir === undefined) delete process.env.NEWBOOK_STATE_DIR;
  else process.env.NEWBOOK_STATE_DIR = originalStateDir;
  await rm(dir, { recursive: true, force: true });
});

describe("fingerprintOf", () => {
  it("같은 입력은 같은 지문, 다른 입력은 다른 지문", () => {
    expect(fingerprintOf(["1|가|"])).toBe(fingerprintOf(["1|가|"]));
    expect(fingerprintOf(["1|가|"])).not.toBe(fingerprintOf(["1|나|"]));
  });

  it("구분자 위치가 달라지면 다른 지문 — 항목 경계가 뭉개지지 않는다", () => {
    expect(fingerprintOf(["ab", "c"])).not.toBe(fingerprintOf(["a", "bc"]));
  });
});

describe("지문 저장소", () => {
  it("저장 전에는 null을 반환해 '변경됨'으로 취급되게 한다", async () => {
    await expect(readFingerprint("today-book_aladin")).resolves.toBeNull();
  });

  it("저장한 지문을 다시 읽는다", async () => {
    await writeFingerprint("today-book_aladin", "abc123");
    await expect(readFingerprint("today-book_aladin")).resolves.toBe("abc123");
  });

  it("벤더별로 지문이 섞이지 않는다", async () => {
    await writeFingerprint("today-book_aladin", "aaa");
    await writeFingerprint("today-book_kyobo", "bbb");
    await expect(readFingerprint("today-book_aladin")).resolves.toBe("aaa");
    await expect(readFingerprint("today-book_kyobo")).resolves.toBe("bbb");
  });

  it("파일명에 쓸 수 없는 키는 거부한다 — 경로 탈출 방지", async () => {
    await expect(readFingerprint("../escape")).rejects.toThrow(/파일명/);
  });

  it("NEWBOOK_STATE_DIR로 저장 위치를 바꿀 수 있다", () => {
    expect(getStateDir()).toBe(dir);
  });
});
