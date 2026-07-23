import * as cheerio from "cheerio";
import { fetchText } from "./httpClient";
import type { NormalizedTodayBookItem } from "./types";

const SOURCE_URL = "https://www.aladin.co.kr/weeklyeditorialmeeting/detail.aspx";

/** "지은이, 옮긴이 / 출판사" 형태 문자열을 저자/출판사로 분리 */
function splitAuthorPublisher(text: string): { author?: string; publisher?: string } {
  const lastSlash = text.lastIndexOf("/");
  if (lastSlash === -1) return { author: text.trim() || undefined };
  return {
    author: text.slice(0, lastSlash).trim() || undefined,
    publisher: text.slice(lastSlash + 1).trim() || undefined,
  };
}

export function parseAladinWeeklyHtml(html: string): NormalizedTodayBookItem[] {
  const $ = cheerio.load(html);

  const items: NormalizedTodayBookItem[] = [];

  $(".choice_body").each((i, el) => {
    const node = $(el);
    const title = node.find(".choice_title2").first().text().trim();
    if (!title) return;

    const { author, publisher } = splitAuthorPublisher(
      node.find(".choice_title3").first().text().trim(),
    );

    const commentBlock = node.find("div:has(> .choice_green)").first();
    const mdName = commentBlock.find(".choice_green").text().trim().replace(/^-\s*/, "");
    const commentClone = commentBlock.clone();
    commentClone.find(".choice_green").remove();
    const commentBody = commentClone.text().trim().replace(/\s+/g, " ");
    const comment = mdName ? `${commentBody} — ${mdName}` : commentBody || undefined;

    const coverSourceUrl = node.find(".br_imgline").first().attr("src") || undefined;
    const sourceUrl = node.find('a[href*="wproduct.aspx"]').first().attr("href") ?? SOURCE_URL;

    items.push({
      slotNo: i + 1,
      title,
      author,
      publisher,
      comment,
      coverSourceUrl,
      sourceUrl,
    });
  });

  if (items.length === 0) {
    throw new Error("알라딘 편집장의 선택 파싱 결과 0건 — 선택자 확인 필요");
  }

  return items;
}

export async function scrapeAladinWeekly(): Promise<NormalizedTodayBookItem[]> {
  const html = await fetchText(SOURCE_URL);
  return parseAladinWeeklyHtml(html);
}
