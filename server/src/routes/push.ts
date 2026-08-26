import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const pushRouter = Router();
pushRouter.use(requireAuth);

const registerSchema = z.object({ token: z.string().min(1) });

// Idempotent by token: re-registering the same token just moves it to
// whichever account currently owns this device (reinstall onto a new
// account, device passed on, etc.).
pushRouter.post('/register', async (req, res) => {
  const { token } = registerSchema.parse(req.body);
  await prisma.pushToken.upsert({
    where: { token },
    update: { userId: req.userId },
    create: { userId: req.userId, token },
  });
  res.status(204).end();
});
