-- AlterTable
ALTER TABLE "listing_views" ADD COLUMN "sessionId" TEXT,
                             ADD COLUMN "source" TEXT,
                             ADD COLUMN "durationSeconds" INTEGER;

-- AddForeignKey (cascades delete when a listing is removed)
ALTER TABLE "listing_views" ADD CONSTRAINT "listing_views_homeId_fkey"
  FOREIGN KEY ("homeId") REFERENCES "homes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "listing_views_homeId_source_idx" ON "listing_views"("homeId", "source");
