-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceId" TEXT,
    "kakaoId" TEXT,
    "displayName" TEXT NOT NULL,
    "avatarStart" TEXT NOT NULL DEFAULT '#FF9AA6',
    "avatarEnd" TEXT NOT NULL DEFAULT '#8A6BC7',
    "inviteCode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("avatarEnd", "avatarStart", "createdAt", "deviceId", "displayName", "id", "inviteCode") SELECT "avatarEnd", "avatarStart", "createdAt", "deviceId", "displayName", "id", "inviteCode" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_deviceId_key" ON "User"("deviceId");
CREATE UNIQUE INDEX "User_kakaoId_key" ON "User"("kakaoId");
CREATE UNIQUE INDEX "User_inviteCode_key" ON "User"("inviteCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
