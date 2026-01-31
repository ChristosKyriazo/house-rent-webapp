-- CreateTable: Availabilities
CREATE TABLE "availabilities" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "homeId" INTEGER NOT NULL,
    "inquiryId" INTEGER,
    "date" DATETIME NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "availabilities_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "homes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "availabilities_key_key" ON "availabilities"("key");
CREATE INDEX "availabilities_homeId_idx" ON "availabilities"("homeId");
CREATE INDEX "availabilities_inquiryId_idx" ON "availabilities"("inquiryId");
CREATE INDEX "availabilities_date_idx" ON "availabilities"("date");
CREATE INDEX "availabilities_isAvailable_idx" ON "availabilities"("isAvailable");

-- AlterTable: Add availabilityId to bookings
ALTER TABLE "bookings" ADD COLUMN "availabilityId" INTEGER;

-- CreateIndex
CREATE INDEX "bookings_availabilityId_idx" ON "bookings"("availabilityId");

-- Add foreign key constraint
-- Note: SQLite doesn't support adding foreign keys to existing tables easily
-- The constraint will be enforced at application level

