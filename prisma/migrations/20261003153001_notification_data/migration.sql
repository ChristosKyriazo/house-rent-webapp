-- Structured extras for a notification. Used by `new_listing_match` to carry the match
-- percentage and its top reasons, so alerts can say *why* a listing matched.
-- Nullable and guarded: a safe no-op on every database shape.
ALTER TABLE IF EXISTS "notifications" ADD COLUMN IF NOT EXISTS "data" JSONB;
