ALTER TABLE "scrape_run" DROP CONSTRAINT "vendor_check";--> statement-breakpoint
ALTER TABLE "vendor_bestseller" DROP CONSTRAINT "vendor_check";--> statement-breakpoint
ALTER TABLE "scrape_run" ADD CONSTRAINT "vendor_check" CHECK ("scrape_run"."vendor" IN ('yes24','kyobo','aladin','amazon'));--> statement-breakpoint
ALTER TABLE "vendor_bestseller" ADD CONSTRAINT "vendor_check" CHECK ("vendor_bestseller"."vendor" IN ('yes24','kyobo','aladin','amazon'));