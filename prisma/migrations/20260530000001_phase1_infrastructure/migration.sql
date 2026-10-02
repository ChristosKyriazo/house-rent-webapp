-- EmbeddingQueue: reliable, retried embedding generation
CREATE TABLE "embedding_queue" (
    "id" SERIAL NOT NULL,
    "homeId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "embedding_queue_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "embedding_queue_homeId_key" ON "embedding_queue"("homeId");
CREATE INDEX "embedding_queue_status_idx" ON "embedding_queue"("status");
ALTER TABLE "embedding_queue" ADD CONSTRAINT "embedding_queue_homeId_fkey"
    FOREIGN KEY ("homeId") REFERENCES "homes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SearchLog: track every search for analytics
CREATE TABLE "search_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "queryType" TEXT NOT NULL,
    "filters" JSONB,
    "resultCount" INTEGER NOT NULL,
    "executionMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "search_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "search_logs_userId_createdAt_idx" ON "search_logs"("userId", "createdAt" DESC);
CREATE INDEX "search_logs_queryType_createdAt_idx" ON "search_logs"("queryType", "createdAt" DESC);

-- ListingView: track who viewed what
CREATE TABLE "listing_views" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "homeId" INTEGER NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "listing_views_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "listing_views_homeId_viewedAt_idx" ON "listing_views"("homeId", "viewedAt" DESC);
CREATE INDEX "listing_views_userId_idx" ON "listing_views"("userId");

-- Composite indexes for common search patterns
CREATE INDEX "homes_finalized_city_created_idx" ON "homes"("finalized", "city", "createdAt" DESC);
CREATE INDEX "homes_finalized_area_created_idx" ON "homes"("finalized", "area", "createdAt" DESC);
CREATE INDEX "inquiries_user_home_finalized_idx" ON "inquiries"("userId", "homeId", "finalized");

-- Soft FK on Notification.userId (SET NULL on delete to preserve notification history)
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
