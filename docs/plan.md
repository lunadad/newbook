# 오늘의 책 대시보드 구현 계획

> 근거 설계 문서: `/Users/haluna/workspace/newbook/docs/design.md` · 작성일: 2026-07-23

## 착수 전 확인 (블로커)

- [ ] Neon 프로젝트 생성, `DATABASE_URL`(쓰기 권한 커넥션 문자열) 발급
- [ ] Vercel 프로젝트 생성 + Vercel Blob Store 생성 + `BLOB_READ_WRITE_TOKEN` 발급
- [ ] GitHub 저장소 생성(**public**으로 — design.md §0-6 가정) + Vercel와 연동(git push 시 자동 배포)
- [ ] 최초 Vercel 배포 URL(또는 확정된 커스텀 도메인) 확보 후, 알라딘 TTBKey(오픈API 인증키) 발급 — "이용 사이트/블로그 URL" 등록이 필요하므로 도메인 확정 전에는 신청 불가 (design.md §0-3)
- [ ] `CRON_INGEST_SECRET`(임의의 긴 랜덤 문자열) 생성 후 Vercel 환경변수와 GitHub Actions Secrets 양쪽에 동일한 값으로 등록
- [ ] 알라딘 OpenAPI 상세 매뉴얼(ItemList의 `QueryType`/`CID` 파라미터 값)을 TTBKey 발급 후 제공되는 문서에서 재확인 (design.md §0-4)

## 단계별 계획

> 각 단계는 "완료 기준"이 검증 가능해야 한다.

### Phase 1: 프로젝트 스캐폴딩 + DB/Blob 연결

- **변경 파일**: `package.json`, `tsconfig.json`, `next.config.ts`, `.env.example`, `.gitignore`, `drizzle.config.ts`, `db/client.ts`, `app/robots.ts`
- **작업**:
  - [ ] Next.js(App Router, TypeScript) 프로젝트 생성
  - [ ] 의존성 설치: `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`(마이그레이션), `zod`, `cheerio`, `playwright`, `sharp`, `@vercel/blob`
  - [ ] ORM으로 Drizzle 채택 — 근거: Neon 서버리스 드라이버와 공식 연동 예제가 풍부하고, 스키마가 5개 테이블뿐인 소규모 프로젝트에 Prisma의 코드젠·엔진 바이너리는 과함(YAGNI)
  - [ ] `db/client.ts`에서 `DATABASE_URL` 환경변수로 Neon 커넥션 생성
  - [ ] `.env.example`에 `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `CRON_INGEST_SECRET`, `ALADIN_TTB_KEY` 항목 기재(실제 값은 커밋하지 않음)
  - [ ] `app/robots.ts`에 전체 경로 `Disallow: /` 규칙 작성(design.md §9 — 공개 URL이지만 검색엔진 색인은 원치 않는다는 가정에 따른 선택적 조치)
- **완료 기준**: `next dev` 로컬 기동 성공, 더미 스크립트로 Neon에 `select 1` 왕복 성공, `/robots.txt` 접속 시 `Disallow: /` 확인

### Phase 2: DB 스키마 및 마이그레이션

- **변경 파일**: `db/schema.ts`, `db/migrations/0001_init.sql`(drizzle-kit 생성)
- **작업**:
  - [ ] design.md §5의 5개 테이블(`books`, `vendor_today_book`, `vendor_new_release`, `vendor_bestseller`, `scrape_run`)을 Drizzle 스키마로 정의
  - [ ] `drizzle-kit generate` → `drizzle-kit migrate`로 Neon에 반영
- **완료 기준**: Neon 콘솔에서 5개 테이블·제약조건(UNIQUE, CHECK) 생성 확인

### Phase 3: 공통 스크래핑 유틸

- **변경 파일**: `lib/scraping/httpClient.ts`, `lib/scraping/userAgent.ts`
- **작업**:
  - [ ] `httpClient.ts`: 커스텀 User-Agent(예: `PersonalBookDashboard/1.0 (+연락처 이메일; 개인 비상업 목적)`)를 기본으로 붙이는 `fetch` 래퍼 작성. 타임아웃(예: 10초)과 실패 시 1회 재시도 포함
  - [ ] User-Agent는 알려진 스크래핑 라이브러리 기본값(예: `Scrapy`, `python-requests`)이나 robots.txt에 명시적으로 차단된 봇 이름(`ClaudeBot`, `GPTBot`, `AhrefsBot` 등)과 겹치지 않도록 직접 명시 문자열 사용 — design.md §3-1/§7 및 실측 robots.txt 근거(알라딘은 Scrapy·HTTrack·Apify 등을 이름으로 명시 차단, 3사 모두 AI/SEO 크롤러를 이름으로 차단하지만 범용 `User-agent: *`는 대상 페이지들을 허용)
  - [ ] 요청 간 최소 지연(예: 1000ms 이상, 알라딘 robots.txt의 `Crawl-delay: 3~5`를 상회하는 보수적 값) — 벤더별 순차 호출 사이에 sleep 삽입
- **완료 기준**: 유닛 테스트로 User-Agent 헤더 값과 타임아웃 동작 확인

### Phase 4: SSR 페이지 파서 5종 (정적 파싱)

- **변경 파일**: `lib/scraping/yes24TodayBook.ts`, `lib/scraping/yes24NewProduct.ts`, `lib/scraping/yes24Bestseller.ts`, `lib/scraping/aladinWeekly.ts`, `lib/scraping/kyoboBestseller.ts`
- **작업**: (모두 `httpClient` + `cheerio`)
  - [ ] `yes24TodayBook.ts`: `https://event.yes24.com/todayBook` → 오늘의 책 슬롯별 {제목, 저자, 출판사, PD 코멘트, 날짜} 추출, 반환 타입 `NormalizedTodayBookItem[]`
  - [ ] `yes24NewProduct.ts`: `https://www.yes24.com/product/category/newproduct?categoryNumber=001001046` → 최대 30개 {순위, 제목, 저자, 출판사, 가격, 표지URL} 추출
  - [ ] `yes24Bestseller.ts`: `https://www.yes24.com/product/category/realtimebestseller?categoryNumber=001001046` → 상위 10개 추출
  - [ ] `aladinWeekly.ts`: `https://www.aladin.co.kr/weeklyeditorialmeeting/detail.aspx` → 오늘의 책(편집장의 선택) {제목, 저자, 출판사, MD 코멘트, 주차 라벨} 추출
  - [ ] `kyoboBestseller.ts`: `https://store.kyobobook.co.kr/bestseller/realtime?type=list` → 상위 10개 {제목, 저자, 출판사, 정가, 표지URL} 추출
  - [ ] 각 함수는 선택자 매칭 실패(추출 0건) 시 예외를 던져 상위 잡 스크립트가 `scrape_run.status='failed'`로 기록하게 함(design.md §7-#1)
- **완료 기준**: 각 파서를 실제 페이지에 대해 실행해 콘솔에 정상적인 배열 출력 확인, 결과를 `tests/fixtures/`에 HTML로 저장해 이후 Phase 13 유닛 테스트 픽스처로 재사용

### Phase 5: 알라딘 OpenAPI 클라이언트

- **변경 파일**: `lib/scraping/aladinApi.ts`
- **작업**:
  - [ ] TTBKey를 이용해 상품리스트 API(ItemList) 호출하는 클라이언트 작성: 신상품(`QueryType=ItemNewAll`, 문학 카테고리 CID) / 베스트셀러(`QueryType=Bestseller`, 문학 카테고리 CID 또는 국내도서 전체 후 필터)
  - [ ] 정확한 `QueryType`/`CID` 값은 착수 전 확인 블로커의 매뉴얼 재확인 결과를 반영해 확정(design.md §0-4)
  - [ ] API 실패(한도 초과·인증 오류) 시 `lib/scraping/aladinNewFallback.ts`(wnew.aspx 스크래핑, Phase 4와 동일한 cheerio 방식)로 폴백하는 옵션을 함수 인자로 노출(`{ preferApi: boolean }`)
- **완료 기준**: TTBKey 발급 후 실제 API 호출로 신상품·베스트셀러 목록이 JSON으로 정상 반환되는지 확인. 폴백 경로도 별도로 1회 수동 검증

### Phase 6: 교보문고 CSR 페이지 파서 2종 (Playwright)

- **변경 파일**: `lib/scraping/kyoboTodayBook.playwright.ts`, `lib/scraping/kyoboNewRelease.playwright.ts`, `playwright.config.ts`
- **작업**:
  - [ ] `kyoboTodayBook.playwright.ts`: `https://store.kyobobook.co.kr/today-book/domestic`을 헤드리스 Chromium으로 로드 → 국내도서 탭 기준으로 목록 렌더링 대기 후 DOM에서 {제목, 저자, 출판사, 가격, 표지URL, MD 코멘트} 추출. **기능1(오늘의 책)에만 사용**하며 기능2(문학 신상품)에는 재사용하지 않는다(design.md §0-2 — 교보문고 기능2 소스는 아래 `kyoboNewRelease.playwright.ts`로 통일)
  - [ ] `kyoboNewRelease.playwright.ts`: `https://store.kyobobook.co.kr/new/latest/domestic/01` 동일 방식으로 최대 30개 추출. **기능2(문학 신상품)의 교보문고 소스로 이것만 사용**(design.md §0-2)
  - [ ] 페이지 로드/셀렉터 대기 타임아웃 15초 명시(design.md §7-#5), 초과 시 예외
  - [ ] GitHub Actions 러너에서 Chromium 바이너리 설치 단계 필요(Phase 10 워크플로우에서 `playwright install --with-deps chromium` 실행)
- **완료 기준**: 로컬에서 두 스크립트를 headless 모드로 실행해 실제 도서 목록 출력 확인. GitHub Actions 러너 환경(Ubuntu)에서도 1회 수동 트리거(`workflow_dispatch`)로 동일하게 성공하는지 확인

### Phase 7: 표지 이미지 업로드 파이프라인

- **변경 파일**: `lib/images/uploadCover.ts`
- **작업**:
  - [ ] `ensureCoverUploaded(isbn13: string | null, sourceUrl: string | null): Promise<string | null>` 구현: ISBN이 있으면 Vercel Blob에서 해당 ISBN 경로(`covers/{isbn13}.webp`)가 이미 존재하는지 먼저 확인(`@vercel/blob`의 `head`/`list`) 후 있으면 재업로드 생략(중복 다운로드 방지, design.md §0-7 저장공간 절약)
  - [ ] 없으면 원본 이미지를 다운로드 → `sharp`로 리사이즈(예: 폭 320px)·webp 변환 → Blob에 업로드
  - [ ] 다운로드/업로드 실패 시 예외를 삼키고 `null` 반환(design.md §7-#3) — 상위 잡 스크립트는 이를 "표지 없음"으로 처리하고 계속 진행(전체 실패로 취급하지 않음)
- **완료 기준**: 임의의 이미지 URL로 로컬 실행 → Vercel Blob 대시보드에서 파일 생성 확인, 동일 ISBN 재실행 시 업로드 스킵(로그로 확인)

### Phase 8: Ingest API Routes

- **변경 파일**: `app/api/ingest/today-book/route.ts`, `app/api/ingest/new-releases/route.ts`, `app/api/ingest/bestsellers/route.ts`, `lib/ingest/schema.ts`, `lib/ingest/upsert.ts`
- **작업**:
  - [ ] `lib/ingest/schema.ts`: design.md §6의 공통 요청 바디를 zod 스키마로 정의(`vendor`, `scrapedAt`, `items[]`)
  - [ ] 각 `route.ts`: `Authorization: Bearer` 헤더를 `CRON_INGEST_SECRET`과 상수시간 비교(타이밍 공격 방지) → 불일치 시 401 → zod 파싱 실패 시 400
  - [ ] `lib/ingest/upsert.ts`: 트랜잭션 내에서 (1) `books`를 ISBN 우선, 없으면 title+author+publisher 폴백으로 upsert(design.md §7-#6) (2) 벤더별 목록 테이블을 `(vendor, rank/slot)` 기준 upsert (3) 이번 응답에 없는 기존 slot/rank 삭제 (4) `scrape_run`에 `item_count`와 함께, payload의 모든 item에 `coverBlobUrl`이 채워져 있으면 `status='success'`, 일부만 비어 있으면(표지 업로드 실패, design.md §7-#3) `status='partial'`로 기록
  - [ ] 처리 중 예외 발생 시 트랜잭션 롤백 + `scrape_run.status='failed'` 기록 후 500 반환
- **완료 기준**: `curl`로 목(mock) payload를 3개 엔드포인트에 각각 POST해 Neon에 반영 확인, 잘못된 Bearer 값으로 401 확인, 스키마 위반 payload로 400 확인

### Phase 9: 잡 스크립트 (워크플로우 진입점)

- **변경 파일**: `scripts/jobs/runTodayBook.ts`, `scripts/jobs/runNewReleases.ts`, `scripts/jobs/runBestsellers.ts`, `lib/ingest/client.ts`
- **작업**:
  - [ ] `lib/ingest/client.ts`: ingest API에 POST하는 공용 함수(`postIngest(jobType, vendor, items)`), 실패 시 재시도 1회 후 프로세스 종료 코드 1로 종료
  - [ ] `runTodayBook.ts`: 3사(예스24 §Phase4, 교보문고 §Phase6, 알라딘 §Phase4) 순차 실행 → 각 결과에 대해 `ensureCoverUploaded` → `postIngest('today-book', vendor, items)`. 벤더 하나가 실패해도 나머지 벤더는 계속 진행(부분 실패 허용, design.md §7-#1)
  - [ ] `runNewReleases.ts`: 3사(예스24 `yes24NewProduct.ts` §Phase4, 교보문고 `kyoboNewRelease.playwright.ts` §Phase6, 알라딘 §Phase5 API 우선) 동일 패턴, 각 최대 30개로 절단
  - [ ] `runBestsellers.ts`: 3사(예스24·교보문고 §Phase4, 알라딘 §Phase5 API 우선) 동일 패턴, 상위 10개로 절단
  - [ ] 화/금 고빈도 실행을 위해 `runTodayBook.ts`에 `--poll=highfreq` 플래그를 추가: 지정되면 스크립트 내부에서 컷오프 시각을 **그날(UTC) 10:00, 즉 19:00 KST로 하드코딩 계산**(별도 CLI 인자·YAML 계산 불필요, `new Date()`의 UTC 날짜에 `10:00:00Z`를 결합해 산출)하고, 컷오프까지 교보문고·알라딘 결과를 이전 실행과 비교(제목 목록 diff)해 변경이 없으면 60초 대기 후 재시도, 변경 감지 시 즉시 ingest 후 종료. 플래그 없이 실행되면(평상시 워크플로우) 즉시 1회만 수집하고 종료
- **완료 기준**: 각 스크립트를 로컬에서 `tsx scripts/jobs/runX.ts`로 실행해 종료 코드 0과 함께 대시보드 페이지(Phase 11 완료 후)에서 데이터 반영 확인. `--poll=highfreq`는 시스템 시각을 컷오프 이후로 바꿔(또는 컷오프 계산 함수를 목(mock)해) 즉시 1회 실행 후 종료되는지로 로직 검증

### Phase 10: GitHub Actions 워크플로우

- **변경 파일**: `.github/workflows/today-book-normal.yml`, `.github/workflows/today-book-highfreq.yml`, `.github/workflows/new-releases.yml`, `.github/workflows/bestsellers.yml`
- **작업**:
  - [ ] `today-book-normal.yml`: `schedule: [{cron: '0 23 * * *'}, {cron: '0 11 * * *'}]`(각각 08:00·20:00 KST) + `workflow_dispatch`. `runTodayBook.ts` 실행(폴링 옵션 없이 1회)
  - [ ] `today-book-highfreq.yml`: `schedule: [{cron: '25 9 * * 2,5'}]`(화·금 18:25 KST) + `workflow_dispatch`. `timeout-minutes: 40` 명시. `runTodayBook.ts --poll=highfreq` 실행(스크립트 내부에서 19:00 KST 하드 컷오프까지 자체 루프, Phase 9 참조)
  - [ ] `new-releases.yml`: `schedule: [{cron: '*/30 * * * *'}]` + `workflow_dispatch`. `runNewReleases.ts` 실행
  - [ ] `bestsellers.yml`: `schedule: [{cron: '0 * * * *'}]` + `workflow_dispatch`. `runBestsellers.ts` 실행
  - [ ] 4개 워크플로우 공통: Node.js 설치 → `npm ci` → (Playwright 필요한 `today-book-*`에 한해) `npx playwright install --with-deps chromium` → 잡 스크립트 실행. 환경변수로 `BLOB_READ_WRITE_TOKEN`, `CRON_INGEST_SECRET`, `ALADIN_TTB_KEY`, `INGEST_BASE_URL`(Vercel 배포 URL)을 GitHub Secrets에서 주입
  - [ ] GitHub Actions `schedule` 트리거는 5분이 최소 간격이며 부하 시 지연될 수 있음(design.md §3-4) — 워크플로우 YAML 상단 주석으로 이 제약과 "1분 폴링은 잡 내부 루프로 구현됨"을 명시해 향후 유지보수자가 오해하지 않도록 함
- **완료 기준**: 4개 워크플로우 모두 `workflow_dispatch`로 최소 1회 수동 실행 성공(Actions 탭에서 초록 체크 확인). `today-book-highfreq.yml`은 실제 화/금 18:25 KST 자동 기동을 1회 이상 관찰

### Phase 11: 대시보드 화면

- **변경 파일**: `app/page.tsx`, `app/today-book/page.tsx`, `app/new-releases/page.tsx`, `app/bestsellers/page.tsx`, `app/layout.tsx`, `components/Header.tsx`, `components/VendorCard.tsx`, `components/RankTable.tsx`, `components/VendorTabs.tsx`, `app/globals.css`
- **작업**:
  - [ ] `app/globals.css` 또는 Tailwind 설정에 design.md §6의 디자인 토큰 반영: Pretendard Variable 폰트(npm `pretendard` 패키지로 self-host), 중성 그레이 팔레트 + 블루 강조색, 라운드 12~16px, `prefers-color-scheme` 다크모드
  - [ ] `app/page.tsx`(홈): 3사 오늘의 책 요약 + 섹션별 `StatusBadge`(Phase 12) + 다른 화면 링크. Neon에서 서버 컴포넌트로 직접 조회(Drizzle)
  - [ ] `app/today-book/page.tsx`: 3사 `VendorCard` 그리드
  - [ ] `app/new-releases/page.tsx`, `app/bestsellers/page.tsx`: `VendorTabs` + `RankTable`(최대 30 / 상위 10)
  - [ ] 모든 페이지 `export const dynamic = 'force-dynamic'`(또는 `revalidate = 60`) — 크론이 데이터를 갱신하므로 빌드 시점 정적 캐시에 의존하지 않음
- **완료 기준**: Vercel Preview 배포에서 4개 화면 모두 실제 Neon 데이터로 렌더링 확인, 라이트/다크 모드 육안 확인, 좁은 화면(모바일 폭)에서 표가 자체 스크롤 컨테이너 안에 담기는지 확인

### Phase 12: 상태 배지 / 부분 실패 표시

- **변경 파일**: `components/StatusBadge.tsx`, `lib/status.ts`
- **작업**:
  - [ ] `lib/status.ts`: `scrape_run`에서 `(job_type, vendor)`별 최신 레코드를 조회해 `finished_at`이 기대 주기(오늘의 책 12시간 / 신상품 30분 / 베스트셀러 1시간)의 2배를 넘으면 `'stale'`, 최신 레코드가 `status='failed'`면 `'failed'`, `status='partial'`이면 `'ok'`(단 "일부 표지 누락" 메시지 동봉), 그 외(`'success'`)면 `'ok'` 반환
  - [ ] `StatusBadge.tsx`: 위 상태를 색상 배지(초록/주황/빨강)로 렌더링, hover 시 마지막 갱신 시각 텍스트 표시
- **완료 기준**: `scrape_run`에 수동으로 오래된/실패 레코드를 넣어 각 배지 상태가 올바르게 전환되는지 확인

### Phase 13: 테스트

- **변경 파일**: `vitest.config.ts`, `tests/scrapers/*.test.ts`, `tests/api/ingest.test.ts`, `tests/fixtures/*.html`
- **작업**:
  - [ ] 테스트 러너로 vitest 채택 — 근거: Next.js/TS 프로젝트에서 별도 babel 설정 없이 바로 동작, 개인 프로젝트 규모에 충분(YAGNI, Jest 대비 설정 최소)
  - [ ] Phase 4·6에서 확보한 실제 페이지 HTML을 `tests/fixtures/`에 저장해 각 파서 함수의 유닛 테스트 작성(픽스처 입력 → 기대 필드 개수/타입 검증)
  - [ ] `tests/api/ingest.test.ts`: 로컬 Postgres(또는 Neon 브랜치)에 대해 mock payload로 upsert/삭제/`scrape_run` 기록 통합 테스트
- **완료 기준**: `npm test` 전체 통과

### Phase 14: 배포 및 실측 검증

- **변경 파일**: 없음(운영 확인 단계)
- **작업**:
  - [ ] Vercel 프로덕션 배포, GitHub Actions Secrets 최종 확인
  - [ ] design.md §8의 "수동 확인 항목" 전체 수행(화/금 고빈도 실측, 실패 이메일 확인, 401 로그 확인, 라이트/다크 모드 확인)
- **완료 기준**: 4개 화면 프로덕션 URL에서 정상 표시, 최소 1회의 화/금 고빈도 사이클 관찰 완료

## 축소안

시간 부족 시 최소 동작 버전: **Phase 1~5, 7~9(알라딘은 API 경로만), 10(고빈도 워크플로우 제외), 11~12, 14**까지 — 교보문고 CSR 파서(Phase 6)와 화/금 고빈도 워크플로우(Phase 10 일부)를 뒤로 미루고, Phase 13(테스트)은 Phase 4에서 만든 픽스처 기반 파서 테스트만 남긴다.

이유: 교보문고 CSR 파서(Phase 6, Playwright)는 설치·유지보수 비용이 가장 크고 실패 시 대시보드 전체를 막지 않는 벤더 단위 기능이므로 가장 먼저 미룰 수 있다(교보문고 베스트셀러는 SSR이라 Phase 4에 포함되어 정상 동작 유지하므로, 축소판에서도 교보문고 베스트셀러는 표시됨). 표지 이미지 업로드(Phase 7)는 사용자가 명시적으로 확정한 요구사항(Vercel Blob 저장)이므로 축소안에서도 제외하지 않는다. 화/금 고빈도 워크플로우(Phase 10 일부)도 "그 외 시간 하루 2회 체크"라는 평상시 워크플로우로 대체 가능한 부가 정밀도이므로 후순위로 미룰 수 있다. Phase 14(배포·실측 검증)는 축소판에서도 실제 동작 확인을 위해 그대로 수행하되, 검증 항목 중 화/금 고빈도 관련 항목만 제외한다.

## 리스크

| 리스크 | 영향 | 대응 |
|---|---|---|
| 알라딘 TTBKey 발급이 배포 도메인 확정 이후에나 가능해 일정이 지연됨 | Phase 5(알라딘 API) 착수 지연 | 도메인 확정 즉시(Phase 1 직후) 발급 신청을 병행 진행, 승인 전에는 Phase 5의 wnew.aspx/wbest.aspx 스크래핑 폴백(`aladinNewFallback.ts`)으로 임시 구현 후 API로 교체 |
| GitHub Actions `schedule` 트리거 자체가 지연됨(공식적으로 5~30분 지연 가능) | 화/금 18:25 킥오프가 밀려 고빈도 폴링 시작이 늦어짐 | 설계 문서에 리스크로 명시(design.md §3-4), 킥오프 cron을 18:20으로 5분 앞당겨 완충, 대시보드 `StatusBadge`로 지연을 사용자가 인지 가능하게 함 |
| 교보문고 Next.js 빌드/DOM 구조 변경으로 Playwright 선택자가 대량 실패 | 교보문고 오늘의 책·신상품 기능 중단 | 텍스트/역할 기반의 느슨한 선택자 사용, 실패 시 기존 데이터 유지 + `scrape_run` 실패 기록(design.md §7-#1, #5)으로 조기 인지 |
| Neon(0.5GB)·Vercel Blob(1GB) 무료 한도 초과 | 신규 데이터 저장/이미지 업로드 실패 | "최신 스냅샷만 보관" 구조 유지(설계 §0-7), 운영 중 사용량 모니터링, 필요 시 오래된 미참조 `books` 행 수동 정리 또는 유료 플랜 전환 |
| 3사 중 한 곳이 이후 robots.txt·이용약관을 더 엄격하게 변경하거나 접근을 차단 | 해당 벤더 수집 전면 중단 | 벤더별 스크래퍼가 독립 모듈(design.md §4)이라 개별 비활성화가 용이 — 문제 벤더만 끄고 나머지 2사는 정상 서비스 유지 |
