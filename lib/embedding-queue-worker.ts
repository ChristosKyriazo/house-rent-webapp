import OpenAI from 'openai'
import { prisma } from './prisma'
import { processEmbeddingQueue } from './bulk-upload-processor'

const DRAIN_INTERVAL_MS = 5 * 60 * 1000
const STALE_PROCESSING_MS = 10 * 60 * 1000
const BATCH_SIZE = 10

let started = false

/**
 * Background worker that drains the EmbeddingQueue. Without it, rows enqueued
 * as 'pending' (e.g. by listing edits) are never processed — the inline
 * fire-and-forget calls only cover the create paths, and die on restart.
 */
export function startEmbeddingQueueWorker(): void {
  if (started) return
  started = true

  if (!process.env.OPENAI_API_KEY) {
    console.warn(
      '[embedding-queue] OPENAI_API_KEY is not set — embedding worker disabled; queued embeddings will NOT be generated'
    )
    return
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const drain = async () => {
    try {
      // Rows stuck in 'processing' were abandoned by a crash/restart — requeue them
      await prisma.embeddingQueue.updateMany({
        where: {
          status: 'processing',
          updatedAt: { lt: new Date(Date.now() - STALE_PROCESSING_MS) },
        },
        data: { status: 'pending' },
      })

      const pending = await prisma.embeddingQueue.findMany({
        where: { status: 'pending' },
        orderBy: { updatedAt: 'asc' },
        take: BATCH_SIZE,
      })

      for (const row of pending) {
        // processEmbeddingQueue handles its own retries/failCount bookkeeping
        await processEmbeddingQueue(row.homeId, openai, prisma)
      }
    } catch (err) {
      console.error('[embedding-queue] drain failed', err)
    }
  }

  setInterval(drain, DRAIN_INTERVAL_MS)
  // Drain once shortly after boot so a restart doesn't strand pending rows
  setTimeout(drain, 15_000)
}
