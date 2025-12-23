/*
  Warnings:

  - The primary key for the `homes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `homes` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `ownerId` on the `homes` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `ratings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `ratings` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `ratedUserId` on the `ratings` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `raterId` on the `ratings` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `sessions` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `userId` on the `sessions` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `users` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The required column `key` was added to the `homes` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `key` was added to the `ratings` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `key` was added to the `sessions` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `key` was added to the `users` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_homes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "pricePerMonth" INTEGER NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "availableFrom" DATETIME NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "homes_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_homes" ("availableFrom", "bathrooms", "bedrooms", "city", "country", "createdAt", "description", "id", "ownerId", "pricePerMonth", "title", "updatedAt") SELECT "availableFrom", "bathrooms", "bedrooms", "city", "country", "createdAt", "description", "id", "ownerId", "pricePerMonth", "title", "updatedAt" FROM "homes";
DROP TABLE "homes";
ALTER TABLE "new_homes" RENAME TO "homes";
CREATE UNIQUE INDEX "homes_key_key" ON "homes"("key");
CREATE INDEX "homes_city_idx" ON "homes"("city");
CREATE INDEX "homes_ownerId_idx" ON "homes"("ownerId");
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
INSERT INTO "new_ratings" ("comment", "createdAt", "id", "ratedUserId", "raterId", "score", "type", "updatedAt") SELECT "comment", "createdAt", "id", "ratedUserId", "raterId", "score", "type", "updatedAt" FROM "ratings";
DROP TABLE "ratings";
ALTER TABLE "new_ratings" RENAME TO "ratings";
CREATE UNIQUE INDEX "ratings_key_key" ON "ratings"("key");
CREATE INDEX "ratings_ratedUserId_idx" ON "ratings"("ratedUserId");
CREATE INDEX "ratings_type_idx" ON "ratings"("type");
CREATE UNIQUE INDEX "ratings_raterId_ratedUserId_type_key" ON "ratings"("raterId", "ratedUserId", "type");
CREATE TABLE "new_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_sessions" ("createdAt", "expiresAt", "id", "userId") SELECT "createdAt", "expiresAt", "id", "userId" FROM "sessions";
DROP TABLE "sessions";
ALTER TABLE "new_sessions" RENAME TO "sessions";
CREATE UNIQUE INDEX "sessions_key_key" ON "sessions"("key");
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");
CREATE TABLE "new_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "age" INTEGER,
    "title" TEXT,
    "occupation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("age", "createdAt", "email", "id", "name", "occupation", "password", "title", "updatedAt") SELECT "age", "createdAt", "email", "id", "name", "occupation", "password", "title", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_key_key" ON "users"("key");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
