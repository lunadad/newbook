# 오늘의 책 대시보드 설계 문서

> 작성일: 2026-07-23 · 작성 세션: 예스24/교보문고/알라딘 3사 도서 정보를 자동 수집해 보여주는 개인용 웹 대시보드 설계 (구현 없음, 설계·계획 문서만 산출)

## 0. 가정 및 확인 필요

> 사용자에게 확인받지 못한 모든 가정. 근거는 본문에 상술.

1. **예스24 "오늘의 책" 갱신 주기 미명시 → 하루 2회(08:00, 20:00 KST) 확인을 기본값으로 채택.** 근거: 실측 결과 `event.yes24.com/todayBook` 페이지는 "오늘의 책 1~4"를 주 단위로 갱신하는 아카이브 구조(2013년부터 "n월 n주차" 목록 보유)로 보이나, 정확한 요일·시각 규칙은 페이지에 명시되어 있지 않았다. 과도한 폴링을 피하면서 반나절 이내 지연으로 갱신을 포착하기 위한 절충안. 실제 갱신 패턴이 확인되면 주기를 조정해야 한다.
2. **교보문고 "오늘의 책"(기능1)과 "MD 추천도서"(기능2 원문 병기 URL)는 동일 URL·동일 페이지이며, 별도 DOM 섹션 구분이 없음을 실측으로 확인.** `store.kyobobook.co.kr/today-book/domestic`은 페이지 타이틀이 "오늘의 선택"이고, "MD들이 함께 투표해 고른, 이번 주 가장 추천하는 책이에요"라는 설명과 카테고리 필터(소설/시-에세이/인문 등)만 있을 뿐 "오늘의 책"과 "MD 추천"을 구분하는 별도 섹션은 없다. 한편 기능2 요구사항에는 이 URL과 별개로 "교보문고 문학 신상품"(`new/latest/domestic/01`)이라는 **또 다른 URL도 함께 제시**되어 있다. 즉 교보문고만 기능2에 잠재적으로 2개의 소스(MD 추천 피드, 신상품 피드)를 가진 셈이라 예스24·알라딘(각 1개 소스)과 비대칭이 된다. 이를 해소하기 위해 **기능2의 교보문고 데이터 소스는 `new/latest/domestic/01`(문학 신상품 전용 페이지) 하나로 통일**하고, `today-book/domestic`(MD 추천 = 오늘의 책과 동일 피드)은 기능1 화면에서만 노출하며 기능2에 중복 노출하지 않는 것으로 설계했다. 근거: (a) 이렇게 하면 3사 모두 "신상품 전용 URL 1개"라는 대칭 구조가 되고 (b) MD 추천 피드를 기능2에도 노출하면 기능1과 완전히 동일한 정보가 두 화면에 중복 표시된다. 사용자의 원래 의도(정말 교보문고만 기능2에 2개 소스를 다 원했는지)를 확인받지 못했다.
3. **알라딘 TTBKey(오픈API 인증키) 발급은 배포 도메인 확정 후 사용자가 직접 진행해야 하는 외부 의존.** TTBKey는 회원가입 후 "이용 사이트/블로그 URL"을 등록해야 발급되며, 이 프로젝트의 Vercel 배포 URL(또는 커스텀 도메인)이 정해지기 전에는 발급 절차를 완료할 수 없다. plan.md의 "착수 전 확인" 블로커로 기록했다.
4. **알라딘 상품리스트 API(ItemList)의 정확한 `QueryType`/`CID`(카테고리 ID) 값은 이번 조사에서 확정하지 못했다.** 공개된 이용약관·한도 안내 페이지(`blog.aladin.co.kr/openapi/`, `.../5353304`)에는 "신간 전체 리스트, 편집자 추천 리스트, 베스트셀러" 등이 제공된다고만 명시되어 있고, 파라미터 상세 매뉴얼 페이지는 이번 조사 범위에서 확인하지 못했다. TTBKey 발급 후 제공되는 상세 매뉴얼을 구현 단계에서 재확인해야 한다.
5. **ant.wiki 디자인 분석은 정적 HTML/CSS 번들 분석(폰트·색상·라운드값 추출)에 근거하며, 실제 브라우저 렌더링 스크린샷으로 검증하지 않았다.** 레이아웃 배치의 세부 뉘앙스(여백, 반응형 브레이크포인트 등)는 근사치다.
6. **GitHub 저장소는 public으로 가정한다.** 사용자가 이미 대시보드 자체를 "공개, 인증 없음"으로 확정했고, GitHub Actions는 public 저장소에서 실행 시간이 무제한 무료이지만 private 저장소는 무료 티어 월 2,000분으로 제한된다(§7 리스크 참조). 이 프로젝트의 크론 실행 빈도(30분·1시간 간격 상시 + 화/금 고빈도)는 private 저장소 무료 한도를 초과할 가능성이 높으므로 public 저장소를 전제로 설계했다.
7. **Neon(0.5GB 저장공간)·Vercel Blob(1GB 저장공간) 무료 티어 한도를 넘지 않도록 "최신 스냅샷만 보관"(이력 미보관) 구조를 채택.** 관리 대상 규모를 "오늘의 책 3사 × 소수 + 문학 신상품 3사 × 최대 30 + 베스트셀러 3사 × 10 ≈ 200권 이하(중복 도서 제외 시 더 적음)"로 가정했다. 실제 도서 수·표지 이미지 용량이 이보다 크면 한도를 초과할 수 있다.
8. **크론 실행 시각(하루 2회 시각, 신상품/베스트셀러 오프셋 등)은 사용자가 특정 시각을 지정하지 않아 임의로 정했다.** §6 크론 스케줄표 참조.

## 1. 개요

- **목적**: 예스24·교보문고·알라딘 3사의 "오늘의 책"/문학 신상품/실시간 베스트셀러를 한 화면에서 모니터링할 수 있는 개인용 대시보드를 만든다.
- **대상 사용자**: 사용자 본인 1인 (비공개 사용이 아니라 접근 권한은 공개·인증 없음이지만, 실제 사용자는 본인으로 한정).
- **성공 기준**:
  - 오늘의 책(3사), 문학 신상품(3사, 최대 30개), 실시간 베스트셀러(3사, 상위 10위)가 대시보드에서 조회 가능하다.
  - 각 데이터가 명시된 갱신 주기(오늘의 책: 하루 2회 + 화/금 고빈도 / 신상품: 30분 / 베스트셀러: 1시간) 이내로 자동 갱신된다.
  - 표지 이미지가 Vercel Blob에 저장되어 대시보드에 표시된다.
  - 스크래핑 실패·크론 누락 시에도 대시보드가 깨지지 않고 "최근 갱신 시각" 등으로 상태를 알 수 있다.
- **앱 유형**: 웹

## 2. 범위

| 포함 (MVP) | 제외 (이번에 안 함) |
|---|---|
| 3사 "오늘의 책" 수집·표시 (화/금 고빈도 폴링 포함) | 히스토리(과거 스냅샷) 열람 화면 — 최신 상태만 보관 |
| 3사 문학 신상품 최대 30개 표 (30분 갱신) | 사용자 인증/개인화(찜, 알림 등) |
| 3사 실시간 베스트셀러 상위 10위 (1시간 갱신) | 이메일/슬랙 등 별도 알림 채널 (GitHub 기본 실패 메일에 의존) |
| 표지 이미지 다운로드 → Vercel Blob 저장 | 표지 이미지 자동 정리(orphan cleanup) 자동화 — 리스크로만 기록 |
| 스크래핑/크론 실패 시 대시보드 상태 배지 표시 | 관리자 화면(수동 재수집 트리거 UI) |
| GitHub Actions cron 기반 자동 수집 파이프라인 | 검색/필터/정렬 등 인터랙티브 UI 고도화 |

## 3. 접근법 비교

### 3-1. 데이터 소스: 스크래핑 vs 공식 API (사이트별)

**알라딘**

| 접근법 | 장점 | 단점 | 선택 |
|---|---|---|---|
| A. HTML 스크래핑(wnew.aspx, wbest.aspx) | 모든 데이터를 동일 방식으로 획득, API 파라미터 조사 불필요 | ToS/robots 상 우회적 수집, 사이트 구조 변경에 취약, 알라딘이 명시적으로 스크래핑 도구(Scrapy, HTTrack 등)를 robots.txt에서 차단 중(§3-5 참조) | |
| B. 공식 OpenAPI(ItemList, QueryType=Bestseller/ItemNewAll) | 공식 채널이라 ToS 리스크 최소, 응답이 구조화 JSON이라 파싱 안정적, 하루 5,000회 무료 한도로 충분 | TTBKey 발급(사이트 등록) 필요, 정확한 CID/QueryType 값은 구현 단계 재확인 필요(§0-4) | ✅ (문학 신상품·베스트셀러) |

실측 결과 `weeklyeditorialmeeting/detail.aspx`("오늘의 책" 소스)는 API 문서(`blog.aladin.co.kr/openapi/`)에 관련 언급이 없어 API 커버리지 밖으로 판단, 이 페이지만 스크래핑을 유지한다(아래 3-2에서 렌더링 방식도 확인).

**예스24 / 교보문고**

웹 검색 결과 예스24·교보문고는 공식 오픈API를 제공한다는 근거를 찾지 못했다. (교보문고 검색 결과 중 "오픈 API를 활용한 매쉬업 가이드"는 교보문고가 *판매하는 책 상품*의 제목일 뿐, 교보문고 자체 API가 아님을 확인했다.) 따라서 두 서점은 3개 기능 모두 스크래핑을 전제로 한다.

### 3-2. 스크래핑 엔진: 정적 파싱(fetch+cheerio) vs 헤드리스 브라우저(Playwright)

9개 대상 페이지를 각각 `curl`로 원문 HTML을 받아 스크립트/스타일을 제거한 뒤 실제 텍스트(도서명·저자·가격 등)가 최초 응답에 포함되는지 실측했다.

| 대상 | 실측 결과 | 근거 |
|---|---|---|
| 예스24 오늘의 책(`event.yes24.com/todayBook`) | **SSR** | 원문 HTML에 도서명·PD 코멘트·발행일("2026.07.21 소설/시 PD 김유리")이 그대로 포함됨 |
| 예스24 문학 신상품(`newproduct`) | **SSR** | 원문 HTML에 도서명·가격·판매지수가 포함됨 |
| 예스24 실시간 베스트셀러(`realtimebestseller`) | **SSR** | 텍스트 추출 결과 37,123자, 도서 목록 포함 |
| 교보문고 오늘의 선택(`today-book/domestic`, 기능1·2 공용) | **CSR** | Next.js App Router 빌드(`_next/static/chunks/...`)만 로드되고, 스크립트 제거 후 텍스트가 1,292자에 불과(카테고리 필터명뿐, 도서 정보 없음) |
| 교보문고 문학 신상품(`new/latest/domestic/01`) | **CSR** | 동일하게 텍스트 1,001자, 도서 정보 없음 |
| 교보문고 실시간 베스트셀러(`bestseller/realtime`) | **SSR** | 텍스트 18,476자, 도서명·정가·리뷰 수 등이 원문 HTML에 포함(같은 사이트 내에서도 라우트별로 렌더링 방식이 다름) |
| 알라딘 주간편집회의(오늘의 책) | **SSR** | MD 코멘트 전문까지 원문 HTML에 포함 |
| 알라딘 문학 신상품(`wnew.aspx`) | **SSR** (참고용, API 우선) | 도서 목록이 원문 HTML에 포함되어 있어 API 실패 시 폴백 스크래핑 가능 |
| 알라딘 실시간 베스트셀러(`wbest.aspx`) | **SSR** (참고용, API 우선) | 상동 |

| 접근법 | 장점 | 단점 | 선택 |
|---|---|---|---|
| A. 정적 파싱(fetch + cheerio) | 가볍고 빠름, GitHub Actions 실행 분(分) 소모 최소, 헤드리스 브라우저 설치 불필요 | JS 렌더링이 필요한 페이지에는 무용 | ✅ SSR로 확인된 7개 대상(예스24 3개, 교보문고 베스트셀러, 알라딘 3개) |
| B. 헤드리스 브라우저(Playwright) | CSR 페이지도 대응 가능 | 무겁고 느림, GitHub Actions 실행 분 소모 증가, Chromium 설치 필요 | ✅ CSR로 확인된 2개 대상(교보문고 오늘의 선택, 교보문고 문학 신상품)에 한정 |

**선택 근거**: 대상별 실측 결과가 명확히 갈리므로 전면 Playwright 채택은 불필요(YAGNI)하고, 전면 정적 파싱은 교보문고 2개 페이지에서 동작하지 않는다. 페이지별로 혼합 적용하는 것이 실행 비용과 안정성 양쪽에서 최적이다.

### 3-3. 프레임워크/배포 스택

| 접근법 | 장점 | 단점 | 선택 |
|---|---|---|---|
| A. Next.js (App Router, Vercel 네이티브) | Vercel Blob·Vercel Postgres/Neon 연동 문서와 SDK가 풍부, App Router Route Handler로 크론 수신용 API를 같은 프로젝트 안에서 구현 가능, 대시보드 페이지와 API가 한 배포 단위 | 서버리스 함수 실행시간 제한(Hobby 플랜) — 단, 본 설계에서는 스크래핑을 GitHub Actions에서 수행하고 Vercel은 저장만 담당하므로 실질적 제약 아님(§4, §3-4) | ✅ |
| B. Astro + 별도 API 서버 | 정적 콘텐츠 위주 사이트에 최적화, 페이지 자체는 매우 가벼움 | 이 프로젝트는 DB 조회 기반 동적 대시보드 + 크론 수신 API가 핵심이라 Astro의 정적 우선 장점을 살리기 어려움, Vercel Blob/Neon 연동 사례가 Next.js 대비 적어 참고 자료 부족, 별도 API 서버를 두면 배포 단위가 2개로 늘어 개인 프로젝트 유지보수 부담 증가 | |

**선택 근거**: 개인용 소규모 프로젝트에서 배포 단위를 하나로 유지하고, Vercel 생태계(Blob·Neon·크론 트리거 수신)와의 통합 문서가 가장 풍부한 Next.js를 선택한다.

### 3-4. 크론 → DB 반영 파이프라인

| 접근법 | 장점 | 단점 | 선택 |
|---|---|---|---|
| A. GitHub Actions가 Neon에 직접 접속해 쓰기 | 중간 단계 없이 단순 | Neon 쓰기 권한 커넥션 문자열과 Vercel Blob 쓰기 토큰을 모두 GitHub Secrets(퍼블릭 저장소의 CI 환경)에 두어야 함 → 유출 시 DB 전체가 노출되는 넓은 피해 범위, 검증/중복제거 로직이 스크래핑 스크립트에 흩어짐 | |
| B. GitHub Actions는 스크래핑·이미지 업로드만 수행 → Vercel API Route(Bearer 토큰 인증)가 최종 DB 쓰기 담당 | Neon 커넥션 문자열은 Vercel 환경변수에만 존재(GitHub에 노출 안 됨), GitHub에는 "Blob 쓰기 토큰"과 "수집용 공유 시크릿"만 필요(유출 시 피해 범위가 이미지 저장소·수집 API 호출로 한정), 검증/중복제거 로직이 API Route 한 곳에 집중되어 향후 수동 재수집에도 재사용 가능 | Vercel Route가 인터넷에 노출되는 인증 엔드포인트가 되므로 별도 인증(Bearer 시크릿 비교)을 반드시 구현해야 함 | ✅ |

**선택 근거**: 개인 프로젝트라도 GitHub Actions(퍼블릭 저장소, 서드파티 액션 포함)는 Vercel 환경변수보다 비밀정보 노출 표면이 넓다고 보고, DB 쓰기 권한이 있는 시크릿은 Vercel에만 두는 B안을 택한다. 표지 이미지는 GitHub Actions가 다운로드 후 곧바로 Vercel Blob에 업로드(Blob 전용 토큰만 GitHub에 부여)하고, 최종적으로 Blob URL·구조화 도서 데이터를 Vercel API Route에 POST해 Neon에 upsert한다.

**화/금 고빈도 폴링과 평상시 폴링의 워크플로우 분리**: GitHub Actions `schedule` 트리거는 **5분이 최소 간격**이며(1분 간격 cron은 플랫폼이 무시하고 5분으로 강제 실행됨 — 공식 변경사항), 요청하신 "1분 간격 재확인"을 네이티브 크론만으로는 만들 수 없다. 이를 해결하기 위해 화/금 전용 워크플로우 1개를 두고, 이 워크플로우는 **`schedule`로 18:25 KST에 한 번만 기동된 뒤, 잡(Job) 내부에서 `sleep 60`을 사용한 셸 루프로 19:00 KST까지 매 60초 간격으로 재확인**하는 방식을 쓴다(§6 참조). 평상시(그 외 요일/시간)는 별도의 저빈도 워크플로우가 하루 1~2회만 확인한다.

### 3-5. 법적/ToS 리스크 및 완화책

3사 `robots.txt`를 직접 조회해 실측한 결과(엔지니어링 리스크 완화 관점의 조사이며 법률 자문이 아님):

- **예스24**(`www.yes24.com`, `event.yes24.com`): 범용 `User-agent: *`는 회원/결제/내부 모듈 등 일부 경로만 `Disallow`하고, 이번 프로젝트가 스크래핑할 상품·이벤트 목록 경로는 막지 않는다. 다만 `ClaudeBot`, `GPTBot`, `AhrefsBot`, `SemrushBot` 등 이름이 명시된 AI/SEO 크롤러는 전면 차단한다.
- **교보문고**(`store.kyobobook.co.kr`): 범용 `*`는 `Allow: /`이며 `Disallow: /api/gw`(프런트엔드가 내부적으로 쓰는 API 게이트웨이 경로)만 명시 차단. `ClaudeBot`, `GPTBot` 등은 이름으로 전면 차단. 이는 **CSR 페이지를 직접 내부 API 호출로 우회하지 말고, 반드시 Playwright로 브라우저가 실제로 렌더링하는 화면을 읽으라는 근거**가 된다(§3-2 선택과 일치).
- **알라딘**(`www.aladin.co.kr`): 여러 Tier로 구성되어 있으며, 이름이 명시된 AI/검색 크롤러(Tier1·2)는 `Crawl-delay: 3~5`로 허용, **잘 알려진 스크래핑 도구/라이브러리(`Scrapy`, `HTTrack`, `Apify`, `Diffbot`, `AhrefsBot`, `MJ12bot` 등, Tier4·5)는 이름으로 전면 차단**, 마지막 `Fallback` 규칙(`User-agent: *` → `Allow: /`)이 그 외 모든 UA를 허용한다.

**완화책(3사 공통 적용)**:
1. 스크래퍼의 User-Agent를 각 라이브러리 기본값(`node-fetch`, `axios`, `Scrapy` 등)이 아닌 **직접 명시한 문자열**(예: `PersonalBookDashboard/1.0 (+연락처; 개인 비상업 목적)`)로 설정해, robots.txt가 이름으로 차단한 크롤러·스크래핑 도구와 절대 겹치지 않게 한다(위 세 사이트 모두 이 조건이면 범용 `*`/`Fallback` 규칙의 허용 대상이 된다).
2. 요청 간 최소 지연을 알라딘이 명시한 `Crawl-delay`(3~5초) 이상으로 설정해 과도한 트래픽을 방지한다(3사 공통 적용, 예스24·교보문고는 `Crawl-delay`가 없지만 동일 기준을 보수적으로 적용).
3. 대상 페이지(9개 URL)만 요청하고, 링크를 따라가는 광범위 크롤링은 하지 않는다.
4. 표지 이미지는 원본을 다운로드해 Vercel Blob에 저장한 뒤 그 URL만 서비스하며, 대시보드가 원본 사이트 이미지를 직접 hotlink하지 않는다(§7-#3과 동일 원칙, 원본 사이트 대역폭 보호).
5. 알라딘은 공식 API가 있는 기능(신상품·베스트셀러)은 API를 우선 사용해 스크래핑 자체를 최소화한다(§3-1).

## 4. 아키텍처

```
[GitHub Actions: 4개 워크플로우]
  today-book-highfreq.yml (화/금 18:25 KST 기동, 내부 60초 루프)
  today-book-normal.yml   (매일 08:00, 20:00 KST)
  new-releases.yml        (*/30분)
  bestsellers.yml         (매시 정각)
        │  각 워크플로우 = 스크래퍼 실행 → 정규화 → 표지 이미지 업로드 → ingest API 호출
        ▼
[lib/scraping/*] ── 정적 파싱(cheerio) 또는 Playwright, 또는 알라딘 OpenAPI 클라이언트
        │
        ▼
[lib/images/uploadCover.ts] ── Vercel Blob에 표지 이미지 업로드 (BLOB_READ_WRITE_TOKEN, GitHub Secret)
        │
        ▼  HTTPS POST + Authorization: Bearer <CRON_INGEST_SECRET>
[Vercel: Next.js App Router]
  app/api/ingest/today-book/route.ts
  app/api/ingest/new-releases/route.ts
  app/api/ingest/bestsellers/route.ts
        │  Bearer 시크릿 검증 → payload 검증(zod) → Neon upsert → scrape_run 기록
        ▼
[Neon Postgres] ← books / vendor_today_book / vendor_new_release / vendor_bestseller / scrape_run
        ▲
        │  서버 컴포넌트에서 직접 조회(Drizzle ORM)
[Vercel: 대시보드 페이지] app/page.tsx, app/today-book, app/new-releases, app/bestsellers
        │
        ▼
[사용자 브라우저] (인증 없음, 공개 접근)
```

| 모듈 | 무엇을 하나 | 어떻게 쓰나 (인터페이스) | 무엇에 의존하나 |
|---|---|---|---|
| GitHub Actions 워크플로우 (`.github/workflows/*.yml`) | 정해진 스케줄에 Node 스크립트를 실행해 스크래핑·업로드·ingest 호출까지 한 잡에서 수행 | GitHub `schedule` cron 트리거, 필요 시 `workflow_dispatch`로 수동 실행 | `scripts/jobs/*.ts`, GitHub Secrets(`BLOB_READ_WRITE_TOKEN`, `CRON_INGEST_SECRET`, `ALADIN_TTB_KEY`, `INGEST_BASE_URL`) |
| `lib/scraping/*` (사이트·기능별 스크래퍼) | 대상 페이지/공식 API에서 원시 데이터를 받아 도서 배열(제목/저자/출판사/ISBN/가격/표지URL/순위/코멘트)로 정규화 | 함수 호출: `scrapeYes24TodayBook(): Promise<NormalizedBook[]>` 형태로 사이트·기능별 함수 export | `fetch`(정적 파싱 5종은 cheerio와 함께), `playwright`(교보문고 2종), 알라딘 OpenAPI(`fetch` + TTB_KEY) |
| `lib/images/uploadCover.ts` | 표지 원본 이미지를 다운로드 → 리사이즈/webp 변환(sharp) → Vercel Blob 업로드, ISBN 기준 기존 Blob 존재 시 재업로드 생략 | 함수 호출: `ensureCoverUploaded(isbn13, sourceUrl): Promise<string|null>` (Blob URL 또는 실패 시 null) | `@vercel/blob`(GitHub Actions에서도 클라이언트 SDK로 직접 호출 가능), `sharp` |
| `scripts/jobs/*` (워크플로우별 실행 스크립트) | 스크래퍼 호출 → 표지 업로드 → ingest API에 POST | CLI 실행(`tsx scripts/jobs/runTodayBook.ts`), 종료 코드로 성공/실패 판단 | `lib/scraping/*`, `lib/images/uploadCover.ts`, `fetch`(ingest API 호출) |
| `app/api/ingest/*/route.ts` (Vercel API Route) | Bearer 시크릿 검증 → payload 스키마 검증 → Neon에 upsert(도서 마스터 + 벤더별 목록 테이블) → `scrape_run`에 실행 로그 기록 | POST JSON, 응답 `{ok: true, upserted: n}` 또는 4xx/5xx | Neon(Drizzle ORM), 환경변수 `DATABASE_URL`, `CRON_INGEST_SECRET` |
| `app/(dashboard)/*/page.tsx` (대시보드 화면) | Neon에서 최신 데이터를 서버 컴포넌트로 조회해 렌더링, 갱신 지연 시 경고 배지 표시 | Next.js 서버 컴포넌트, 짧은 `revalidate` 또는 `dynamic='force-dynamic'` | Neon(Drizzle ORM), 공유 UI 컴포넌트(`VendorCard`, `RankTable`, `StatusBadge`) |
| Neon Postgres | 도서 마스터·벤더별 최신 목록·스크래핑 실행 로그를 저장하는 단일 진실 원천 | SQL(Drizzle ORM을 통해) | 없음(최하위 계층) |
| Vercel Blob | 표지 이미지 파일 저장소 | `@vercel/blob` SDK (`put`, `list`) | 없음 |

## 5. 데이터 모델

Neon(Postgres) 스키마. "최신 스냅샷만 유지"(이력 미보관) 원칙에 따라 벤더별 목록 테이블은 `(vendor, rank/slot)` 유니크 제약으로 upsert하고, 새 스크래핑 결과에 없는 기존 행은 삭제(오래된 순위 밖 도서 제거)한다.

```
books
  id            bigserial PK
  isbn13        text UNIQUE NULL          -- ISBN 없는 경우(사은품 묶음 등) NULL 허용
  title         text NOT NULL
  author        text NULL
  publisher     text NULL
  pub_date      date NULL
  price         integer NULL              -- 정가(원)
  cover_source_url text NULL              -- 원본 사이트 표지 URL(참고용, 직접 hotlink 안 함)
  cover_blob_url    text NULL             -- Vercel Blob 업로드 결과 URL
  created_at    timestamptz NOT NULL DEFAULT now()
  updated_at    timestamptz NOT NULL DEFAULT now()

vendor_today_book                          -- 기능1
  id            bigserial PK
  vendor        text NOT NULL CHECK (vendor IN ('yes24','kyobo','aladin'))
  book_id       bigint NOT NULL REFERENCES books(id)
  slot_no       integer NOT NULL          -- 예스24 1~4, 교보/알라딘은 노출 개수만큼
  comment       text NULL                 -- PD/MD 코멘트
  period_label  text NULL                 -- 예: "2026년 7월 4주차"
  source_url    text NOT NULL
  scraped_at    timestamptz NOT NULL
  UNIQUE (vendor, slot_no)

vendor_new_release                         -- 기능2 (최대 30개)
  id            bigserial PK
  vendor        text NOT NULL CHECK (vendor IN ('yes24','kyobo','aladin'))
  book_id       bigint NOT NULL REFERENCES books(id)
  rank          integer NOT NULL CHECK (rank BETWEEN 1 AND 30)
  category_label text NULL                -- 예: "소설", "시/에세이"
  scraped_at    timestamptz NOT NULL
  UNIQUE (vendor, rank)

vendor_bestseller                          -- 기능3 (상위 10위)
  id            bigserial PK
  vendor        text NOT NULL CHECK (vendor IN ('yes24','kyobo','aladin'))
  book_id       bigint NOT NULL REFERENCES books(id)
  rank          integer NOT NULL CHECK (rank BETWEEN 1 AND 10)
  scraped_at    timestamptz NOT NULL
  UNIQUE (vendor, rank)

scrape_run                                 -- 운영 로그 (에러/지연 감지용)
  id            bigserial PK
  job_type      text NOT NULL CHECK (job_type IN ('today_book','new_release','bestseller'))
  vendor        text NOT NULL CHECK (vendor IN ('yes24','kyobo','aladin'))
  status        text NOT NULL CHECK (status IN ('success','partial','failed'))
                -- success: 목록·표지 모두 정상 / partial: 도서 목록은 수집됐으나 일부 표지 업로드 실패(§7-#3) / failed: 목록 자체를 못 얻음(§7-#1,#5)
  item_count    integer NOT NULL DEFAULT 0
  error_message text NULL
  started_at    timestamptz NOT NULL
  finished_at   timestamptz NOT NULL
```

관계: `vendor_today_book` / `vendor_new_release` / `vendor_bestseller` → `books` (N:1, 같은 책이 여러 벤더·기능에 중복 참조될 수 있음). `books.isbn13`이 있으면 이를 매칭 키로 upsert하고, 없으면 `title+author+publisher` 완전일치로 폴백 매칭하며, 그마저 실패하면 신규 행으로 취급한다(§7-#6).

## 6. 화면 / API 설계

### 화면(디자인 참고: ant.wiki 실측 분석)

`ant.wiki`의 정적 CSS 번들을 실측 분석한 결과:
- 폰트: `Pretendard Variable`(한국어 웹에서 널리 쓰이는 오픈소스 서체, self-host 가능) + system-ui 폴백
- 색상: 중성 그레이 스케일(`#1f2937`, `#374151`, `#6b7280`, `#9ca3af`, `#e5e7eb`, `#f3f4f6`) 위에 단일 블루 강조색(`#2563eb`/`#2b7fff`)과 보조 앰버/오렌지 태그색(`#f59e0b`, `#a54800`, `#FFF5EC`) 사용
- 다크모드: 거의 검정에 가까운 배경(`#0b0e14`, `#050608`)을 별도 CSS로 정의 — 다크모드 지원 확인
- 모서리: `border-radius` 0.75~1.125rem(12~18px) 대의 카드형 라운드가 반복 사용됨
- 레이아웃: 랭킹/리스트류 화면에서 CSS Grid로 "순번 · 썸네일 · 이름 · 값" 형태의 고정 컬럼 폭 행(row)을 반복 렌더링(예: `36px minmax(0,1fr) 72px 88px`) — 위키형 표 레이아웃

→ 이 대시보드는 **Pretendard Variable + 중성 그레이 배경 + 단일 블루 강조색 + 12~16px 라운드 카드 + 그리드 기반 랭킹 표**를 기본 톤으로 채택하고, 라이트/다크 모드를 모두 지원한다(`prefers-color-scheme` 기반).

| 화면 | 경로 | 역할 |
|---|---|---|
| 홈 | `/` | 3사 "오늘의 책" 요약 카드 + 전체 섹션 최근 갱신 시각/상태 배지 + 다른 화면 바로가기 |
| 오늘의 책 상세 | `/today-book` | 3사 오늘의 책을 벤더별 카드 그리드로 비교 표시(표지, 제목, 저자, 코멘트, 원문 링크) |
| 문학 신상품 | `/new-releases` | 벤더 탭(예스24/교보문고/알라딘) 전환형 표. 컬럼: 순위·표지·제목·저자·출판사·가격. 최대 30행 |
| 실시간 베스트셀러 | `/bestsellers` | 벤더 탭 전환형 표. 컬럼: 순위·표지·제목·저자·가격. 상위 10행 |

공통 컴포넌트: `Header`(내비게이션), `VendorCard`(오늘의 책 카드), `RankTable`(신상품·베스트셀러 공용 표), `StatusBadge`(정상/지연/실패 배지 — `scrape_run` 최신 레코드의 `status='failed'`면 "실패", `finished_at`이 기대 주기의 2배를 넘으면 "지연", `status='partial'`이면 "정상"으로 표시하되 hover 시 "일부 표지 누락" 안내), `VendorTabs`(벤더 전환).

### API (크론 수신 전용, Bearer 인증, 사용자 화면에서 직접 호출되지 않음)

| 엔드포인트 | 메서드 | 역할 | 인증 |
|---|---|---|---|
| `/api/ingest/today-book` | POST | 벤더별 오늘의 책 배열을 받아 `vendor_today_book` upsert (기존 slot 중 이번 응답에 없는 것은 삭제) | `Authorization: Bearer <CRON_INGEST_SECRET>` |
| `/api/ingest/new-releases` | POST | 벤더별 신상품 최대 30개 배열을 받아 `vendor_new_release` upsert(전량 교체) | 상동 |
| `/api/ingest/bestsellers` | POST | 벤더별 베스트셀러 상위 10개 배열을 받아 `vendor_bestseller` upsert(전량 교체) | 상동 |

요청 바디 공통 스키마(zod): `{ vendor: 'yes24'|'kyobo'|'aladin', scrapedAt: string(ISO), items: Array<{ isbn13?, title, author?, publisher?, pubDate?, price?, coverBlobUrl?, coverSourceUrl?, rank?, slotNo?, comment?, periodLabel?, categoryLabel? }> }`. Route는 `job_type`을 URL에서, `vendor`/`items`를 바디에서 받아 검증 후 트랜잭션으로 upsert + `scrape_run` 기록을 수행한다.

## 7. 에러·엣지케이스

| # | 시나리오 | 처리 방침 |
|---|---|---|
| 1 | 사이트 HTML 구조 변경으로 파서가 0건 또는 예상보다 현저히 적은 건수를 반환 | 기존 DB 데이터는 유지(덮어쓰지 않음), `scrape_run.status='failed'`로 기록 후 스크립트는 실패 종료(GitHub Actions가 실패로 표시 → 저장소 소유자에게 기본 이메일 발송). 다음 스케줄에서 자동 재시도 |
| 2 | GitHub Actions 크론이 지연되거나 실행되지 않음(플랫폼 부하로 인한 지연은 GitHub 공식 문서에도 명시된 상시 리스크, 워크플로우 비활성화 등) | 대시보드가 `scrape_run` 최신 `finished_at`을 기대 주기(오늘의 책 12시간/신상품 30분/베스트셀러 1시간)와 비교해 초과 시 `StatusBadge`에 "갱신 지연" 표시. 별도 알림 채널은 구축하지 않고 GitHub의 기본 실패 이메일에 의존 |
| 3 | Vercel Blob 업로드 실패(네트워크 오류, 무료 저장공간 1GB 한도 근접/초과) | 표지 없이 텍스트 정보만 저장(`cover_blob_url=NULL`), 원본 사이트 이미지는 직접 hotlink하지 않고 플레이스홀더 이미지로 대체(원본 사이트 대역폭을 무단 사용하지 않기 위함). 해당 아이템은 `scrape_run.status='partial'`로 기록(도서 정보 자체는 정상 수집됨). 다음 스케줄에서 재업로드 시도 |
| 4 | 알라딘 OpenAPI 일일 호출 한도(5,000회) 초과 또는 API 에러 응답 | 해당 회차 스킵, `scrape_run.status='failed'`로 기록. 예상 호출량(신상품 30분 주기 48회/일 + 베스트셀러 1시간 주기 24회/일 ≈ 하루 100회 미만)이 한도 대비 매우 낮아 발생 가능성은 낮음 |
| 5 | 교보문고 CSR 페이지의 Next.js 청크/DOM 구조 변경으로 Playwright 선택자가 더 이상 매치되지 않음 | #1과 동일하게 처리하되, Playwright는 페이지 로드 타임아웃(15초)을 명시적으로 설정해 무한 대기를 방지 |
| 6 | 동일 도서의 중복 식별 실패(ISBN 미제공/포맷 불일치) | ISBN이 있으면 `isbn13`으로 매칭, 없으면 `title+author+publisher` 완전일치로 폴백 매칭. 그마저 실패하면 신규 `books` 행으로 취급(중복 허용 — 개인용 대시보드 규모에서는 치명적이지 않음) |
| 7 | 화/금 고빈도 워크플로우가 GitHub Actions 잡 실행시간 제한(6시간)에 근접하거나 무한 루프에 빠짐 | 워크플로우 잡에 명시적 `timeout-minutes: 40`을 설정하고, 내부 60초 폴링 루프에도 19:00 KST 하드 컷오프를 코드로 강제 |
| 8 | Neon 무료 티어 저장공간(0.5GB) 초과 | "최신 스냅샷만 보관" 구조로 최소화. 초과 조짐이 보이면(운영 중 모니터링) 오래된 `books` 행(어느 벤더 목록에서도 참조되지 않는 행) 정리가 필요 — MVP 범위에는 자동 정리 배치를 포함하지 않고 리스크로만 관리(§ plan.md 리스크) |

## 8. 테스트 전략

- **단위**: 각 `scripts/scrapers/*` 파서 함수를 실제로 저장해 둔 HTML/JSON 픽스처(`fixtures/` — 개발 중 확보한 실제 페이지 스냅샷)에 대해 실행해, 기대 필드(제목/저자/가격/표지URL 등)가 정확한 타입·개수로 추출되는지 검증. 알라딘 API 클라이언트는 API 응답 JSON 픽스처로 검증
- **통합**: 로컬(또는 Neon 브랜치 DB)에서 `/api/ingest/*` 라우트에 목(mock) payload를 POST해 upsert·삭제(랭크 밖 도서 제거)·`scrape_run` 기록이 기대대로 동작하는지 확인. Bearer 시크릿 누락/오류 시 401을 반환하는지도 검증
- **수동 확인 항목**:
  - 배포 후 실제 화/금 18:25~19:00 KST 구간에 고빈도 워크플로우가 예정대로 기동해 60초 간격으로 재확인하는지 GitHub Actions 로그로 1회 이상 실측
  - 각 워크플로우가 실패했을 때 GitHub 기본 이메일 알림이 저장소 소유자에게 실제로 오는지 1회 확인
  - Vercel 함수 로그에서 잘못된 Bearer 시크릿으로 호출 시 401이 기록되는지 확인
  - 대시보드를 라이트/다크 모드 양쪽에서 육안 확인(ant.wiki 참고 톤 반영 여부)

## 9. 유형별 체크 결과 (웹)

- **배포 방식**: GitHub 저장소(public) + Vercel(Next.js 자동 배포) + GitHub Actions(크론 워크플로우 4종)로 확정(사용자 확정 사항)
- **반응형**: 모바일에서도 표(신상품/베스트셀러)가 가로 스크롤 컨테이너 안에서 동작하도록 구현(본문 자체는 가로 스크롤 없음), 카드 그리드는 `grid-template-columns: repeat(auto-fill, minmax(...))` 류로 화면 폭에 따라 열 수 자동 조정
- **인증 필요 여부**: 없음(공개, 인증 없음 — 사용자 확정 사항). 단 크론 수신 API(`/api/ingest/*`)는 Bearer 시크릿으로 보호
- **SEO 필요 여부**: 불필요(개인용 모니터링 도구, 검색 노출 목적 없음) — `robots.txt`에 `Disallow: /`를 두어 검색엔진 색인을 막는 것을 권장(공개 URL이지만 검색 노출은 원치 않을 가능성이 높음; 사용자에게 확인되지 않은 부가 조치이므로 §0에 준하는 낮은 우선순위 가정으로 plan.md에 옵션으로 남김)
