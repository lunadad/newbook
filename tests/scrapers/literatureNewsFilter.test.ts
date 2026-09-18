import { describe, expect, it } from "vitest";
import { isLiteratureTitle } from "@/lib/scraping/literatureNewsFilter";

describe("isLiteratureTitle", () => {
  it("문학 기사 제목을 통과시킨다", () => {
    const titles = [
      "이호철문학상 수상 바스케스 “소설로 갈등 해답 찾고 싶었다”",
      "소설가 김연수 \"AI가 내놓는 답은 '독이 든 사과'와 같죠\"",
      "정주신 시인 첫 시집 ‘아내의 화분’ 출간",
      "[신간] 스티븐 킹의 66번째 장편 소설…'절대 쫄지 마'",
      "내년 출판 진흥 예산 645억원…역대급 편성에 출판계 ‘반색’",
    ];

    for (const title of titles) {
      expect(isLiteratureTitle(title), title).toBe(true);
    }
  });

  it("‘시집온’·‘시인했다’ 같은 동음이의 표현은 문학어로 세지 않는다", () => {
    expect(isLiteratureTitle("추미애 “부잣집 시집온줄 알았는데…금고 탕진, 빚문서 잔뜩”")).toBe(false);
    expect(isLiteratureTitle("배우 ㅇㅇㅇ, 말 못했던 ‘시집살이’ 고백")).toBe(false);
    expect(isLiteratureTitle("정부, 통계 오류 시인하며 사과")).toBe(false);
    expect(isLiteratureTitle("인천 문학경기장, ‘K-컬처 돔구장’으로 새판 짠다")).toBe(false);
  });

  it("정치·수사 기사는 문학 용어가 있어도 제외한다", () => {
    expect(isLiteratureTitle("野 대표, 출판기념회서 총선 출마 시사")).toBe(false);
    expect(isLiteratureTitle("30대 필로폰 투약 시인...내일 송치")).toBe(false);
    expect(isLiteratureTitle("특검, 소설 같은 진술 반박…추가 기소 검토")).toBe(false);
    expect(isLiteratureTitle("민주당 의원, 신간 출판기념회 열어")).toBe(false);
  });

  it("문학 용어가 없는 제목은 제외한다", () => {
    expect(isLiteratureTitle("통영대전고속도서 4.5t 화물차 추돌 '연쇄 충격'")).toBe(false);
  });

  it("문체부 출판 정책처럼 행정 용어가 섞인 문학 기사는 유지한다", () => {
    expect(isLiteratureTitle("문체부 장관, 출판계 만나 “청년문화패스에 도서 포함”")).toBe(true);
    expect(isLiteratureTitle("[2026국감] AI가 쓴 작품이 문학상 우수상…심사 '무사통과'")).toBe(true);
  });
});
