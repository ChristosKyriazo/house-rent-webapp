-- Visitor notes: one encrypted note per (listing, visitor, author), replacing per-meeting
-- notes in the UI. Hand-written and guarded — a safe no-op on any database shape.
CREATE TABLE IF NOT EXISTS "visitor_notes" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "homeId" INTEGER NOT NULL,
    "visitorId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "visitor_notes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "visitor_notes_key_key" ON "visitor_notes"("key");
CREATE UNIQUE INDEX IF NOT EXISTS "visitor_notes_homeId_visitorId_authorId_key" ON "visitor_notes"("homeId", "visitorId", "authorId");
CREATE INDEX IF NOT EXISTS "visitor_notes_authorId_idx" ON "visitor_notes"("authorId");
CREATE INDEX IF NOT EXISTS "visitor_notes_visitorId_idx" ON "visitor_notes"("visitorId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visitor_notes_homeId_fkey') THEN
    ALTER TABLE "visitor_notes" ADD CONSTRAINT "visitor_notes_homeId_fkey"
      FOREIGN KEY ("homeId") REFERENCES "homes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visitor_notes_visitorId_fkey') THEN
    ALTER TABLE "visitor_notes" ADD CONSTRAINT "visitor_notes_visitorId_fkey"
      FOREIGN KEY ("visitorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visitor_notes_authorId_fkey') THEN
    ALTER TABLE "visitor_notes" ADD CONSTRAINT "visitor_notes_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
