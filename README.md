# 오늘의 책 대시보드

예스24·교보문고·알라딘의 오늘의 책 / 문학 신상품 / 실시간 베스트셀러를 자동 수집해 보여주는 개인용 대시보드.

설계·계획 문서: [`docs/design.md`](docs/design.md), [`docs/plan.md`](docs/plan.md)

## 로컬 개발

```bash
npm install
npx playwright install --with-deps chromium   # 교보문고 CSR 파서(Playwright)에 필요

cp .env.example .env.local   # 값 채우기 (아래 참고)
npx drizzle-kit migrate      # DB 스키마 적용

npm run dev                  # http://localhost:3000
npm test                     # vitest (DATABASE_URL 없으면 DB 통합 테스트는 자동 skip)
```

로컬 Postgres로 개발하려면(Neon 없이도 스키마/쿼리 검증 가능):

```bash
brew install postgresql@16 && brew services start postgresql@16
createdb newbook_dev
DATABASE_URL=postgres://$(whoami)@localhost:5432/newbook_dev npx drizzle-kit migrate
```

스크래핑 잡을 직접 실행해 시딩하려면 (`.env.local`에 `INGEST_BASE_URL=http://localhost:3000`, `CRON_INGEST_SECRET` 설정 후 `npm run dev`를 별도 터미널에서 실행 중이어야 함):

```bash
npx tsx scripts/jobs/runBestsellers.ts
npx tsx scripts/jobs/runNewReleases.ts
npx tsx scripts/jobs/runTodayBook.ts
```

## 배포 전 필요한 외부 계정/설정 (`docs/plan.md` "착수 전 확인" 참고)

이 프로젝트 코드는 완성되어 있지만, 아래는 계정 소유자만 할 수 있는 작업이라 진행하지 못했습니다.

1. **Neon**: [neon.tech](https://neon.tech)에서 프로젝트 생성 → `DATABASE_URL`(쓰기 권한 커넥션 문자열) 발급
2. **GitHub**: 이 디렉토리를 **public** 저장소로 push (`gh auth login`으로 재인증 필요 — 현재 세션에서 `gh` 토큰이 만료된 상태였습니다)
3. **Vercel**: 저장소를 Vercel 프로젝트로 연결(git push 시 자동 배포) + **Blob Store** 생성 → `BLOB_READ_WRITE_TOKEN` 발급 (CLI는 이미 `miksnah-2526` 계정으로 로그인되어 있어 `vercel link` 등은 바로 가능)
4. **`CRON_INGEST_SECRET`**: 임의의 긴 랜덤 문자열 생성 (`openssl rand -hex 32`) → Vercel 환경변수 + GitHub Actions Secrets 양쪽에 동일하게 등록
5. **알라딘 TTBKey**: Vercel 배포 URL이 확정된 뒤 [알라딘 OpenAPI](https://blog.aladin.co.kr/openapi/) 페이지에서 "이용 사이트 URL"로 그 배포 URL을 등록해 발급 → `ALADIN_TTB_KEY`로 등록 (TTBKey 발급 전에는 알라딘 신상품/베스트셀러가 자동으로 스크래핑 폴백을 사용합니다 — `lib/scraping/aladinApi.ts`)
6. Vercel 환경변수(`DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `CRON_INGEST_SECRET`)와 GitHub Actions Secrets(`BLOB_READ_WRITE_TOKEN`, `CRON_INGEST_SECRET`, `ALADIN_TTB_KEY`, `INGEST_BASE_URL`=Vercel 배포 URL)를 각각 등록
7. 배포 후 `npx drizzle-kit migrate`(로컬에서 `DATABASE_URL`을 Neon 값으로 지정해 실행)로 프로덕션 DB에 스키마 적용
8. `.github/workflows/*.yml` 4개를 Actions 탭에서 `workflow_dispatch`로 1회씩 수동 실행해 정상 동작 확인

## 아키텍처

```
GitHub Actions (4개 워크플로우, 크론)
  → lib/scraping/*  (cheerio 정적 파싱 5종 + Playwright 2종 + 알라딘 OpenAPI/폴백)
  → lib/images/uploadCover.ts  (Vercel Blob 업로드)
  → POST /api/ingest/*  (Bearer 인증 → zod 검증 → Neon upsert, lib/ingest/upsert.ts)

Vercel (Next.js App Router)
  → app/(dashboard 4 pages)  서버 컴포넌트에서 Neon 직접 조회 (Drizzle ORM)
```

자세한 내용은 [`docs/design.md`](docs/design.md) §4(아키텍처)·§5(데이터 모델) 참고.
