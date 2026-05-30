-- Enable pgvector extension (requires pgvector/pgvector:pg16 image)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add native vector column alongside the existing JSON embedding
ALTER TABLE "homes" ADD COLUMN IF NOT EXISTS "embeddingVec" vector(1536);

-- Populate from existing JSON embeddings (runs once, backfills existing rows)
UPDATE "homes"
SET "embeddingVec" = embedding::text::vector(1536)
WHERE embedding IS NOT NULL AND "embeddingVec" IS NULL;

-- HNSW index for fast cosine-distance search (m=16 is the standard default)
-- CONCURRENTLY avoids locking the table during index build
CREATE INDEX CONCURRENTLY IF NOT EXISTS "homes_embedding_vec_hnsw_idx"
  ON "homes" USING hnsw ("embeddingVec" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
