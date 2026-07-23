import * as cheerio from "cheerio";
import { fetchText } from "./httpClient";
import type { NormalizedTodayBookItem } from "./types";

const SOURCE_URL = "https://event.yes24.com/todayBook";

/**
 * PD 코멘트 dd 텍스트는 "<설명 문단><br>YYYY.MM.DD 카테고리 PD 이름" 형태.
 * 마지막 줄에서 날짜를 분리해 코멘트 본문과 갱신일을 나눈다.
 */
function splitCommentAndDate(rawDd: string): { comment: string; dateLine: string | null } {
  const lines = rawDd
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { comment: "", dateLine: null };
  const last = lines[lines.length - 1];
  if (/^\d{4}\.\d{2}\.\d{2}/.test(last)) {
    return { comment: lines.slice(0, -1).join(" "), dateLine: last };
  }
  return { comment: lines.join(" "), dateLine: null };
}

export function parseYes24TodayBookHtml(html: string): NormalizedTodayBookItem[] {
  const $ = cheerio.load(html);

  const ogTitle = $('meta[property="og:title"]').attr("content") ?? "";
  const periodLabel = ogTitle.replace(/^편집회의\s*/, "").trim() || undefined;

  const items: NormalizedTodayBookItem[] = [];

  $(".tBook_rollSet").each((i, el) => {
    const node = $(el);
    const title = node.find(".tBook_name").first().text().trim();
    if (!title) return;

    const link = node.find(".tBook_img a").first().attr("href");
    const author = node.find(".tBook_auth").first().text().trim() || undefined;
    const publisher = node.find(".tBook_pub").first().text().trim() || undefined;
    const coverSourceUrl = node.find(".tBook_img img").first().attr("src") || undefined;

    const rawDd = node.find(".tBook_detail .detail_infoSet dd").first().html() ?? "";
    const rawDdText = cheerio.load(`<div>${rawDd}</div>`)("div").text();
    const { comment } = splitCommentAndDate(rawDdText);

    items.push({
      slotNo: i + 1,
      title,
      author,
      publisher,
      comment: comment || undefined,
      periodLabel,
      coverSourceUrl,
      sourceUrl: link ?? SOURCE_URL,
    });
  });

  if (items.length === 0) {
    throw new Error("예스24 오늘의 책 파싱 결과 0건 — 선택자 확인 필요");
  }

  return items;
}

export async function scrapeYes24TodayBook(): Promise<NormalizedTodayBookItem[]> {
  const html = await fetchText(SOURCE_URL);
  return parseYes24TodayBookHtml(html);
}
