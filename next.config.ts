import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 표지를 벤더 CDN에서 직접 핫링크하고 Vercel 이미지 최적화를 거치지 않는다.
    // unoptimized=true면 <Image>가 /_next/image 최적화 엔드포인트 대신 원본 URL을 그대로
    // <img>로 렌더하므로, 외부 호스트 remotePatterns 등록도 불필요하고 이미지 최적화
    // 무료 한도도 소비하지 않는다(Blob 오퍼레이션 한도 문제와 별개로 미리 회피).
    unoptimized: true,
  },
};

export default nextConfig;
