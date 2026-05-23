import pino from 'pino'
import type { NextRequest } from 'next/server'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
    },
  }),
})

export function requestLogger(request: NextRequest, route?: string) {
  return logger.child({
    requestId: request.headers.get('x-request-id') ?? 'unknown',
    method: request.method,
    path: request.nextUrl.pathname,
    ...(route && { route }),
  })
}
