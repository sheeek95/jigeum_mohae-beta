import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { z } from 'zod';

import { topCommentsFor } from '../lib/comments.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import { notify } from '../lib/notify.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
const PHOTO_TTL_MS = 24 * 60 * 60 * 1000; // spec: 24시간 후 자동 삭제
// Photos only ever live 24h (or until an explicit save) and are only ever
// shown at widget/thumbnail/full-screen-preview size — re-encoding on
// upload keeps disk usage and bandwidth low without a visible quality hit.
const MAX_DIMENSION = 1440;
const JPEG_QUALITY = 72;

// Buffered in memory rather than written straight to disk since every
// upload gets re-encoded through sharp before it's persisted.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

async function saveCompressedPhoto(buffer: Buffer): Promise<string> {
  const filename = `${crypto.randomUUID()}.jpg`;
  const compressed = await sharp(buffer)
    .rotate() // apply EXIF orientation before stripping metadata below
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
  await fs.writeFile(path.join(UPLOAD_DIR, filename), compressed);
  return filename;
}

export const photosRouter = Router();
photosRouter.use(requireAuth);

// Storage cap on permanently-saved (APPROVED) photos, separate from the 24h
// TTL that everything else self-clears through. Free-tier number for now —
// spec says this varies per paid plan once billing exists.
const MAX_SAVED_PHOTOS = 50;

const shareSchema = z.object({
  caption: z.string().max(200).optional().default(''),
  targetGroupIds: z
    .string()
    .transform((s) => JSON.parse(s) as unknown)
    .pipe(z.array(z.string()).min(1)),
});

photosRouter.post('/', upload.single('photo'), async (req, res) => {
  if (!req.file) throw badRequest('사진 파일이 필요해요');
  const { caption, targetGroupIds } = shareSchema.parse(req.body);

  const [groups, sender] = await Promise.all([
    prisma.group.findMany({
      where: { id: { in: targetGroupIds }, ownerId: req.userId },
      include: { members: true },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: req.userId } }),
  ]);
  if (groups.length === 0) throw badRequest('보낼 대상을 찾을 수 없어요');

  const filename = await saveCompressedPhoto(req.file.buffer);

  const expiresAt = new Date(Date.now() + PHOTO_TTL_MS);
  const photos = await prisma.$transaction(
    groups.map((group) =>
      prisma.photo.create({
        data: {
          senderId: req.userId,
          groupId: group.id,
          storageKey: filename,
          caption,
          expiresAt,
          deliveries: {
            create: (group.kind === 'GROUP' ? group.members.map((m) => m.userId) : group.friendUserId ? [group.friendUserId] : [])
              .filter((uid) => uid !== req.userId)
              .map((userId) => ({ userId })),
          },
        },
        include: { deliveries: true },
      })
    )
  );

  for (const photo of photos) {
    for (const delivery of photo.deliveries) {
      void notify(delivery.userId, 'PHOTO_RECEIVED', {
        title: '사진이 도착했어요',
        body: `${sender.displayName}님이 사진을 보냈어요`,
        photoId: photo.id,
        fromUserId: req.userId,
      });
    }
  }

  res.status(201).json({ photos, url: `/uploads/${filename}` });
});

photosRouter.get('/widget/latest', async (req, res) => {
  const delivery = await prisma.photoDelivery.findFirst({
    where: { userId: req.userId, expiredAt: null, photo: { expiresAt: { gt: new Date() } } },
    include: { photo: { include: { sender: true, group: true } } },
    orderBy: { photo: { createdAt: 'desc' } },
  });
  if (!delivery) {
    res.json({ photo: null });
    return;
  }
  res.json({
    photo: {
      id: delivery.photo.id,
      url: `/uploads/${delivery.photo.storageKey}`,
      caption: delivery.photo.caption,
      senderName: delivery.photo.sender.displayName,
      // Only surfaced for a real multi-friend GROUP — a PERSONAL target's
      // name would just repeat senderName, so it stays null there.
      groupName: delivery.photo.group?.kind === 'GROUP' ? delivery.photo.group.name : null,
      createdAt: delivery.photo.createdAt,
    },
  });
});

// "저장한 사진" — album's saved tab. Only APPROVED deliveries: an
// un-saved received photo lives only in the group story viewer (see
// GET /groups/:id/photos below), not here, so this list never needs a TTL
// countdown — an APPROVED save is permanent.
photosRouter.get('/received', async (req, res) => {
  const deliveries = await prisma.photoDelivery.findMany({
    where: { userId: req.userId, saveStatus: 'APPROVED' },
    include: { photo: { include: { sender: true } } },
    orderBy: { savedAt: 'desc' },
  });
  res.json({
    items: deliveries.map((d) => ({
      deliveryId: d.id,
      photoId: d.photoId,
      url: `/uploads/${d.photo.storageKey}`,
      caption: d.photo.caption,
      senderName: d.photo.sender.displayName,
      createdAt: d.photo.createdAt,
      savedAt: d.savedAt,
    })),
  });
});

// "보낸 사진" — album's sent tab, with every recipient's save status and a
// preview of top-level comments left on each (tap-through to the full
// thread, including replies, is GET /:photoId/comments).
photosRouter.get('/sent', async (req, res) => {
  const photos = await prisma.photo.findMany({
    where: { senderId: req.userId },
    include: { deliveries: { include: { user: true } }, group: true },
    orderBy: { createdAt: 'desc' },
  });
  const items = await Promise.all(
    photos.map(async (p) => ({
      photoId: p.id,
      url: `/uploads/${p.storageKey}`,
      caption: p.caption,
      groupId: p.groupId,
      targetName: p.group?.name ?? '알 수 없음',
      createdAt: p.createdAt,
      expiresAt: p.expiresAt,
      deliveries: p.deliveries.map((d) => ({
        deliveryId: d.id,
        userId: d.userId,
        displayName: d.user.displayName,
        saveStatus: d.saveStatus,
      })),
      comments: await topCommentsFor(p.id),
    }))
  );
  res.json({ items });
});

photosRouter.post('/:photoId/request-save', async (req, res) => {
  const delivery = await prisma.photoDelivery.findUnique({
    where: { photoId_userId: { photoId: req.params.photoId, userId: req.userId } },
    include: { photo: { include: { sender: true } } },
  });
  if (!delivery) throw notFound('받은 사진');
  if (delivery.saveStatus !== 'NONE') throw badRequest('이미 요청했거나 처리된 사진이에요');

  const savedCount = await prisma.photoDelivery.count({ where: { userId: req.userId, saveStatus: 'APPROVED' } });
  if (savedCount >= MAX_SAVED_PHOTOS) throw badRequest(`저장된 사진은 최대 ${MAX_SAVED_PHOTOS}장까지예요`);

  const requester = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  const updated = await prisma.photoDelivery.update({ where: { id: delivery.id }, data: { saveStatus: 'PENDING' } });

  void notify(delivery.photo.senderId, 'SAVE_REQUEST', {
    title: '사진 저장 요청',
    body: `${requester.displayName}님이 사진 저장을 요청했어요`,
    photoId: delivery.photoId,
    fromUserId: req.userId,
  });

  res.json({ delivery: updated });
});

// Anyone who can see a photo — its sender, or a recipient via PhotoDelivery
// — can comment on it. Throws notFound/forbidden otherwise.
async function assertPhotoAccess(photoId: string, userId: string) {
  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) throw notFound('사진');
  if (photo.senderId === userId) return photo;
  const delivery = await prisma.photoDelivery.findUnique({
    where: { photoId_userId: { photoId, userId } },
  });
  if (!delivery) throw forbidden('이 사진에 접근할 수 없어요');
  return photo;
}

function mapComment(c: { id: string; userId: string; text: string; createdAt: Date; user: { displayName: string } }) {
  return { id: c.id, userId: c.userId, displayName: c.user.displayName, text: c.text, createdAt: c.createdAt };
}

// Full thread for the story viewer's reactions sheet — top-level comments
// with their replies nested one level under each.
photosRouter.get('/:photoId/comments', async (req, res) => {
  await assertPhotoAccess(req.params.photoId, req.userId);
  const comments = await prisma.photoComment.findMany({
    where: { photoId: req.params.photoId, parentId: null },
    include: { user: true, replies: { include: { user: true }, orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json({
    comments: comments.map((c) => ({ ...mapComment(c), replies: c.replies.map(mapComment) })),
  });
});

const commentSchema = z.object({ text: z.string().min(1).max(200), parentId: z.string().optional() });

// A top-level comment notifies the photo's sender (unless they're the one
// commenting — e.g. replying to others on their own sent photo). A reply
// notifies whoever wrote the comment being replied to instead, since that's
// who the @mention actually reaches — not necessarily the photo's sender.
photosRouter.post('/:photoId/comments', async (req, res) => {
  const { text, parentId } = commentSchema.parse(req.body);
  const photo = await assertPhotoAccess(req.params.photoId, req.userId);

  let parent = null;
  if (parentId) {
    parent = await prisma.photoComment.findUnique({ where: { id: parentId } });
    if (!parent || parent.photoId !== req.params.photoId) throw notFound('댓글');
  }

  const [author, comment] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: req.userId } }),
    prisma.photoComment.create({
      data: { photoId: req.params.photoId, userId: req.userId, text, parentId: parent?.id },
      include: { user: true },
    }),
  ]);

  if (parent) {
    if (parent.userId !== req.userId) {
      void notify(parent.userId, 'PHOTO_REPLY', {
        title: '답글이 달렸어요',
        body: `${author.displayName}: ${text}`,
        photoId: req.params.photoId,
        fromUserId: req.userId,
      });
    }
  } else if (photo.senderId !== req.userId) {
    void notify(photo.senderId, 'PHOTO_REACTION', {
      title: '내 사진에 반응이 달렸어요',
      body: `${author.displayName}: ${text}`,
      photoId: req.params.photoId,
      fromUserId: req.userId,
    });
  }

  res.status(201).json({ comment: { ...mapComment(comment), replies: [] } });
});

const resolveSchema = z.object({ approve: z.boolean() });

photosRouter.post('/:photoId/deliveries/:userId/resolve-save', async (req, res) => {
  const { approve } = resolveSchema.parse(req.body);
  const photo = await prisma.photo.findUnique({ where: { id: req.params.photoId } });
  if (!photo) throw notFound('사진');
  if (photo.senderId !== req.userId) throw forbidden('보낸 사람만 승인/거절할 수 있어요');

  const delivery = await prisma.photoDelivery.findUnique({
    where: { photoId_userId: { photoId: req.params.photoId, userId: req.params.userId } },
  });
  if (!delivery || delivery.saveStatus !== 'PENDING') throw notFound('저장 요청');

  const updated = await prisma.photoDelivery.update({
    where: { id: delivery.id },
    data: approve
      ? { saveStatus: 'APPROVED', savedAt: new Date(), expiredAt: null }
      : { saveStatus: 'REJECTED' },
  });
  res.json({ delivery: updated });
});

// Lets the sender pull back a photo they shared before its 24h TTL expires
// (spec ask: "촬영한 사진을 찍은 사람은 삭제할 수 있도록").
photosRouter.delete('/:photoId', async (req, res) => {
  const photo = await prisma.photo.findUnique({ where: { id: req.params.photoId } });
  if (!photo) throw notFound('사진');
  if (photo.senderId !== req.userId) throw forbidden('보낸 사람만 삭제할 수 있어요');
  await prisma.photo.delete({ where: { id: photo.id } }); // cascades to deliveries
  await deletePhotoFile(photo.storageKey);
  res.status(204).end();
});

// Best-effort cleanup used by the TTL job when a Photo has zero remaining
// (non-expired) deliveries — removes the file from disk too.
export async function deletePhotoFile(storageKey: string) {
  await fs.rm(path.join(UPLOAD_DIR, storageKey), { force: true });
}
