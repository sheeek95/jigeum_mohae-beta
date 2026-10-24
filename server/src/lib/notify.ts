import type { NotificationType } from '@prisma/client';

import { prisma } from './prisma.js';
import { sendPushToUser } from './push.js';

// Callers write this placeholder into `body` wherever the sender's current
// display name belongs (e.g. "{{from}}님이 콕 찔렀어요"), instead of baking
// in whatever their name happened to be at that moment — this is what the
// persisted Notification row stores, so 알림함 keeps showing the sender's
// latest name even after they rename themselves, resolved live wherever the
// Notification.fromUser relation is available (GET /notifications). The
// push notification itself is a one-shot, already-delivered OS banner that
// can't be retroactively edited, so it gets the name resolved once here.
export const FROM_NAME_PLACEHOLDER = '{{from}}';

interface NotifyPayload {
  title: string;
  body: string;
  photoId?: string;
  groupId?: string;
  fromUserId?: string;
}

// Pairs a persisted Notification row (for the in-app 알림함 list) with the
// OS push that already existed for some of these — both best-effort, never
// throws, so a notification failure never breaks the action that triggered it.
export async function notify(userId: string, type: NotificationType, payload: NotifyPayload) {
  await prisma.notification
    .create({
      data: {
        userId,
        type,
        title: payload.title,
        body: payload.body,
        photoId: payload.photoId,
        groupId: payload.groupId,
        fromUserId: payload.fromUserId,
      },
    })
    .catch((err) => console.error('[notify] failed to persist notification:', err));

  let pushBody = payload.body;
  if (payload.fromUserId && pushBody.includes(FROM_NAME_PLACEHOLDER)) {
    const fromUser = await prisma.user.findUnique({ where: { id: payload.fromUserId }, select: { displayName: true } });
    // .replace() (first match only) — a template never repeats the
    // placeholder, and some bodies (PHOTO_REPLY/PHOTO_REACTION) append
    // free-form user text afterward that could coincidentally contain this
    // literal substring; replaceAll would corrupt that text too.
    pushBody = pushBody.replace(FROM_NAME_PLACEHOLDER, fromUser?.displayName ?? '알 수 없음');
  }

  sendPushToUser(userId, {
    title: payload.title,
    body: pushBody,
    data: { type, photoId: payload.photoId, groupId: payload.groupId, fromUserId: payload.fromUserId },
  });
}
