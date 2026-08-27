import { Router } from 'express';
import { z } from 'zod';

import { badRequest, notFound } from '../lib/errors.js';
import { notify } from '../lib/notify.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const invitesRouter = Router();
invitesRouter.use(requireAuth);

const MAX_FRIENDS = 20;

function countFriends(userId: string) {
  return prisma.friendship.count({ where: { OR: [{ userAId: userId }, { userBId: userId }] } });
}

// My own permanent friend-add code — set once at account creation (see
// routes/auth.ts), never rotated or expired.
invitesRouter.get('/mine', async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  res.json({ invite: { code: user.inviteCode } });
});

async function findFriendship(userAId: string, userBId: string) {
  const [a, b] = [userAId, userBId].sort();
  return prisma.friendship.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } });
}

invitesRouter.get('/:code', async (req, res) => {
  const inviter = await prisma.user.findUnique({ where: { inviteCode: req.params.code } });
  if (!inviter) throw notFound('초대 코드');

  const isSelf = inviter.id === req.userId;
  const alreadyFriends = !isSelf && !!(await findFriendship(inviter.id, req.userId));

  res.json({
    invite: {
      code: inviter.inviteCode,
      valid: !isSelf && !alreadyFriends,
      isSelf,
      alreadyFriends,
      inviter: { id: inviter.id, displayName: inviter.displayName, avatarStart: inviter.avatarStart, avatarEnd: inviter.avatarEnd },
    },
  });
});

const acceptSchema = z.object({ groupIds: z.array(z.string()).optional() });

invitesRouter.post('/:code/accept', async (req, res) => {
  const { groupIds } = acceptSchema.parse(req.body ?? {});
  const inviter = await prisma.user.findUnique({ where: { inviteCode: req.params.code } });
  if (!inviter) throw notFound('초대 코드');
  if (inviter.id === req.userId) throw badRequest('내 코드는 사용할 수 없어요');
  if (await findFriendship(inviter.id, req.userId)) throw badRequest('이미 친구예요');
  if ((await countFriends(req.userId)) >= MAX_FRIENDS) throw badRequest(`친구는 최대 ${MAX_FRIENDS}명까지 추가할 수 있어요`);
  if ((await countFriends(inviter.id)) >= MAX_FRIENDS) throw badRequest('상대방의 친구 목록이 가득 찼어요');

  const [userAId, userBId] = [inviter.id, req.userId].sort();

  let accepterName = '';

  const friendship = await prisma.$transaction(async (tx) => {
    const created = await tx.friendship.create({ data: { userAId, userBId } });

    const accepter = await tx.user.findUniqueOrThrow({ where: { id: req.userId } });
    accepterName = accepter.displayName;

    // Auto-create the personal share-target on both sides.
    await tx.group.create({
      data: { ownerId: inviter.id, kind: 'PERSONAL', name: accepter.displayName, friendUserId: accepter.id },
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
          where: { groupId_userId: { groupId, userId: inviter.id } },
          update: {},
          create: { groupId, userId: inviter.id },
        });
      }
    }

    return created;
  });

  void notify(inviter.id, 'FRIEND_ADDED', {
    title: '새 친구가 생겼어요',
    body: `${accepterName}님과 친구가 되었어요`,
    fromUserId: req.userId,
  });

  res.status(201).json({ friendship });
});
