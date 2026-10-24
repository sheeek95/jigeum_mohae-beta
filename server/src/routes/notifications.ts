import { Router } from 'express';

import { FROM_NAME_PLACEHOLDER } from '../lib/notify.js';
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
      // n.body is a template ({{from}}님이 ...) when it embeds the sender's
      // name — resolved against their CURRENT displayName here rather than
      // whatever name got baked in at creation time, so a rename shows up
      // retroactively across every past notification, not just new ones.
      body: n.body.includes(FROM_NAME_PLACEHOLDER)
        ? n.body.replace(FROM_NAME_PLACEHOLDER, n.fromUser?.displayName ?? '알 수 없음')
        : n.body,
      photoId: n.photoId,
      groupId: n.groupId,
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
