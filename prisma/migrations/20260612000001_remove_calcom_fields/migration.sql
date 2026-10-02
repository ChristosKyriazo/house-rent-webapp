-- Cal.com integration removed.
--
-- This migration originally targeted ALTER TABLE "User", a table that has never
-- existed: the User model has been @@map("users") since the init migration. On
-- the long-lived staging and production databases the migration was recorded as
-- applied without ever succeeding, so the error went unnoticed — but on a FRESH
-- database `prisma migrate deploy` aborted here with 42P01 (relation does not
-- exist), making it impossible to provision a new environment or restore from
-- backup.
--
-- Rewritten to be a safe no-op on any database shape:
--   ALTER TABLE IF EXISTS  — tolerates the table being absent
--   DROP COLUMN IF EXISTS  — tolerates the column being absent
-- Both spellings are covered so the intent survives regardless of history.
ALTER TABLE IF EXISTS "users" DROP COLUMN IF EXISTS "calComUsername";
ALTER TABLE IF EXISTS "users" DROP COLUMN IF EXISTS "calComAccessToken";
ALTER TABLE IF EXISTS "users" DROP COLUMN IF EXISTS "calComRefreshToken";
ALTER TABLE IF EXISTS "users" DROP COLUMN IF EXISTS "calComTokenExpiresAt";

ALTER TABLE IF EXISTS "User" DROP COLUMN IF EXISTS "calComUsername";
ALTER TABLE IF EXISTS "User" DROP COLUMN IF EXISTS "calComAccessToken";
ALTER TABLE IF EXISTS "User" DROP COLUMN IF EXISTS "calComRefreshToken";
ALTER TABLE IF EXISTS "User" DROP COLUMN IF EXISTS "calComTokenExpiresAt";
