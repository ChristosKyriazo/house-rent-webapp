-- Backfill photoTagsArray from legacy photoTags JSON string for any rows that missed the Phase 2 migration
UPDATE "homes"
SET "photoTagsArray" = ARRAY(
  SELECT jsonb_array_elements_text("photoTags"::jsonb)
)
WHERE "photoTags" IS NOT NULL
  AND "photoTags" <> 'null'
  AND "photoTags" <> '[]'
  AND array_length("photoTagsArray", 1) IS NULL;

-- Drop the legacy column now that photoTagsArray is the canonical source
ALTER TABLE "homes" DROP COLUMN IF EXISTS "photoTags";
