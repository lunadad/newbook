import {
  pgTable,
  bigserial,
  bigint,
  text,
  integer,
  date,
  timestamp,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const vendorEnum = ["yes24", "kyobo", "aladin", "amazon"] as const;
export type Vendor = (typeof vendorEnum)[number];

export const jobTypeEnum = ["today_book", "new_release", "bestseller"] as const;
export type JobType = (typeof jobTypeEnum)[number];

export const runStatusEnum = ["success", "partial", "failed"] as const;
export type RunStatus = (typeof runStatusEnum)[number];

export const books = pgTable("books", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  isbn13: text("isbn13").unique(),
  title: text("title").notNull(),
  author: text("author"),
  publisher: text("publisher"),
  pubDate: date("pub_date"),
  price: integer("price"),
  coverSourceUrl: text("cover_source_url"),
  coverBlobUrl: text("cover_blob_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vendorTodayBook = pgTable(
  "vendor_today_book",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    vendor: text("vendor").notNull(),
    bookId: bigint("book_id", { mode: "number" })
      .notNull()
      .references(() => books.id),
    slotNo: integer("slot_no").notNull(),
    comment: text("comment"),
    periodLabel: text("period_label"),
    sourceUrl: text("source_url").notNull(),
    scrapedAt: timestamp("scraped_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique().on(table.vendor, table.slotNo),
    check("vendor_check", sql`${table.vendor} IN ('yes24','kyobo','aladin')`),
  ],
);

export const vendorNewRelease = pgTable(
  "vendor_new_release",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    vendor: text("vendor").notNull(),
    bookId: bigint("book_id", { mode: "number" })
      .notNull()
      .references(() => books.id),
    rank: integer("rank").notNull(),
    categoryLabel: text("category_label"),
    sourceUrl: text("source_url"),
    scrapedAt: timestamp("scraped_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique().on(table.vendor, table.rank),
    check("vendor_check", sql`${table.vendor} IN ('yes24','kyobo','aladin')`),
    check("rank_check", sql`${table.rank} BETWEEN 1 AND 30`),
  ],
);

export const vendorBestseller = pgTable(
  "vendor_bestseller",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    vendor: text("vendor").notNull(),
    bookId: bigint("book_id", { mode: "number" })
      .notNull()
      .references(() => books.id),
    rank: integer("rank").notNull(),
    sourceUrl: text("source_url"),
    scrapedAt: timestamp("scraped_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique().on(table.vendor, table.rank),
    // 아마존은 베스트셀러 기능에만 참여한다(오늘의 책/신상품은 미지원, design.md 범위 밖 추가 기능)
    check("vendor_check", sql`${table.vendor} IN ('yes24','kyobo','aladin','amazon')`),
    check("rank_check", sql`${table.rank} BETWEEN 1 AND 10`),
  ],
);

export const scrapeRun = pgTable(
  "scrape_run",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    jobType: text("job_type").notNull(),
    vendor: text("vendor").notNull(),
    status: text("status").notNull(),
    itemCount: integer("item_count").notNull().default(0),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check("job_type_check", sql`${table.jobType} IN ('today_book','new_release','bestseller')`),
    check("vendor_check", sql`${table.vendor} IN ('yes24','kyobo','aladin','amazon')`),
    check("status_check", sql`${table.status} IN ('success','partial','failed')`),
  ],
);
