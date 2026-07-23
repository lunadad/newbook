import { put, head } from "@vercel/blob";
import sharp from "sharp";
import { fetchWithUserAgent } from "../scraping/httpClient";

const COVER_WIDTH = 320;

function coverBlobPath(isbn13: string): string {
  return `covers/${isbn13}.webp`;
}

async function blobExists(pathname: string): Promise<string | null> {
  try {
    const meta = await head(pathname);
    return meta.url;
  } catch {
    return null;
  }
}

/**
 * 표지 원본을 다운로드해 리사이즈/webp 변환 후 Vercel Blob에 업로드한다.
 * ISBN 기준으로 이미 업로드된 표지가 있으면 재업로드를 생략한다(design.md §0-7 저장공간 절약).
 * 실패(다운로드/업로드 오류)는 예외를 삼키고 null을 반환한다 — 상위 잡은 "표지 없음"으로 처리하고 계속 진행(design.md §7-#3).
 */
export async function ensureCoverUploaded(
  isbn13: string | null | undefined,
  sourceUrl: string | null | undefined,
): Promise<string | null> {
  if (!sourceUrl) return null;

  try {
    if (isbn13) {
      const pathname = coverBlobPath(isbn13);
      const existingUrl = await blobExists(pathname);
      if (existingUrl) return existingUrl;
    }

    const res = await fetchWithUserAgent(sourceUrl);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());

    const webp = await sharp(buffer)
      .resize({ width: COVER_WIDTH, withoutEnlargement: true })
      .webp()
      .toBuffer();

    const pathname = isbn13 ? coverBlobPath(isbn13) : `covers/anon-${Date.now()}.webp`;
    const blob = await put(pathname, webp, {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: !isbn13,
    });
    return blob.url;
  } catch (err) {
    console.error(`표지 업로드 실패 (${sourceUrl}):`, err);
    return null;
  }
}
