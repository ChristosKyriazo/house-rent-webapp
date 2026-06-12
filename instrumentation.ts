export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')

    // Reset BulkUploadJobs stuck in 'processing' — they were abandoned by a prior container restart
    const { prisma } = await import('./lib/prisma')
    const staleThreshold = new Date(Date.now() - 30 * 60 * 1000) // 30 minutes
    const recovered = await prisma.bulkUploadJob.updateMany({
      where: { status: 'processing', updatedAt: { lt: staleThreshold } },
      data: { status: 'failed', errors: 'Job abandoned — container was restarted mid-processing. Re-upload to retry.' },
    })
    if (recovered.count > 0) {
      console.warn(`[startup] Reset ${recovered.count} stuck BulkUploadJob(s) to failed`)
    }
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
