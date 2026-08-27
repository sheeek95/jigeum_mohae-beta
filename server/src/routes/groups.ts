import { Router } from 'express';
import { z } from 'zod';

import { topCommentsFor } from '../lib/comments.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const groupsRouter = Router();
groupsRouter.use(requireAuth);

const MAX_GROUP_MEMBERS = 10; // spec: 그룹당 최대 8~10명
const MAX_GROUPS_PER_USER = 2;

groupsRouter.get('/', async (req, res) => {
  const groups = await prisma.group.findMany({
    where: { ownerId: req.userId },
    include: {
      members: { include: { user: { include: { dndSetting: true } } } },
      friendUser: { include: { dndSetting: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  res.json({
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      kind: g.kind,
      memberCount: g.kind === 'GROUP' ? g.members.length : 1,
      dnd: g.kind === 'PERSONAL' ? (g.friendUser?.dndSetting?.enabled ?? false) : false,
      friendId: g.friendUserId,
      members:
        g.kind === 'GROUP'
          ? g.members.map((m) => ({ id: m.user.id, displayName: m.user.displayName }))
          : undefined,
    })),
  });
});

const createSchema = z.object({ name: z.string().min(1).max(30) });

groupsRouter.post('/', async (req, res) => {
  const { name } = createSchema.parse(req.body);
  const groupCount = await prisma.group.count({ where: { ownerId: req.userId, kind: 'GROUP' } });
  if (groupCount >= MAX_GROUPS_PER_USER) throw badRequest(`그룹은 최대 ${MAX_GROUPS_PER_USER}개까지 만들 수 있어요`);
  const group = await prisma.group.create({ data: { ownerId: req.userId, name, kind: 'GROUP' } });
  res.status(201).json({ group });
});

const renameSchema = z.object({ name: z.string().min(1).max(30) });

groupsRouter.patch('/:id', async (req, res) => {
  const { name } = renameSchema.parse(req.body);
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!group || group.ownerId !== req.userId) throw notFound('그룹');
  if (group.kind !== 'GROUP') throw forbidden('개인 대상은 이름을 바꿀 수 없어요');
  const updated = await prisma.group.update({ where: { id: group.id }, data: { name } });
  res.json({ group: updated });
});

groupsRouter.delete('/:id', async (req, res) => {
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!group || group.ownerId !== req.userId) throw notFound('그룹');
  if (group.kind !== 'GROUP') throw forbidden('개인 대상은 삭제할 수 없어요');
  await prisma.group.delete({ where: { id: group.id } });
  res.status(204).end();
});

const addMemberSchema = z.object({ userId: z.string() });

groupsRouter.post('/:id/members', async (req, res) => {
  const { userId } = addMemberSchema.parse(req.body);
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!group || group.ownerId !== req.userId || group.kind !== 'GROUP') throw notFound('그룹');

  const isFriend = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userAId: req.userId, userBId: userId },
        { userAId: userId, userBId: req.userId },
      ],
    },
  });
  if (!isFriend) throw badRequest('친구만 그룹에 추가할 수 있어요');

  const memberCount = await prisma.groupMember.count({ where: { groupId: group.id } });
  if (memberCount >= MAX_GROUP_MEMBERS) throw badRequest(`그룹은 최대 ${MAX_GROUP_MEMBERS}명까지예요`);

  const member = await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId } },
    update: {},
    create: { groupId: group.id, userId },
  });
  res.status(201).json({ member });
});

groupsRouter.delete('/:id/members/:userId', async (req, res) => {
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!group || group.ownerId !== req.userId || group.kind !== 'GROUP') throw notFound('그룹');
  await prisma.groupMember.deleteMany({ where: { groupId: group.id, userId: req.params.userId } });
  res.status(204).end();
});

// The group's still-live (< 24h) photo history for the story viewer. A
// PERSONAL group is really a two-sided conversation stored as two separate
// Group rows (one per side, auto-created on invite accept) — merge both so
// "우리 둘이 주고받은 사진" shows everything either side sent, not just mine.
groupsRouter.get('/:id/photos', async (req, res) => {
  const group = await prisma.group.findUnique({ where: { id: req.params.id }, include: { members: true } });
  if (!group) throw notFound('그룹');

  const isOwner = group.ownerId === req.userId;
  const isMember = group.kind === 'GROUP' && group.members.some((m) => m.userId === req.userId);
  const isFriendTarget = group.kind === 'PERSONAL' && group.friendUserId === req.userId;
  if (!isOwner && !isMember && !isFriendTarget) throw forbidden('접근 권한이 없어요');

  const groupIds = [group.id];
  if (group.kind === 'PERSONAL' && group.friendUserId) {
    const counterpart = await prisma.group.findFirst({
      where: { ownerId: group.friendUserId, friendUserId: group.ownerId, kind: 'PERSONAL' },
    });
    if (counterpart) groupIds.push(counterpart.id);
  }

  const photos = await prisma.photo.findMany({
    where: { groupId: { in: groupIds }, expiresAt: { gt: new Date() } },
    include: { sender: true, deliveries: { where: { userId: req.userId } } },
    orderBy: { createdAt: 'asc' },
  });

  const items = await Promise.all(
    photos.map(async (p) => ({
      photoId: p.id,
      url: `/uploads/${p.storageKey}`,
      caption: p.caption,
      senderId: p.senderId,
      senderName: p.sender.displayName,
      createdAt: p.createdAt,
      expiresAt: p.expiresAt,
      isMine: p.senderId === req.userId,
      saveStatus: p.deliveries[0]?.saveStatus ?? null,
      comments: await topCommentsFor(p.id),
    }))
  );

  res.json({ items });
});
