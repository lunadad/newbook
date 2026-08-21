CREATE TABLE "literature_news" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"publisher" text NOT NULL,
	"publisher_type" text NOT NULL,
	"article_url" text NOT NULL,
	"thumbnail_url" text,
	"published_at" timestamp with time zone NOT NULL,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "literature_news_external_id_unique" UNIQUE("external_id"),
	CONSTRAINT "publisher_type_check" CHECK ("literature_news"."publisher_type" IN ('general','economy'))
);
--> statement-breakpoint
CREATE TABLE "news_collection_run" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone NOT NULL,
	CONSTRAINT "news_run_status_check" CHECK ("news_collection_run"."status" IN ('success','failed'))
);
