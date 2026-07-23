import type { Vendor } from "@/db/schema";

export const VENDORS: Vendor[] = ["yes24", "kyobo", "aladin"];

export const VENDOR_LABEL: Record<Vendor, string> = {
  yes24: "예스24",
  kyobo: "교보문고",
  aladin: "알라딘",
};
