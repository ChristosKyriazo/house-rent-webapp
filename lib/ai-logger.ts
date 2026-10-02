import pino from 'pino'

const log = pino({ name: 'ai-calls' })

type AITask =
  | 'filter_extraction'
  | 'description_generation'
  | 'vision_analysis'
  | 'chat_turn'
  | 'embedding'
  | 'bulk_normalization'

interface AICallMeta {
  task: AITask
  model: string
  userId?: number | null
  inputTokens?: number
  outputTokens?: number
  latencyMs: number
  success: boolean
  error?: string
}

export function logAICall(meta: AICallMeta) {
  const costEstimateCents = estimateCost(meta.model, meta.inputTokens ?? 0, meta.outputTokens ?? 0)
  if (meta.success) {
    log.info({ ...meta, costEstimateCents }, 'ai call completed')
  } else {
    log.warn({ ...meta, costEstimateCents }, 'ai call failed')
  }
}

// Rough cost estimates in cents per 1M tokens (input / output)
const MODEL_COSTS: Record<string, [number, number]> = {
  'gpt-4o':         [250,  1000],
  'gpt-4o-mini':    [15,   60],
  'gpt-3.5-turbo':  [50,   150],
  'text-embedding-3-small': [2, 0],
  'text-embedding-3-large': [13, 0],
}

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[model] ?? MODEL_COSTS['gpt-4o-mini']
  return Math.round(
    (inputTokens / 1_000_000) * costs[0] +
    (outputTokens / 1_000_000) * costs[1]
  )
}

// Exposed for the usage assistant's cost estimates. Same MODEL_COSTS table as
// the live per-call logging above, so reported and logged costs stay consistent.
export function estimateAiSearchCost(model: string, inputTokens: number, outputTokens: number): number {
  return estimateCost(model, inputTokens, outputTokens)
}
