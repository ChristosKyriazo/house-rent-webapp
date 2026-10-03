-- Meeting notes: owner/broker private notes per scheduled meeting (booking).
-- Text is stored ONLY as AES-256-GCM ciphertext (lib/crypto/meeting-notes.ts).
--
-- Hand-written on purpose: `prisma migrate dev` also generated DROP statements for
-- indexes and a foreign key that earlier migrations created by hand (schema drift).
-- Those must not be dropped in production, so this migration only adds the new table.
-- Every statement is guarded so it is a safe no-op on any database shape.

CREATE TABLE IF NOT EXISTS "meeting_notes" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_notes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "meeting_notes_key_key" ON "meeting_notes"("key");
CREATE INDEX IF NOT EXISTS "meeting_notes_authorId_idx" ON "meeting_notes"("authorId");
CREATE UNIQUE INDEX IF NOT EXISTS "meeting_notes_bookingId_authorId_key" ON "meeting_notes"("bookingId", "authorId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meeting_notes_bookingId_fkey') THEN
    ALTER TABLE "meeting_notes" ADD CONSTRAINT "meeting_notes_bookingId_fkey"
      FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meeting_notes_authorId_fkey') THEN
    ALTER TABLE "meeting_notes" ADD CONSTRAINT "meeting_notes_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
