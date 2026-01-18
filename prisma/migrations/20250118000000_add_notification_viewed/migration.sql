-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "viewed" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "notifications_viewed_idx" ON "notifications"("viewed");

