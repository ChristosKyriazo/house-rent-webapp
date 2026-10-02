-- AlterTable: add direct homeId link to bookings
ALTER TABLE "bookings" ADD COLUMN "homeId" INTEGER;

-- Backfill from inquiries (covers most existing bookings)
UPDATE "bookings"
SET "homeId" = (
  SELECT "homeId" FROM "inquiries"
  WHERE "inquiries"."id" = "bookings"."inquiryId"
)
WHERE "inquiryId" IS NOT NULL;

-- Backfill remaining from availabilities
UPDATE "bookings"
SET "homeId" = (
  SELECT "homeId" FROM "availabilities"
  WHERE "availabilities"."id" = "bookings"."availabilityId"
)
WHERE "homeId" IS NULL AND "availabilityId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "bookings_homeId_idx" ON "bookings"("homeId");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_homeId_fkey"
  FOREIGN KEY ("homeId") REFERENCES "homes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
