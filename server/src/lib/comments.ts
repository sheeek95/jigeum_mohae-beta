import { prisma } from './prisma.js';

// Shared by /photos (sent-tab previews) and /groups/:id/photos (story-viewer
// ticker previews) — both only need a lightweight top-level preview, not the
// full thread with replies (that's GET /photos/:photoId/comments).
export async function topCommentsFor(photoId: string, take = 10) {
  const comments = await prisma.photoComment.findMany({
    where: { photoId, parentId: null },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
    take,
  });
  return comments.map((c) => ({ userId: c.userId, displayName: c.user.displayName, text: c.text }));
}
