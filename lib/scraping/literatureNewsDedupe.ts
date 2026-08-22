const TITLE_PREFIXES = /^(?:\[[^\]]+\]|【[^】]+】|\([^)]{1,20}\)|속보|단독|[\[【(]?(?:오늘의 책|새로 나온 책|책과 삶|책마을)[\]】)]?)\s*/giu;
const TITLE_NOISE = new Set([
  "문학",
  "문학상",
  "출간",
  "출판",
  "신간",
  "소설",
  "시인",
  "작가",
  "책",
  "도서",
  "관련",
  "대해",
  "통해",
  "전해",
  "밝혀",
  "공개",
  "소개",
  "개최",
  "선정",
  "발표",
  "수상",
]);

function compactTitle(title: string): string {
  return title
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(TITLE_PREFIXES, "")
    .replace(/[“”‘’'"`「」『』〈〉<>()[\]{}:;,.!?·…/_—–-]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function titleTokens(title: string): string[] {
  return compactTitle(title)
    .match(/[가-힣a-z0-9]{2,}/giu)
    ?.filter((token) => !TITLE_NOISE.has(token)) ?? [];
}

function characterBigrams(title: string): Set<string> {
  const compact = compactTitle(title).replace(/\s/gu, "");
  return new Set(Array.from({ length: Math.max(0, compact.length - 1) }, (_, index) => compact.slice(index, index + 2)));
}

export function normalizeLiteratureNewsTitle(title: string): string {
  return compactTitle(title).replace(/\s/gu, "");
}

/**
 * 같은 사건의 재전송 기사를 보수적으로 묶는다.
 * 공통 핵심 단어가 두 개 이상이거나, 제목의 문자 패턴이 매우 유사할 때만 중복으로 본다.
 * 따라서 같은 작가의 별개 소식처럼 이름 하나만 겹치는 기사는 유지한다.
 */
export function areLikelySameLiteratureNews(titleA: string, titleB: string): boolean {
  const normalizedA = normalizeLiteratureNewsTitle(titleA);
  const normalizedB = normalizeLiteratureNewsTitle(titleB);
  if (!normalizedA || !normalizedB) return false;
  if (normalizedA === normalizedB) return true;

  const tokensA = new Set(titleTokens(titleA));
  const tokensB = new Set(titleTokens(titleB));
  const sharedTokens = [...tokensA].filter((token) => tokensB.has(token));
  const unionSize = new Set([...tokensA, ...tokensB]).size;
  const tokenJaccard = unionSize === 0 ? 0 : sharedTokens.length / unionSize;

  if (sharedTokens.length >= 2 && (tokenJaccard >= 0.28 || sharedTokens.some((token) => token.length >= 4))) {
    return true;
  }

  if (normalizedA.length < 12 || normalizedB.length < 12) return false;
  const bigramsA = characterBigrams(titleA);
  const bigramsB = characterBigrams(titleB);
  const sharedBigrams = [...bigramsA].filter((bigram) => bigramsB.has(bigram)).length;
  const dice = (2 * sharedBigrams) / (bigramsA.size + bigramsB.size);
  return dice >= 0.62;
}

export function dedupeLiteratureNews<T extends { title: string }>(items: T[]): T[] {
  const kept: T[] = [];
  for (const item of items) {
    if (!kept.some((candidate) => areLikelySameLiteratureNews(candidate.title, item.title))) {
      kept.push(item);
    }
  }
  return kept;
}
