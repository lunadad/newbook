import type { Vendor } from "@/db/schema";

/** 오늘의 책 / 문학 신상품에 참여하는 벤더 (국내 3사) */
export type CoreVendor = "yes24" | "kyobo" | "aladin";
export const VENDORS: CoreVendor[] = ["yes24", "kyobo", "aladin"];

/** 실시간 베스트셀러 전용 벤더 목록 — 아마존은 베스트셀러 기능에만 참여한다 */
export const BESTSELLER_VENDORS: Vendor[] = ["yes24", "kyobo", "aladin", "amazon"];

export const VENDOR_LABEL: Record<Vendor, string> = {
  yes24: "예스24",
  kyobo: "교보문고",
  aladin: "알라딘",
  amazon: "아마존",
};

/** 벤더별 가격 표시 통화. books.price 컬럼은 원화 정수를 기본으로 하며,
 * 아마존만 예외적으로 센트 단위 USD 정수를 저장한다(amazonBestseller.ts 참고). */
export const VENDOR_CURRENCY: Record<Vendor, "KRW" | "USD"> = {
  yes24: "KRW",
  kyobo: "KRW",
  aladin: "KRW",
  amazon: "USD",
};
