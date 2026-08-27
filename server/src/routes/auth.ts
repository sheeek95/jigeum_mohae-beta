import { Router } from 'express';
import { z } from 'zod';

import { randomAvatarGradient } from '../lib/avatar.js';
import { badRequest, unauthorized } from '../lib/errors.js';
import { generateInviteCode } from '../lib/inviteCode.js';
import { signToken } from '../lib/jwt.js';
import { verifyKakaoToken } from '../lib/kakao.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

const deviceSchema = z.object({
  deviceId: z.string().min(8).max(128),
  displayName: z.string().min(1).max(30).optional(),
});

// Legacy device-id login, kept only so an already-installed app whose JS
// hasn't picked up the Kakao-login update yet doesn't break mid-session.
// New sign-ins go through POST /kakao instead — see that route's comment.
authRouter.post('/device', async (req, res) => {
  const { deviceId, displayName } = deviceSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { deviceId } });
  if (existing) {
    res.json({ token: signToken(existing.id), user: existing });
    return;
  }

  const [avatarStart, avatarEnd] = randomAvatarGradient();
  // Collision odds on a 6-byte code are negligible, but retry rather than
  // 500 on the once-in-a-blue-moon unique-constraint hit.
  let user;
  for (let attempt = 0; ; attempt++) {
    try {
      user = await prisma.user.create({
        data: {
          deviceId,
          displayName: displayName ?? `게스트${Math.floor(1000 + Math.random() * 9000)}`,
          avatarStart,
          avatarEnd,
          inviteCode: generateInviteCode(),
          dndSetting: { create: {} },
        },
      });
      break;
    } catch (err) {
      if (attempt < 3 && err instanceof Error && 'code' in err && err.code === 'P2002') continue;
      throw err;
    }
  }
  res.status(201).json({ token: signToken(user.id), user });
});

const kakaoSchema = z.object({ accessToken: z.string().min(1) });

async function createKakaoUser(kakaoId: string, nickname: string | null) {
  const [avatarStart, avatarEnd] = randomAvatarGradient();
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.user.create({
        data: {
          kakaoId,
          displayName: nickname ?? `게스트${Math.floor(1000 + Math.random() * 9000)}`,
          avatarStart,
          avatarEnd,
          inviteCode: generateInviteCode(),
          dndSetting: { create: {} },
        },
      });
    } catch (err) {
      if (attempt < 3 && err instanceof Error && 'code' in err && err.code === 'P2002') continue;
      throw err;
    }
  }
}

// The real, mandatory sign-in path: the client gets an access token from
// the native Kakao SDK, we verify it directly with Kakao (never trust a
// client-supplied id) and find-or-create the account by that Kakao id.
// Unlike the old device-id flow, this survives a full reinstall or lost
// local storage — logging back in with the same Kakao account always finds
// the same backend user, since identity lives in Kakao, not on the device.
authRouter.post('/kakao', async (req, res) => {
  const { accessToken } = kakaoSchema.parse(req.body);
  const { kakaoId, nickname } = await verifyKakaoToken(accessToken);

  const existing = await prisma.user.findUnique({ where: { kakaoId } });
  if (existing) {
    res.json({ token: signToken(existing.id), user: existing });
    return;
  }

  const user = await createKakaoUser(kakaoId, nickname);
  res.status(201).json({ token: signToken(user.id), user });
});

// Migration path for an account created before Kakao login existed: links
// the Kakao identity to the CURRENT (already-authenticated) account instead
// of spinning up a new one, so a pre-existing invite code/friends/groups
// survive the switch. 400s if that Kakao account is already linked to a
// different user — accepting the link would silently merge two accounts.
authRouter.post('/link-kakao', requireAuth, async (req, res) => {
  const { accessToken } = kakaoSchema.parse(req.body);
  const { kakaoId, nickname } = await verifyKakaoToken(accessToken);

  const existing = await prisma.user.findUnique({ where: { kakaoId } });
  if (existing && existing.id !== req.userId) {
    throw badRequest('이미 다른 계정에 연결된 카카오 계정이에요');
  }

  try {
    const user = await prisma.user.update({ where: { id: req.userId }, data: { kakaoId } });
    res.json({ token: signToken(user.id), user });
  } catch (err) {
    // The device-based account this session's token points to no longer
    // exists (e.g. a stale token surviving past that account's loss) —
    // there's nothing left to link, so fall back to a fresh Kakao signup
    // rather than 500ing on an unrecoverable "link" request.
    if (err instanceof Error && 'code' in err && err.code === 'P2025') {
      const user = await createKakaoUser(kakaoId, nickname);
      res.status(201).json({ token: signToken(user.id), user });
      return;
    }
    throw err;
  }
});

// A well-formed, signature-valid token whose user row is gone (e.g. the
// backend's database was reset — see the Neon migration) is functionally
// the same as an invalid token from the client's perspective: there's no
// session to resume. Answer 401, not 500, so the client's existing
// invalid-token handling (clear the stored token, fall back to login)
// kicks in instead of surfacing a scary, unrecoverable-looking server error.
function rethrowMissingUserAs401(err: unknown): never {
  if (err instanceof Error && 'code' in err && err.code === 'P2025') {
    throw unauthorized('세션이 만료됐어요. 다시 로그인해주세요');
  }
  throw err;
}

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } }).catch(rethrowMissingUserAs401);
  res.json({ user });
});

const patchMeSchema = z.object({ displayName: z.string().min(1).max(30) });

authRouter.patch('/me', requireAuth, async (req, res) => {
  const { displayName } = patchMeSchema.parse(req.body);
  const user = await prisma.user
    .update({ where: { id: req.userId }, data: { displayName } })
    .catch(rethrowMissingUserAs401);
  res.json({ user });
});
