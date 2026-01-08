-- Apply University table migration directly
-- Run this in your database tool (DBeaver, etc.)

-- CreateTable
CREATE TABLE IF NOT EXISTS "universities" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "universities_key_key" ON "universities"("key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "universities_city_idx" ON "universities"("city");


