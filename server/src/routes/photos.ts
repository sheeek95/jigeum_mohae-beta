import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { z } from 'zod';

import { badRequest, forbidden, notFound } from '../lib/errors.js';
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

  const groups = await prisma.group.findMany({
    where: { id: { in: targetGroupIds }, ownerId: req.userId },
    include: { members: true },
  });
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

  res.status(201).json({ photos, url: `/uploads/${filename}` });
});

photosRouter.get('/widget/latest', async (req, res) => {
  const delivery = await prisma.photoDelivery.findFirst({
    where: { userId: req.userId, expiredAt: null, photo: { expiresAt: { gt: new Date() } } },
    include: { photo: { include: { sender: true } } },
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
      createdAt: delivery.photo.createdAt,
    },
  });
});

photosRouter.get('/received', async (req, res) => {
  const deliveries = await prisma.photoDelivery.findMany({
    where: { userId: req.userId, expiredAt: null },
    include: { photo: { include: { sender: true } } },
    orderBy: { photo: { createdAt: 'desc' } },
  });
  res.json({
    items: deliveries.map((d) => ({
      deliveryId: d.id,
      photoId: d.photoId,
      url: `/uploads/${d.photo.storageKey}`,
      caption: d.photo.caption,
      senderName: d.photo.sender.displayName,
      createdAt: d.photo.createdAt,
      expiresAt: d.photo.expiresAt,
      saveStatus: d.saveStatus,
    })),
  });
});

photosRouter.get('/sent', async (req, res) => {
  const photos = await prisma.photo.findMany({
    where: { senderId: req.userId },
    include: { deliveries: { include: { user: true } }, group: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    items: photos.map((p) => ({
      photoId: p.id,
      url: `/uploads/${p.storageKey}`,
      caption: p.caption,
      targetName: p.group?.name ?? '알 수 없음',
      createdAt: p.createdAt,
      expiresAt: p.expiresAt,
      deliveries: p.deliveries.map((d) => ({
        deliveryId: d.id,
        userId: d.userId,
        displayName: d.user.displayName,
        saveStatus: d.saveStatus,
      })),
    })),
  });
});

photosRouter.post('/:photoId/request-save', async (req, res) => {
  const delivery = await prisma.photoDelivery.findUnique({
    where: { photoId_userId: { photoId: req.params.photoId, userId: req.userId } },
  });
  if (!delivery) throw notFound('받은 사진');
  if (delivery.saveStatus !== 'NONE') throw badRequest('이미 요청했거나 처리된 사진이에요');
  const updated = await prisma.photoDelivery.update({ where: { id: delivery.id }, data: { saveStatus: 'PENDING' } });
  res.json({ delivery: updated });
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
