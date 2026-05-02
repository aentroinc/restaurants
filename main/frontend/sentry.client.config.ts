/**
 * Sentry browser SDK init for AENTRO Restaurant OS.
 *
 * Disabled by default — enable by setting NEXT_PUBLIC_SENTRY_DSN in env.
 * The dependency `@sentry/nextjs` is loaded dynamically so missing it does
 * not break the build for environments that don't ship Sentry.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const Sentry = require("@sentry/nextjs")
  Sentry.init({
    dsn,
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || 0.1),
    replaysSessionSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_REPLAY_SAMPLE_RATE || 0.0),
    replaysOnErrorSampleRate: 1.0,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV || process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    integrations: [],
    beforeSend(event: unknown) {
      return event
    },
  })
  // Expose for soft-bind helpers (SentryUserBinder)
  ;(window as unknown as { Sentry?: unknown }).Sentry = Sentry
}

export {}
