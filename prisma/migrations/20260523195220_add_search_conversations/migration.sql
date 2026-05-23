-- CreateTable
CREATE TABLE "search_conversations" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "userId" INTEGER,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "accumulatedFilters" JSONB NOT NULL DEFAULT '{}',
    "listingMode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "search_conversations_key_key" ON "search_conversations"("key");

-- CreateIndex
CREATE INDEX "search_conversations_userId_idx" ON "search_conversations"("userId");

-- CreateIndex
CREATE INDEX "search_conversations_createdAt_idx" ON "search_conversations"("createdAt");
