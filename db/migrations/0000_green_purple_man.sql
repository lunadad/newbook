CREATE TABLE "books" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"isbn13" text,
	"title" text NOT NULL,
	"author" text,
	"publisher" text,
	"pub_date" date,
	"price" integer,
	"cover_source_url" text,
	"cover_blob_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "books_isbn13_unique" UNIQUE("isbn13")
);
--> statement-breakpoint
CREATE TABLE "scrape_run" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"job_type" text NOT NULL,
	"vendor" text NOT NULL,
	"status" text NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone NOT NULL,
	CONSTRAINT "job_type_check" CHECK ("scrape_run"."job_type" IN ('today_book','new_release','bestseller')),
	CONSTRAINT "vendor_check" CHECK ("scrape_run"."vendor" IN ('yes24','kyobo','aladin')),
	CONSTRAINT "status_check" CHECK ("scrape_run"."status" IN ('success','partial','failed'))
);
--> statement-breakpoint
CREATE TABLE "vendor_bestseller" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"vendor" text NOT NULL,
	"book_id" bigint NOT NULL,
	"rank" integer NOT NULL,
	"scraped_at" timestamp with time zone NOT NULL,
	CONSTRAINT "vendor_bestseller_vendor_rank_unique" UNIQUE("vendor","rank"),
	CONSTRAINT "vendor_check" CHECK ("vendor_bestseller"."vendor" IN ('yes24','kyobo','aladin')),
	CONSTRAINT "rank_check" CHECK ("vendor_bestseller"."rank" BETWEEN 1 AND 10)
);
--> statement-breakpoint
CREATE TABLE "vendor_new_release" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"vendor" text NOT NULL,
	"book_id" bigint NOT NULL,
	"rank" integer NOT NULL,
	"category_label" text,
	"scraped_at" timestamp with time zone NOT NULL,
	CONSTRAINT "vendor_new_release_vendor_rank_unique" UNIQUE("vendor","rank"),
	CONSTRAINT "vendor_check" CHECK ("vendor_new_release"."vendor" IN ('yes24','kyobo','aladin')),
	CONSTRAINT "rank_check" CHECK ("vendor_new_release"."rank" BETWEEN 1 AND 30)
);
--> statement-breakpoint
CREATE TABLE "vendor_today_book" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"vendor" text NOT NULL,
	"book_id" bigint NOT NULL,
	"slot_no" integer NOT NULL,
	"comment" text,
	"period_label" text,
	"source_url" text NOT NULL,
	"scraped_at" timestamp with time zone NOT NULL,
	CONSTRAINT "vendor_today_book_vendor_slot_no_unique" UNIQUE("vendor","slot_no"),
	CONSTRAINT "vendor_check" CHECK ("vendor_today_book"."vendor" IN ('yes24','kyobo','aladin'))
);
--> statement-breakpoint
ALTER TABLE "vendor_bestseller" ADD CONSTRAINT "vendor_bestseller_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_new_release" ADD CONSTRAINT "vendor_new_release_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_today_book" ADD CONSTRAINT "vendor_today_book_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;