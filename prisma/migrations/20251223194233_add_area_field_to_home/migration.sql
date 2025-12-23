/*
  Warnings:

  - You are about to drop the `city_areas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `areaId` on the `homes` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "city_areas_city_area_key";

-- DropIndex
DROP INDEX "city_areas_city_idx";

-- DropIndex
DROP INDEX "city_areas_key_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "city_areas";
PRAGMA foreign_keys=on;

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
    "heating" TEXT,
    "sizeSqMeters" INTEGER,
    "yearBuilt" INTEGER,
    "yearRenovated" INTEGER,
    "availableFrom" DATETIME NOT NULL,
    "photos" TEXT,
    "ownerId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "homes_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_homes" ("availableFrom", "bathrooms", "bedrooms", "city", "country", "createdAt", "description", "floor", "heating", "id", "key", "listingType", "ownerId", "photos", "pricePerMonth", "sizeSqMeters", "street", "title", "updatedAt", "yearBuilt", "yearRenovated") SELECT "availableFrom", "bathrooms", "bedrooms", "city", "country", "createdAt", "description", "floor", "heating", "id", "key", "listingType", "ownerId", "photos", "pricePerMonth", "sizeSqMeters", "street", "title", "updatedAt", "yearBuilt", "yearRenovated" FROM "homes";
DROP TABLE "homes";
ALTER TABLE "new_homes" RENAME TO "homes";
CREATE UNIQUE INDEX "homes_key_key" ON "homes"("key");
CREATE INDEX "homes_city_idx" ON "homes"("city");
CREATE INDEX "homes_ownerId_idx" ON "homes"("ownerId");
CREATE INDEX "homes_listingType_idx" ON "homes"("listingType");
CREATE INDEX "homes_area_idx" ON "homes"("area");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
