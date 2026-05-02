/**
 * Sentry edge runtime SDK init (middleware / edge functions).
 */
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const Sentry = require("@sentry/nextjs")
  Sentry.init({
    dsn,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.05),
    environment: process.env.SENTRY_ENV || process.env.NODE_ENV,
  })
}

export {}
