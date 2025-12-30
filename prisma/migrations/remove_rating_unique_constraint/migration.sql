-- Remove unique constraint to allow multiple ratings between same users
-- This allows users to re-rate each other over time
-- SQLite doesn't support DROP CONSTRAINT, so we need to recreate the table

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Create new table without unique constraint on (raterId, ratedUserId, type)
CREATE TABLE "new_ratings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "raterId" INTEGER NOT NULL,
    "ratedUserId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ratings_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ratings_ratedUserId_fkey" FOREIGN KEY ("ratedUserId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Copy data from old table to new table
INSERT INTO "new_ratings" ("id", "key", "raterId", "ratedUserId", "type", "score", "comment", "createdAt", "updatedAt")
SELECT "id", "key", "raterId", "ratedUserId", "type", "score", "comment", "createdAt", "updatedAt"
FROM "ratings";

-- Drop old table
DROP TABLE "ratings";

-- Rename new table to original name
ALTER TABLE "new_ratings" RENAME TO "ratings";

-- Recreate indexes (without the unique constraint on raterId, ratedUserId, type)
CREATE UNIQUE INDEX "ratings_key_key" ON "ratings"("key");
CREATE INDEX "ratings_ratedUserId_idx" ON "ratings"("ratedUserId");
CREATE INDEX "ratings_type_idx" ON "ratings"("type");
CREATE INDEX "ratings_raterId_ratedUserId_type_idx" ON "ratings"("raterId", "ratedUserId", "type");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

