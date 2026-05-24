import pino from 'pino'
import type { NextRequest } from 'next/server'

function makeLogger() {
  const level = process.env.LOG_LEVEL ?? 'info'
  if (process.env.NODE_ENV === 'development') {
    // Sync inline stream avoids the worker thread that transport spawns,
    // which crashes on every Turbopack hot reload.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const stream = require('pino-pretty')({ sync: true, colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' })
    return pino({ level }, stream)
  }
  return pino({ level })
}

export const logger = makeLogger()

export function requestLogger(request: NextRequest, route?: string) {
  return logger.child({
    requestId: request.headers.get('x-request-id') ?? 'unknown',
    method: request.method,
    path: request.nextUrl.pathname,
    ...(route && { route }),
  })
}
