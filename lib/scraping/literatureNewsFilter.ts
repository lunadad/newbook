/** 제목에 하나라도 들어 있으면 문학 기사 후보로 본다. */
const LITERATURE_TERMS = [
  "문학",
  "소설가",
  "소설집",
  "장편소설",
  "단편소설",
  "시인",
  "시집",
  "문학상",
  "신간",
  "출판",
  "번역가",
  "서점",
];

/**
 * 문학 용어와 형태가 같지만 뜻이 다른 표현. 후보 판정 전에 지워서
 * "시집온"(결혼)·"시인했다"(자백)·"문학경기장"(야구장)이 문학어로 세지 않게 한다.
 */
const HOMONYM_PATTERNS = [
  /문학경기장/g,
  /전문학/g,
  /입소설/g,
  /연재소설/g,
  /시집[가간갈와왔오온올살식]/g,
  /시인(했|하|한다|하며|하고|하지|할|함|해야|해서)/g,
  /출판기념회/g,
];

/**
 * 문학 용어가 섞여 있어도 기사의 본질이 정치·선거·사건사고면 제외한다.
 * 문화체육관광부 출판 정책 기사까지 잘리지 않도록 "장관"·"예산"·"국정감사" 같은
 * 행정 일반 용어는 넣지 않고, 정당 정치와 수사·범죄 용어만 차단한다.
 */
const NON_LITERATURE_TERMS = [
  // 정당 정치
  "대통령실",
  "여당",
  "야당",
  "여야",
  "민주당",
  "국민의힘",
  "조국혁신당",
  "개혁신당",
  "당대표",
  "최고위원",
  "원내대표",
  "국회의원",
  "대선",
  "총선",
  "지방선거",
  "재보궐",
  "공천",
  "탄핵",
  "내란",
  "특검",
  "청문회",
  "지지율",
  "대정부질문",
  // 수사·사건사고
  "검찰",
  "경찰",
  "압수수색",
  "구속",
  "기소",
  "송치",
  "혐의",
  "피의자",
  "마약",
  "필로폰",
  "음주운전",
  "성추행",
  "성폭행",
  "살인",
  "사기 혐의",
  "징역",
  "실형",
];

export function isLiteratureTitle(title: string): boolean {
  if (NON_LITERATURE_TERMS.some((term) => title.includes(term))) return false;

  const withoutHomonyms = HOMONYM_PATTERNS.reduce(
    (masked, pattern) => masked.replace(pattern, " "),
    title,
  );
  return LITERATURE_TERMS.some((term) => withoutHomonyms.includes(term));
}
