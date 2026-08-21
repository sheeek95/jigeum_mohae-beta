import { Router } from 'express';
import { z } from 'zod';

import { notFound } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const pokesRouter = Router();
pokesRouter.use(requireAuth);

const pokeSchema = z.object({ toUserId: z.string() });

pokesRouter.post('/', async (req, res) => {
  const { toUserId } = pokeSchema.parse(req.body);

  const isFriend = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userAId: req.userId, userBId: toUserId },
        { userAId: toUserId, userBId: req.userId },
      ],
    },
  });
  if (!isFriend) throw notFound('친구');

  const dndSetting = await prisma.dndSetting.findUnique({ where: { userId: toUserId } });
  const poke = await prisma.poke.create({
    data: { fromUserId: req.userId, toUserId, delayedByDnd: dndSetting?.enabled ?? false },
  });

  res.status(201).json({ poke, anyDelayed: poke.delayedByDnd });
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
