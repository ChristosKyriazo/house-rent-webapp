-- AlterTable
ALTER TABLE "homes" ADD COLUMN     "embedding" JSONB;

-- AlterTable
ALTER TABLE "search_conversations" ADD COLUMN     "embedding" JSONB;
