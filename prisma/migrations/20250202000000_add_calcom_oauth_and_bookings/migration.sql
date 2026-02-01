-- AlterTable: Add Cal.com OAuth fields
ALTER TABLE "users" ADD COLUMN "calComAccessToken" TEXT;
ALTER TABLE "users" ADD COLUMN "calComRefreshToken" TEXT;
ALTER TABLE "users" ADD COLUMN "calComTokenExpiresAt" DATETIME;

-- CreateTable: Bookings
CREATE TABLE "bookings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "inquiryId" INTEGER,
    "calComBookingId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bookings_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "bookings_key_key" ON "bookings"("key");
CREATE INDEX "bookings_userId_idx" ON "bookings"("userId");
CREATE INDEX "bookings_ownerId_idx" ON "bookings"("ownerId");
CREATE INDEX "bookings_startTime_idx" ON "bookings"("startTime");
CREATE INDEX "bookings_status_idx" ON "bookings"("status");



