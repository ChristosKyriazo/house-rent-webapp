-- CreateTable
CREATE TABLE "ai_search_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "userId" INTEGER,
    "userQuery" TEXT NOT NULL,
    "filterExtractionPrompt" TEXT,
    "filterExtractionResponse" TEXT,
    "extractedFilters" TEXT,
    "homesCountBeforeFilter" INTEGER NOT NULL,
    "homesCountAfterFilter" INTEGER NOT NULL,
    "matchCalculationPrompt" TEXT,
    "matchCalculationResponse" TEXT,
    "finalHomesCount" INTEGER NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_search_logs_key_key" ON "ai_search_logs"("key");

-- CreateIndex
CREATE INDEX "ai_search_logs_userId_idx" ON "ai_search_logs"("userId");

-- CreateIndex
CREATE INDEX "ai_search_logs_createdAt_idx" ON "ai_search_logs"("createdAt");





