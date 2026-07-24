/**
 * 화/금 고빈도 폴링 루프의 상태 기계.
 *
 * 실제 스크래핑/ingest/대기를 주입받아 순수하게 흐름만 담당한다 —
 * 실서비스 사이트가 갱신되기를 기다리지 않고도 동작을 검증할 수 있게 하기 위함
 * (tests/jobs/highfreqPoll.test.ts).
 */
export interface HighfreqPollOptions<V extends string, T> {
  vendors: V[];
  scrape: (vendor: V) => Promise<T[]>;
  /** 비교에 쓸 지문(제목 목록 등)을 만든다 */
  fingerprint: (items: T[]) => Set<string>;
  ingest: (vendor: V, items: T[]) => Promise<void>;
  /** 폴링을 유지할 시간(잡 시작 시점 기준, ms) */
  windowMs: number;
  /** 재확인 간격(ms) */
  intervalMs: number;
  /** 벤더 간 예의 지연 */
  politeDelay: () => Promise<void>;
  sleep: (ms: number) => Promise<void>;
  now?: () => number;
  log?: (message: string) => void;
  onError?: (vendor: V, err: unknown) => void;
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  return a.size === b.size && [...a].every((t) => b.has(t));
}

export interface HighfreqPollResult<V extends string> {
  /** 변경이 감지돼 폴링을 마친 벤더 */
  changed: V[];
  /** 폴링 창이 끝날 때까지 변경이 없던 벤더 */
  unchanged: V[];
  iterations: number;
}

export async function runHighfreqPoll<V extends string, T>(
  options: HighfreqPollOptions<V, T>,
): Promise<HighfreqPollResult<V>> {
  const {
    vendors,
    scrape,
    fingerprint,
    ingest,
    windowMs,
    intervalMs,
    politeDelay,
    sleep,
    now = () => Date.now(),
    log = () => {},
    onError = () => {},
  } = options;

  const deadline = now() + windowMs;
  const pending = new Set<V>(vendors);
  const lastSeen = new Map<V, Set<string>>();
  const changed: V[] = [];
  let iterations = 0;

  while (pending.size > 0 && now() < deadline) {
    iterations += 1;
    for (const vendor of [...pending]) {
      try {
        const items = await scrape(vendor);
        const current = fingerprint(items);
        const previous = lastSeen.get(vendor);

        if (!previous) {
          // 최초 관측: 곧바로 반영해 두고(지연 기동 시 이미 갱신된 데이터일 수 있음)
          // 기준선으로도 기록한 뒤 폴링을 계속한다. upsert는 멱등이라 중복 반영은 무해.
          await ingest(vendor, items);
          lastSeen.set(vendor, current);
        } else if (!setsEqual(previous, current)) {
          log(`${vendor}: 변경 감지`);
          await ingest(vendor, items);
          pending.delete(vendor);
          changed.push(vendor);
        }
      } catch (err) {
        onError(vendor, err);
      }
      await politeDelay();
    }

    if (pending.size > 0 && now() < deadline) {
      await sleep(intervalMs);
    }
  }

  return { changed, unchanged: [...pending], iterations };
}
