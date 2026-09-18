import { lookup } from "node:dns/promises";

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^::ffff:/, "");

  if (/^\d+\.\d+\.\d+\.\d+$/.test(normalized)) {
    const [first, second] = normalized.split(".").map(Number);
    return (
      first === 0
      || first === 10
      || first === 127
      || (first === 100 && second >= 64 && second <= 127)
      || (first === 169 && second === 254)
      || (first === 172 && second >= 16 && second <= 31)
      || (first === 192 && second === 168)
    );
  }

  // ::/::1(루프백), fc00::/7(유니크 로컬), fe80::/10(링크 로컬)
  return normalized === "::" || normalized === "::1" || /^f[cd]/.test(normalized) || /^fe[89ab]/.test(normalized);
}

/**
 * 외부 URL을 대신 가져오는 프록시가 내부망 주소로 유도되지 않도록(SSRF) 호스트를 검증한다.
 */
export async function isPublicHost(hostname: string): Promise<boolean> {
  try {
    const addresses = await lookup(hostname, { all: true });
    return addresses.length > 0 && addresses.every(({ address }) => !isPrivateAddress(address));
  } catch {
    return false;
  }
}
