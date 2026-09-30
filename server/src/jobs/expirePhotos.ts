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
  // Was every 5 minutes — that's exactly Neon's scale-to-zero idle window,
  // so the DB was being woken right as it was about to suspend, 24/7,
  // regardless of whether anyone was using the app. This alone likely did
  // more to burn the free tier's monthly compute-hour allowance than any
  // amount of in-app polling. A 24h TTL doesn't need finer than hourly
  // granularity — a photo lingering up to ~1h past its exact expiry is a
  // non-issue — and hourly leaves the DB a real ~55min idle window each run
  // to actually suspend.
  cron.schedule('7 * * * *', () => {
    expirePhotosOnce().catch((err) => console.error('[expiryJob] failed:', err));
  });
}
