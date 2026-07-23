import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/ingest/auth";
import { ingestRequestSchema } from "@/lib/ingest/schema";
import { upsertIngestBatch } from "@/lib/ingest/upsert";

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = ingestRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { status, itemCount } = await upsertIngestBatch(
      "today_book",
      parsed.data.vendor,
      new Date(parsed.data.scrapedAt),
      parsed.data.items,
    );
    return NextResponse.json({ ok: true, status, upserted: itemCount });
  } catch (err) {
    console.error("today-book ingest 실패:", err);
    return NextResponse.json({ error: "ingest_failed" }, { status: 500 });
  }
}
