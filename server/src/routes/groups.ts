import { Router } from 'express';
import { z } from 'zod';

import { topCommentsFor } from '../lib/comments.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import { notify } from '../lib/notify.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const groupsRouter = Router();
groupsRouter.use(requireAuth);

const MAX_GROUP_MEMBERS = 10; // spec: 그룹당 최대 8~10명
const MAX_GROUPS_PER_USER = 2;

// Groups I own, plus GROUP-kind groups someone else owns that I've been
// accepted into — a joined (non-owner) member needs this group to show up
// on their own Home just like it does for the owner.
groupsRouter.get('/', async (req, res) => {
  const groups = await prisma.group.findMany({
    where: {
      OR: [{ ownerId: req.userId }, { kind: 'GROUP', members: { some: { userId: req.userId } } }],
    },
    include: {
      owner: true,
      members: { include: { user: { include: { dndSetting: true } } } },
      friendUser: { include: { dndSetting: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  res.json({
    groups: groups.map((g) => {
      const isOwner = g.ownerId === req.userId;
      // "다른 사람들" — everyone in the group besides me, whether that's my
      // own GroupMember rows (I'm the owner) or the owner plus the other
      // members (I joined someone else's group).
      const others =
        g.kind === 'GROUP'
          ? [
              ...(isOwner ? [] : [{ id: g.owner.id, displayName: g.owner.displayName }]),
              ...g.members.filter((m) => m.userId !== req.userId).map((m) => ({ id: m.user.id, displayName: m.user.displayName })),
            ]
          : undefined;
      return {
        id: g.id,
        // PERSONAL groups snapshot the friend's displayName once at creation
        // (see /invites/:code/accept) — resolve the live name instead so a
        // later rename by the friend shows up here too.
        name: g.kind === 'PERSONAL' ? (g.friendUser?.displayName ?? g.name) : g.name,
        kind: g.kind,
        isOwner,
        memberCount: g.kind === 'GROUP' ? (others?.length ?? 0) : 1,
        dnd: g.kind === 'PERSONAL' ? (g.friendUser?.dndSetting?.enabled ?? false) : false,
        friendId: g.friendUserId,
        members: others,
      };
    }),
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

// Inviting a friend to a GROUP no longer adds them outright — it creates a
// pending GroupInvite and notifies them; they only actually join once they
// accept via POST /invites/:id/respond. Friends-only, same as before.
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
  if (!isFriend) throw badRequest('친구만 그룹에 초대할 수 있어요');

  const alreadyMember = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId } },
  });
  if (alreadyMember) throw badRequest('이미 그룹에 있는 친구예요');

  const memberCount = await prisma.groupMember.count({ where: { groupId: group.id } });
  if (memberCount >= MAX_GROUP_MEMBERS) throw badRequest(`그룹은 최대 ${MAX_GROUP_MEMBERS}명까지예요`);

  const [owner, invite] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: req.userId } }),
    prisma.groupInvite.upsert({
      where: { groupId_inviteeId: { groupId: group.id, inviteeId: userId } },
      update: {},
      create: { groupId: group.id, inviterId: req.userId, inviteeId: userId },
    }),
  ]);

  void notify(userId, 'GROUP_INVITE', {
    title: '그룹 초대가 왔어요',
    body: `${owner.displayName}님이 "${group.name}" 그룹에 초대했어요`,
    groupId: group.id,
    fromUserId: req.userId,
  });

  res.status(201).json({ invite });
});

groupsRouter.get('/invites', async (req, res) => {
  const invites = await prisma.groupInvite.findMany({
    where: { inviteeId: req.userId },
    include: { group: true, inviter: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    invites: invites.map((i) => ({
      id: i.id,
      groupId: i.groupId,
      groupName: i.group.name,
      inviterName: i.inviter.displayName,
      createdAt: i.createdAt,
    })),
  });
});

const respondSchema = z.object({ approve: z.boolean() });

// Accepting notifies the group's owner and every existing member (not just
// the owner) that someone new joined — declining just quietly removes the
// invite, no notification either way back to the inviter.
groupsRouter.post('/invites/:id/respond', async (req, res) => {
  const { approve } = respondSchema.parse(req.body);
  const invite = await prisma.groupInvite.findUnique({
    where: { id: req.params.id },
    include: { group: true },
  });
  if (!invite || invite.inviteeId !== req.userId) throw notFound('초대');

  if (!approve) {
    await prisma.groupInvite.delete({ where: { id: invite.id } });
    res.status(204).end();
    return;
  }

  const memberCount = await prisma.groupMember.count({ where: { groupId: invite.groupId } });
  if (memberCount >= MAX_GROUP_MEMBERS) {
    await prisma.groupInvite.delete({ where: { id: invite.id } });
    throw badRequest('그룹 정원이 가득 찼어요');
  }

  const [invitee, existingMembers] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: req.userId } }),
    prisma.groupMember.findMany({ where: { groupId: invite.groupId } }),
  ]);

  await prisma.$transaction([
    prisma.groupMember.create({ data: { groupId: invite.groupId, userId: req.userId } }),
    prisma.groupInvite.delete({ where: { id: invite.id } }),
  ]);

  const notifyTargets = new Set([invite.group.ownerId, ...existingMembers.map((m) => m.userId)]);
  notifyTargets.delete(req.userId);
  for (const uid of notifyTargets) {
    void notify(uid, 'GROUP_MEMBER_JOINED', {
      title: '새 멤버가 들어왔어요',
      body: `${invitee.displayName}님이 "${invite.group.name}" 그룹에 들어왔어요`,
      groupId: invite.groupId,
      fromUserId: req.userId,
    });
  }

  res.status(204).end();
});

// Owner-only: who they've already invited to THIS group and is still
// pending, so the invite UI can grey those friends out instead of letting
// the owner spam the same invite (harmless either way — upsert on the
// invite already no-ops a repeat — but this gives the UI something to show).
groupsRouter.get('/:id/invites', async (req, res) => {
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!group || group.ownerId !== req.userId || group.kind !== 'GROUP') throw notFound('그룹');
  const invites = await prisma.groupInvite.findMany({
    where: { groupId: group.id },
    include: { invitee: true },
  });
  res.json({ invites: invites.map((i) => ({ id: i.id, userId: i.inviteeId, displayName: i.invitee.displayName })) });
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
