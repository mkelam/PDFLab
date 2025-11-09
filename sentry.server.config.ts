import * as Sentry from "@sentry/nextjs"

/**
 * Sentry Server-Side Configuration
 * Captures backend errors, API errors, and server-side performance metrics
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps
  environment: process.env.NODE_ENV,

  // Filter out sensitive data
  beforeSend(event) {
    // Remove sensitive user data
    if (event.user) {
      delete event.user.email
      delete event.user.ip_address
    }

    // Remove sensitive request data
    if (event.request) {
      delete event.request.cookies
      if (event.request.headers) {
        delete event.request.headers.authorization
        delete event.request.headers.cookie
      }
    }

    // Don't send events in development unless SENTRY_DEV=true
    if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEV) {
      return null
    }

    return event
  },

  // Ignore common non-critical errors
  ignoreErrors: [
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'NetworkError',
    'Failed to fetch',
  ],
})
