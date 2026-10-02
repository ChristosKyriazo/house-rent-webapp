-- Phase 2: photoTagsArray native column + clickedHomeId tracking

-- Add native TEXT[] column alongside legacy JSON string
ALTER TABLE "homes" ADD COLUMN IF NOT EXISTS "photoTagsArray" TEXT[] NOT NULL DEFAULT '{}';

-- Backfill from existing JSON (safe: skips nulls and invalid JSON)
UPDATE "homes"
SET "photoTagsArray" = ARRAY(
  SELECT jsonb_array_elements_text("photoTags"::jsonb)
)
WHERE "photoTags" IS NOT NULL
  AND "photoTags" != ''
  AND "photoTags" != '[]'
  AND "photoTags" ~ '^\[';

-- GIN index for fast tag containment queries (WHERE "photoTagsArray" @> ARRAY['balcony'])
CREATE INDEX IF NOT EXISTS "homes_photo_tags_array_gin_idx"
  ON "homes" USING GIN("photoTagsArray");

-- Track which home a user clicked after an AI search result
ALTER TABLE "ai_search_logs" ADD COLUMN IF NOT EXISTS "clickedHomeId" INTEGER;
