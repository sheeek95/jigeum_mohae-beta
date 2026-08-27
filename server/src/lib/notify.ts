import type { NotificationType } from '@prisma/client';

import { prisma } from './prisma.js';
import { sendPushToUser } from './push.js';

interface NotifyPayload {
  title: string;
  body: string;
  photoId?: string;
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
        fromUserId: payload.fromUserId,
      },
    })
    .catch((err) => console.error('[notify] failed to persist notification:', err));

  sendPushToUser(userId, {
    title: payload.title,
    body: payload.body,
    data: { type, photoId: payload.photoId, fromUserId: payload.fromUserId },
  });
}
