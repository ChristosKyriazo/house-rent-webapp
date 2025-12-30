/*
  Warnings:

  - You are about to drop the column `homeId` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `ownerId` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `read` on the `notifications` table. All the data in the column will be lost.
  - Added the required column `recipientId` to the `notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `notifications` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "areas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameGreek" TEXT,
    "city" TEXT,
    "cityGreek" TEXT,
    "country" TEXT,
    "countryGreek" TEXT,
    "safety" REAL,
    "vibe" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_homes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "street" TEXT,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "area" TEXT,
    "listingType" TEXT NOT NULL DEFAULT 'rent',
    "pricePerMonth" INTEGER NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "floor" INTEGER,
    "heatingCategory" TEXT,
    "heatingAgent" TEXT,
    "sizeSqMeters" INTEGER,
    "yearBuilt" INTEGER,
    "yearRenovated" INTEGER,
    "availableFrom" DATETIME NOT NULL,
    "photos" TEXT,
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "closestMetro" REAL,
    "closestBus" REAL,
    "closestSchool" REAL,
    "closestKindergarten" REAL,
    "closestHospital" REAL,
    "closestPark" REAL,
    "parking" BOOLEAN,
    "ownerId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "homes_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_homes" ("area", "availableFrom", "bathrooms", "bedrooms", "city", "country", "createdAt", "description", "floor", "heatingAgent", "heatingCategory", "id", "key", "listingType", "ownerId", "photos", "pricePerMonth", "sizeSqMeters", "street", "title", "updatedAt", "yearBuilt", "yearRenovated") SELECT "area", "availableFrom", "bathrooms", "bedrooms", "city", "country", "createdAt", "description", "floor", "heatingAgent", "heatingCategory", "id", "key", "listingType", "ownerId", "photos", "pricePerMonth", "sizeSqMeters", "street", "title", "updatedAt", "yearBuilt", "yearRenovated" FROM "homes";
DROP TABLE "homes";
ALTER TABLE "new_homes" RENAME TO "homes";
CREATE UNIQUE INDEX "homes_key_key" ON "homes"("key");
CREATE INDEX "homes_finalized_idx" ON "homes"("finalized");
CREATE INDEX "homes_city_idx" ON "homes"("city");
CREATE INDEX "homes_ownerId_idx" ON "homes"("ownerId");
CREATE INDEX "homes_listingType_idx" ON "homes"("listingType");
CREATE INDEX "homes_area_idx" ON "homes"("area");
CREATE TABLE "new_inquiries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "homeId" INTEGER NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "finalizedBy" INTEGER,
    "contactInfo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "inquiries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "inquiries_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "homes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_inquiries" ("createdAt", "homeId", "id", "key", "updatedAt", "userId") SELECT "createdAt", "homeId", "id", "key", "updatedAt", "userId" FROM "inquiries";
DROP TABLE "inquiries";
ALTER TABLE "new_inquiries" RENAME TO "inquiries";
CREATE UNIQUE INDEX "inquiries_key_key" ON "inquiries"("key");
CREATE INDEX "inquiries_userId_idx" ON "inquiries"("userId");
CREATE INDEX "inquiries_homeId_idx" ON "inquiries"("homeId");
CREATE INDEX "inquiries_approved_idx" ON "inquiries"("approved");
CREATE INDEX "inquiries_dismissed_idx" ON "inquiries"("dismissed");
CREATE INDEX "inquiries_finalized_idx" ON "inquiries"("finalized");
CREATE UNIQUE INDEX "inquiries_userId_homeId_key" ON "inquiries"("userId", "homeId");
CREATE TABLE "new_notifications" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "recipientId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "homeKey" TEXT,
    "userId" INTEGER,
    "ownerKey" TEXT,
    "inquiryId" INTEGER,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_notifications" ("createdAt", "id", "key", "updatedAt", "userId") SELECT "createdAt", "id", "key", "updatedAt", "userId" FROM "notifications";
DROP TABLE "notifications";
ALTER TABLE "new_notifications" RENAME TO "notifications";
CREATE UNIQUE INDEX "notifications_key_key" ON "notifications"("key");
CREATE INDEX "notifications_recipientId_idx" ON "notifications"("recipientId");
CREATE INDEX "notifications_deleted_idx" ON "notifications"("deleted");
CREATE INDEX "notifications_type_idx" ON "notifications"("type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "areas_key_key" ON "areas"("key");

-- CreateIndex
CREATE INDEX "areas_name_idx" ON "areas"("name");

-- CreateIndex
CREATE INDEX "areas_city_idx" ON "areas"("city");

-- CreateIndex
CREATE INDEX "areas_country_idx" ON "areas"("country");
