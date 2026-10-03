import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  debug: false,
  // Meeting notes are GDPR-sensitive. Sentry attaches request bodies to server errors by
  // default; never let a note's text (or the query that addressed it) leave the server.
  beforeSend(event) {
    if (event.request?.url?.includes('/api/meeting-notes')) {
      delete event.request.data
      delete event.request.query_string
    }
    return event
  },
})
