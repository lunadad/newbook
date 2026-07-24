import { z } from "zod";

export const vendorSchema = z.enum(["yes24", "kyobo", "aladin", "amazon"]);

export const ingestItemSchema = z.object({
  isbn13: z.string().optional(),
  title: z.string().min(1),
  author: z.string().optional(),
  publisher: z.string().optional(),
  pubDate: z.string().optional(),
  price: z.number().int().nonnegative().optional(),
  coverBlobUrl: z.string().url().optional(),
  coverSourceUrl: z.string().url().optional(),
  /** 상품 상세 페이지 링크. today_book은 필수(vendor_today_book.source_url NOT NULL),
   * new_release/bestseller는 선택(클릭 시 이동용). */
  sourceUrl: z.string().url().optional(),
  rank: z.number().int().positive().optional(),
  slotNo: z.number().int().positive().optional(),
  comment: z.string().optional(),
  periodLabel: z.string().optional(),
  categoryLabel: z.string().optional(),
});

export const ingestRequestSchema = z.object({
  vendor: vendorSchema,
  scrapedAt: z.string().datetime(),
  items: z.array(ingestItemSchema),
});

export type IngestItem = z.infer<typeof ingestItemSchema>;
export type IngestRequest = z.infer<typeof ingestRequestSchema>;
