import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/ingest/auth";
import { literatureNewsRequestSchema } from "@/lib/ingest/schema";
import { upsertLiteratureNews } from "@/lib/ingest/upsertLiteratureNews";

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = literatureNewsRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const upserted = await upsertLiteratureNews(
      new Date(parsed.data.collectedAt),
      parsed.data.items,
    );
    return NextResponse.json({ ok: true, upserted });
  } catch (error) {
    console.error("literature-news ingest 실패:", error);
    return NextResponse.json({ error: "ingest_failed" }, { status: 500 });
  }
}
