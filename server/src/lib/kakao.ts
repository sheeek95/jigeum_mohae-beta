import { badRequest } from './errors.js';

interface KakaoUserResponse {
  id: number;
  kakao_account?: { profile?: { nickname?: string } };
}

// Verifies an access token the client got from the native Kakao SDK by
// asking Kakao itself who it belongs to — never trust a client-supplied id
// directly. Throws badRequest on an invalid/expired token so callers don't
// need their own try/catch for the common case.
export async function verifyKakaoToken(accessToken: string): Promise<{ kakaoId: string; nickname: string | null }> {
  const res = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw badRequest('카카오 로그인에 실패했어요');
  const data = (await res.json()) as KakaoUserResponse;
  return { kakaoId: String(data.id), nickname: data.kakao_account?.profile?.nickname ?? null };
}
