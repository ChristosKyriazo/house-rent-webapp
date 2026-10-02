export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')

    const { prisma } = await import('./lib/prisma')

    // Reset BulkUploadJobs stuck in 'processing' — they were abandoned by a prior container restart
    const staleThreshold = new Date(Date.now() - 30 * 60 * 1000) // 30 minutes
    const recovered = await prisma.bulkUploadJob.updateMany({
      where: { status: 'processing', updatedAt: { lt: staleThreshold } },
      data: { status: 'failed', errors: 'Job abandoned — container was restarted mid-processing. Re-upload to retry.' },
    })
    if (recovered.count > 0) {
      console.warn(`[startup] Reset ${recovered.count} stuck BulkUploadJob(s) to failed`)
    }

    // Purge completed EmbeddingQueue records older than 30 days — they serve no purpose once processed
    const embeddingCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const deletedEmbeddings = await prisma.embeddingQueue.deleteMany({
      where: { status: 'completed', updatedAt: { lt: embeddingCutoff } },
    })
    if (deletedEmbeddings.count > 0) {
      console.info(`[startup] Cleaned up ${deletedEmbeddings.count} completed EmbeddingQueue record(s)`)
    }

    // Purge ListingView records older than 1 year — analytics only needs recent history
    const viewCutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    const deletedViews = await prisma.listingView.deleteMany({
      where: { viewedAt: { lt: viewCutoff } },
    })
    if (deletedViews.count > 0) {
      console.info(`[startup] Purged ${deletedViews.count} ListingView record(s) older than 1 year`)
    }

    // Loud startup warning for the AI-description bug class: without this key,
    // bulk-upload descriptions silently fall back to raw text and embeddings
    // are never generated.
    if (!process.env.OPENAI_API_KEY) {
      console.warn('[startup] OPENAI_API_KEY is NOT set — AI descriptions, embeddings, and AI search are disabled')
    }

    // Drain pending/abandoned EmbeddingQueue rows on an interval (edits enqueue
    // rows but have no inline processor; inline calls also die on restart)
    const { startEmbeddingQueueWorker } = await import('./lib/embedding-queue-worker')
    startEmbeddingQueueWorker()
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
