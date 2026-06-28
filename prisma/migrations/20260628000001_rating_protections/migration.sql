-- Mutual-blind reveal: hidden until both sides of a moveout have rated, or 7 days pass
ALTER TABLE "ratings" ADD COLUMN "revealAt" TIMESTAMP(3);

-- Dispute flag: rated party can flag a rating for admin review (does not auto-hide)
ALTER TABLE "ratings" ADD COLUMN "flagged" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "ratings" ADD COLUMN "flagReason" TEXT;
ALTER TABLE "ratings" ADD COLUMN "flaggedAt" TIMESTAMP(3);

CREATE INDEX "ratings_revealAt_idx" ON "ratings"("revealAt");
CREATE INDEX "ratings_flagged_idx" ON "ratings"("flagged");
