import { Router } from 'express';
import { z } from 'zod';

import { badRequest, notFound } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const pokesRouter = Router();
pokesRouter.use(requireAuth);

const pokeSchema = z
  .object({ toUserId: z.string().optional(), toGroupId: z.string().optional() })
  .refine((v) => !!v.toUserId !== !!v.toGroupId, { message: 'toUserId 또는 toGroupId 중 하나만 지정해주세요' });

pokesRouter.post('/', async (req, res) => {
  const { toUserId, toGroupId } = pokeSchema.parse(req.body);

  let recipientIds: string[];
  if (toUserId) {
    recipientIds = [toUserId];
  } else {
    const group = await prisma.group.findUnique({
      where: { id: toGroupId },
      include: { members: true },
    });
    if (!group || group.ownerId !== req.userId) throw notFound('그룹');
    recipientIds =
      group.kind === 'GROUP' ? group.members.map((m) => m.userId) : group.friendUserId ? [group.friendUserId] : [];
  }
  if (recipientIds.length === 0) throw badRequest('보낼 대상이 없어요');

  const dndSettings = await prisma.dndSetting.findMany({ where: { userId: { in: recipientIds } } });
  const dndByUser = new Map(dndSettings.map((d) => [d.userId, d.enabled]));

  const pokes = await prisma.$transaction(
    recipientIds.map((toUserId) =>
      prisma.poke.create({
        data: { fromUserId: req.userId, toUserId, delayedByDnd: dndByUser.get(toUserId) ?? false },
      })
    )
  );

  res.status(201).json({ pokes, anyDelayed: pokes.some((p) => p.delayedByDnd) });
});

pokesRouter.get('/received', async (req, res) => {
  const pokes = await prisma.poke.findMany({
    where: { toUserId: req.userId },
    include: { fromUser: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  res.json({ pokes });
});
