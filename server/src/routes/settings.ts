import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

settingsRouter.get('/dnd', async (req, res) => {
  const dnd = await prisma.dndSetting.upsert({
    where: { userId: req.userId },
    update: {},
    create: { userId: req.userId },
  });
  res.json({ dnd });
});

const dndSchema = z.object({
  enabled: z.boolean().optional(),
  scheduleEnabled: z.boolean().optional(),
  scheduleStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  scheduleEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

settingsRouter.patch('/dnd', async (req, res) => {
  const patch = dndSchema.parse(req.body);
  const dnd = await prisma.dndSetting.upsert({
    where: { userId: req.userId },
    update: patch,
    create: { userId: req.userId, ...patch },
  });
  res.json({ dnd });
});
