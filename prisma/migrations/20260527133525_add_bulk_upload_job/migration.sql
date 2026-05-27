-- CreateTable
CREATE TABLE "bulk_upload_jobs" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "filePath" TEXT NOT NULL DEFAULT '',
    "options" JSONB NOT NULL DEFAULT '{}',
    "results" JSONB,
    "errors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_upload_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bulk_upload_jobs_userId_idx" ON "bulk_upload_jobs"("userId");

-- CreateIndex
CREATE INDEX "bulk_upload_jobs_status_idx" ON "bulk_upload_jobs"("status");

-- AddForeignKey
ALTER TABLE "bulk_upload_jobs" ADD CONSTRAINT "bulk_upload_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
