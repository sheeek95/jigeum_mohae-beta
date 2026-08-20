import crypto from 'node:crypto';

import { Router } from 'express';
import { z } from 'zod';

import { badRequest, notFound } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const invitesRouter = Router();
invitesRouter.use(requireAuth);

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function generateCode() {
  return crypto.randomBytes(6).toString('base64url');
}

// Get-or-create the caller's current shareable invite link (spec: 7 days, 1 use).
invitesRouter.get('/mine', async (req, res) => {
  const now = new Date();
  const existing = await prisma.inviteLink.findFirst({
    where: { createdById: req.userId, usedById: null, expiresAt: { gt: now } },
    orderBy: { createdAt: 'desc' },
  });
  if (existing) {
    res.json({ invite: existing });
    return;
  }
  const invite = await prisma.inviteLink.create({
    data: { code: generateCode(), createdById: req.userId, expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
  });
  res.status(201).json({ invite });
});

invitesRouter.post('/mine/regenerate', async (req, res) => {
  const invite = await prisma.inviteLink.create({
    data: { code: generateCode(), createdById: req.userId, expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
  });
  res.status(201).json({ invite });
});

invitesRouter.get('/:code', async (req, res) => {
  const invite = await prisma.inviteLink.findUnique({
    where: { code: req.params.code },
    include: { createdBy: true },
  });
  if (!invite) throw notFound('초대 링크');
  const valid = !invite.usedById && invite.expiresAt.getTime() > Date.now();
  res.json({
    invite: {
      code: invite.code,
      expiresAt: invite.expiresAt,
      valid,
      isSelf: invite.createdById === req.userId,
      inviter: { id: invite.createdBy.id, displayName: invite.createdBy.displayName, avatarStart: invite.createdBy.avatarStart, avatarEnd: invite.createdBy.avatarEnd },
    },
  });
});

const acceptSchema = z.object({ groupIds: z.array(z.string()).optional() });

invitesRouter.post('/:code/accept', async (req, res) => {
  const { groupIds } = acceptSchema.parse(req.body ?? {});
  const invite = await prisma.inviteLink.findUnique({ where: { code: req.params.code } });
  if (!invite) throw notFound('초대 링크');
  if (invite.usedById) throw badRequest('이미 사용된 링크예요');
  if (invite.expiresAt.getTime() <= Date.now()) throw badRequest('만료된 링크예요');
  if (invite.createdById === req.userId) throw badRequest('내가 만든 링크는 사용할 수 없어요');

  const [userAId, userBId] = [invite.createdById, req.userId].sort();

  const friendship = await prisma.$transaction(async (tx) => {
    const created = await tx.friendship.create({ data: { userAId, userBId } });
    await tx.inviteLink.update({ where: { code: invite.code }, data: { usedById: req.userId, usedAt: new Date() } });

    const [inviter, accepter] = await Promise.all([
      tx.user.findUniqueOrThrow({ where: { id: invite.createdById } }),
      tx.user.findUniqueOrThrow({ where: { id: req.userId } }),
    ]);

    // Auto-create the personal share-target on both sides.
    await tx.group.create({
      data: { ownerId: invite.createdById, kind: 'PERSONAL', name: accepter.displayName, friendUserId: accepter.id },
    });
    await tx.group.create({
      data: { ownerId: req.userId, kind: 'PERSONAL', name: inviter.displayName, friendUserId: inviter.id },
    });

    if (groupIds?.length) {
      for (const groupId of groupIds) {
        const group = await tx.group.findFirst({ where: { id: groupId, ownerId: req.userId, kind: 'GROUP' } });
        if (!group) continue;
        const memberCount = await tx.groupMember.count({ where: { groupId } });
        if (memberCount >= 10) continue; // spec: max 8-10 exposed members per group
        await tx.groupMember.upsert({
          where: { groupId_userId: { groupId, userId: invite.createdById } },
          update: {},
          create: { groupId, userId: invite.createdById },
        });
      }
    }

    return created;
  });

  res.status(201).json({ friendship });
});
