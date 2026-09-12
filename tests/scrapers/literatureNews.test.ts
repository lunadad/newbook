import { describe, expect, it } from "vitest";
import { parseLiteratureNews, parseLiteratureNewsRss } from "@/lib/scraping/literatureNews";
import { areLikelySameLiteratureNews, dedupeLiteratureNews } from "@/lib/scraping/literatureNewsDedupe";

function card({
  id,
  publisher,
  title,
  articleUrl,
  publishedAt = "2026-08-21T00:23:40Z",
}: {
  id: string;
  publisher: string;
  title: string;
  articleUrl: string;
  publishedAt?: string;
}) {
  const jslogPayload = Buffer.from(JSON.stringify([null, articleUrl])).toString("base64");
  return `
    <c-wiz jsdata="oM6qxc;${id};3">
      <a jslog="95014; 5:${jslogPayload}; track:click" href="./read/${id}"></a>
      <span data-n-tid="9">${publisher}</span>
      <a data-n-tid="29" href="./read/${id}">${title}</a>
      <img src="/api/attachments/${id}-w200-h112-p-df" />
      <time datetime="${publishedAt}"></time>
    </c-wiz>`;
}

describe("parseLiteratureNews", () => {
  it("허용된 종합일간지·경제지 문학 기사와 썸네일만 파싱한다", () => {
    const html = [
      card({
        id: "allowed-general",
        publisher: "문화일보",
        title: "새 문학상 수상작을 만나다",
        articleUrl: "https://www.munhwa.com/article/1",
      }),
      card({
        id: "allowed-economy",
        publisher: "한국경제",
        title: "신간 소설집 출간",
        articleUrl: "https://www.hankyung.com/article/2",
      }),
      card({
        id: "blocked-source",
        publisher: "연합뉴스",
        title: "문학상 발표",
        articleUrl: "https://www.yna.co.kr/article/3",
      }),
    ].join("");

    const items = parseLiteratureNews(html);
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.publisherType)).toEqual(["general", "economy"]);
    expect(items[0].articleUrl).toBe("https://www.munhwa.com/article/1");
    expect(items[0].thumbnailUrl).toContain("news.google.com/api/attachments/");
  });

  it("문학경기장·입소설 같은 동음이의 제목을 제외한다", () => {
    const html = [
      card({
        id: "false-1",
        publisher: "한국일보",
        title: "문학경기장 인근 교통 통제",
        articleUrl: "https://www.hankookilbo.com/1",
      }),
      card({
        id: "false-2",
        publisher: "동아일보",
        title: "확인되지 않은 입소설 확산",
        articleUrl: "https://www.donga.com/2",
      }),
    ].join("");
    expect(parseLiteratureNews(html)).toEqual([]);
  });

  it("표현이 다른 같은 사건은 하나로 묶고, 같은 인물의 별개 소식은 유지한다", () => {
    expect(areLikelySameLiteratureNews(
      "김승옥문학상 대상에 송지현 '누구보다 잘하는 일'",
      "송지현, 김승옥문학상 대상 수상… '누구보다 잘하는 일'",
    )).toBe(true);
    expect(areLikelySameLiteratureNews(
      "김금희 작가 새 소설집 출간",
      "김금희 작가 문학 강연 개최",
    )).toBe(false);

    const unique = dedupeLiteratureNews([
      { title: "김승옥문학상 대상에 송지현 누구보다 잘하는 일" },
      { title: "송지현, 김승옥문학상 대상 수상 누구보다 잘하는 일" },
      { title: "김금희 작가 새 소설집 출간" },
    ]);
    expect(unique).toHaveLength(2);
  });
});

describe("parseLiteratureNewsRss", () => {
  it("HTML 검색이 제한될 때 RSS에서도 허용 언론사와 문학 기사만 파싱한다", () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item><title>문학상 수상작 발표 - 문화일보</title><link>https://news.google.com/rss/articles/allowed</link><guid>allowed</guid><pubDate>Sat, 12 Sep 2026 01:00:00 GMT</pubDate><source>문화일보</source></item>
      <item><title>문학 소식 - 연합뉴스</title><link>https://news.google.com/rss/articles/blocked</link><guid>blocked</guid><pubDate>Sat, 12 Sep 2026 00:30:00 GMT</pubDate><source>연합뉴스</source></item>
    </channel></rss>`;
    const items = parseLiteratureNewsRss(xml);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ title: "문학상 수상작 발표", publisher: "문화일보" });
    expect(items[0].thumbnailUrl).toBeUndefined();
  });
});
