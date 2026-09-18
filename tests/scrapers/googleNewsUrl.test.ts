import { describe, expect, it } from "vitest";
import {
  buildDecodeRequestBody,
  googleNewsArticleId,
  parseArticleSignature,
  parseDecodedArticleUrl,
} from "@/lib/scraping/googleNewsUrl";

describe("googleNewsArticleId", () => {
  it("RSS·웹 기사 링크에서 기사 토큰을 뽑는다", () => {
    expect(googleNewsArticleId("https://news.google.com/rss/articles/CBMiYEFV?oc=5")).toBe("CBMiYEFV");
    expect(googleNewsArticleId("https://news.google.com/articles/CBMiYEFV")).toBe("CBMiYEFV");
  });

  it("구글 뉴스 링크가 아니면 null을 반환한다", () => {
    expect(googleNewsArticleId("https://www.hani.co.kr/arti/culture/1.html")).toBeNull();
  });
});

describe("parseArticleSignature", () => {
  it("인터스티셜 HTML에서 서명과 타임스탬프를 읽는다", () => {
    const html = `<c-wiz data-n-a-id="i1" data-n-a-sg="Ae5Wzi8HUy" data-n-a-ts="1789712427"></c-wiz>`;

    expect(parseArticleSignature(html)).toEqual({ signature: "Ae5Wzi8HUy", timestamp: 1789712427 });
  });

  it("서명이 없으면 null을 반환한다", () => {
    expect(parseArticleSignature("<html><body>Google News</body></html>")).toBeNull();
  });
});

describe("buildDecodeRequestBody", () => {
  it("기사 토큰·타임스탬프·서명을 Fbv4je 요청에 담는다", () => {
    const body = buildDecodeRequestBody("CBMiYEFV", { signature: "Ae5Wzi8HUy", timestamp: 1789712427 });
    const request = body.get("f.req") ?? "";

    expect(request).toContain("Fbv4je");
    expect(request).toContain("garturlreq");
    expect(request).toContain("CBMiYEFV");
    expect(request).toContain("Ae5Wzi8HUy");
    expect(request).toContain("1789712427");
  });
});

describe("parseDecodedArticleUrl", () => {
  it("batchexecute 응답에서 원문 기사 URL을 꺼낸다", () => {
    const payload = JSON.stringify(["garturlres", "https://www.asiae.co.kr/article/2026091814583726802", 1]);
    const response = `)]}'\n\n${JSON.stringify([
      ["wrb.fr", "Fbv4je", payload, null, null, null, "generic"],
      ["di", 14],
    ])}`;

    expect(parseDecodedArticleUrl(response)).toBe("https://www.asiae.co.kr/article/2026091814583726802");
  });

  it("응답이 비정상이면 null을 반환한다", () => {
    expect(parseDecodedArticleUrl(")]}'\n\n[[\"er\",null,null]]")).toBeNull();
    expect(parseDecodedArticleUrl("garturlres 하지만 JSON이 아님")).toBeNull();
  });
});
