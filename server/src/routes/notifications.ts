import { Router } from 'express';

import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get('/', async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.userId },
    include: { fromUser: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      photoId: n.photoId,
      fromUserName: n.fromUser?.displayName ?? null,
      read: n.read,
      createdAt: n.createdAt,
    })),
  });
});

notificationsRouter.get('/unread-count', async (req, res) => {
  const count = await prisma.notification.count({ where: { userId: req.userId, read: false } });
  res.json({ count });
});

notificationsRouter.post('/read-all', async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.userId, read: false }, data: { read: true } });
  res.status(204).end();
});
