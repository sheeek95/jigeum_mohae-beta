/*
  Warnings:

  - You are about to drop the `InviteLink` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `inviteCode` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "InviteLink_usedById_key";

-- DropIndex
DROP INDEX "InviteLink_code_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "InviteLink";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarStart" TEXT NOT NULL DEFAULT '#FF9AA6',
    "avatarEnd" TEXT NOT NULL DEFAULT '#8A6BC7',
    "inviteCode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Backfill inviteCode for any pre-existing rows (production already has real
-- users) with a random 12-char hex code; every new user from here on gets a
-- proper base64url one from the app (routes/auth.ts).
INSERT INTO "new_User" ("avatarEnd", "avatarStart", "createdAt", "deviceId", "displayName", "id", "inviteCode") SELECT "avatarEnd", "avatarStart", "createdAt", "deviceId", "displayName", "id", lower(hex(randomblob(6))) FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_deviceId_key" ON "User"("deviceId");
CREATE UNIQUE INDEX "User_inviteCode_key" ON "User"("inviteCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
