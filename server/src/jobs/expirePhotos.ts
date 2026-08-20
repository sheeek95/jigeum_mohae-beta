import cron from 'node-cron';

import { prisma } from '../lib/prisma.js';
import { deletePhotoFile } from '../routes/photos.js';

// Spec: "전송된 사진은 수신 24시간 후 자동 삭제 (배치 삭제 or TTL 기반)".
// Runs as a batch sweep rather than one timer per photo — simpler and cheap
// at MVP scale. A delivery whose recipient never got an APPROVED save request
// is hidden (expiredAt set); once every delivery for a Photo is resolved that
// way (nobody saved it), the Photo row and its file are deleted outright.
export async function expirePhotosOnce() {
  const now = new Date();
  const duePhotos = await prisma.photo.findMany({
    where: { expiresAt: { lte: now } },
    include: { deliveries: true },
  });

  for (const photo of duePhotos) {
    await prisma.photoDelivery.updateMany({
      where: { photoId: photo.id, expiredAt: null, saveStatus: { not: 'APPROVED' } },
      data: { expiredAt: now },
    });

    const hasApprovedCopy = photo.deliveries.some((d) => d.saveStatus === 'APPROVED');
    if (!hasApprovedCopy) {
      await prisma.photo.delete({ where: { id: photo.id } }); // cascades to deliveries
      await deletePhotoFile(photo.storageKey);
    }
  }

  return duePhotos.length;
}

export function startExpiryJob() {
  // Every 5 minutes is plenty granular for a 24h TTL and keeps this cheap.
  cron.schedule('*/5 * * * *', () => {
    expirePhotosOnce().catch((err) => console.error('[expiryJob] failed:', err));
  });
}
