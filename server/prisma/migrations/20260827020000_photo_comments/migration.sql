-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PHOTO_REPLY';

-- DropForeignKey
ALTER TABLE "PhotoReaction" DROP CONSTRAINT "PhotoReaction_photoId_fkey";

-- DropForeignKey
ALTER TABLE "PhotoReaction" DROP CONSTRAINT "PhotoReaction_userId_fkey";

-- DropTable
DROP TABLE "PhotoReaction";

-- CreateTable
CREATE TABLE "PhotoComment" (
    "id" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhotoComment_photoId_createdAt_idx" ON "PhotoComment"("photoId", "createdAt");

-- AddForeignKey
ALTER TABLE "PhotoComment" ADD CONSTRAINT "PhotoComment_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoComment" ADD CONSTRAINT "PhotoComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoComment" ADD CONSTRAINT "PhotoComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PhotoComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

