import { Router } from 'express';

import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const friendsRouter = Router();
friendsRouter.use(requireAuth);

friendsRouter.get('/', async (req, res) => {
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userAId: req.userId }, { userBId: req.userId }] },
    include: {
      userA: { include: { dndSetting: true } },
      userB: { include: { dndSetting: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const friends = friendships.map((f) => {
    const other = f.userAId === req.userId ? f.userB : f.userA;
    return {
      id: other.id,
      displayName: other.displayName,
      avatarStart: other.avatarStart,
      avatarEnd: other.avatarEnd,
      dnd: other.dndSetting?.enabled ?? false,
      friendsSince: f.createdAt,
    };
  });

  res.json({ friends });
});
