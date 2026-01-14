-- AlterTable
ALTER TABLE "ai_search_logs" DROP COLUMN "matchCalculationPrompt";
ALTER TABLE "ai_search_logs" DROP COLUMN "matchCalculationResponse";
ALTER TABLE "ai_search_logs" DROP COLUMN "extractedFilters";
ALTER TABLE "ai_search_logs" ADD COLUMN "hardFilters" TEXT;
ALTER TABLE "ai_search_logs" ADD COLUMN "softFilters" TEXT;
ALTER TABLE "ai_search_logs" ADD COLUMN "distances" TEXT;

