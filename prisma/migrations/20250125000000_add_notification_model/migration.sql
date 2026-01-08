-- CreateTable
CREATE TABLE "notifications" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "homeId" INTEGER NOT NULL,
    "read" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "notifications_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "notifications_key_key" ON "notifications"("key");

-- CreateIndex
CREATE INDEX "notifications_ownerId_idx" ON "notifications"("ownerId");

-- CreateIndex
CREATE INDEX "notifications_read_idx" ON "notifications"("read");

-- CreateIndex
CREATE INDEX "notifications_homeId_idx" ON "notifications"("homeId");














