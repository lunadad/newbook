import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL 환경변수가 설정되지 않았습니다");
}

// Neon은 표준 Postgres 와이어 프로토콜과 완전히 호환되므로 일반 pg 드라이버를 사용한다.
// (엣지 런타임 전용 @neondatabase/serverless의 웹소켓 방식은 불필요 — 이 프로젝트는
// Vercel Node.js 런타임에서 실행되며, ingest API가 여러 테이블을 하나의 트랜잭션으로
// 묶어야 하므로(Phase 8) 트랜잭션을 지원하는 일반 커넥션 방식이 더 적합하다.)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });
