import { Router } from 'express';
import { z } from 'zod';

import { randomAvatarGradient } from '../lib/avatar.js';
import { generateInviteCode } from '../lib/inviteCode.js';
import { signToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

const deviceSchema = z.object({
  deviceId: z.string().min(8).max(128),
  displayName: z.string().min(1).max(30).optional(),
});

// There is no login/signup screen in the app (spec's 6 screens don't include
// one) — each install silently provisions a backend account keyed by a
// SecureStore-generated device id. Good enough for the MVP's single-device
// use case; swapping in phone/social auth later only touches this route.
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

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  res.json({ user });
});

const patchMeSchema = z.object({ displayName: z.string().min(1).max(30) });

authRouter.patch('/me', requireAuth, async (req, res) => {
  const { displayName } = patchMeSchema.parse(req.body);
  const user = await prisma.user.update({ where: { id: req.userId }, data: { displayName } });
  res.json({ user });
});
