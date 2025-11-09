import * as Sentry from "@sentry/nextjs"

/**
 * Sentry Client-Side Configuration
 * Captures frontend errors, unhandled rejections, and performance metrics
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps
  environment: process.env.NODE_ENV,

  // Enable Session Replay
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter out sensitive data
  beforeSend(event) {
    // Remove sensitive user data
    if (event.user) {
      delete event.user.email
      delete event.user.ip_address
    }

    // Don't send events in development unless SENTRY_DEV=true
    if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEV) {
      return null
    }

    return event
  },

  // Ignore common non-critical errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'NetworkError',
    'Failed to fetch',
  ],
})
