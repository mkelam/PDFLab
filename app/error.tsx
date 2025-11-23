'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console
    console.error('App error:', error)

    // In production, you could log to an error reporting service here
    // For example: Sentry, LogRocket, etc.
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h2 className="text-xl font-semibold text-gray-900">Application Error</h2>
          </div>
        </div>

        <p className="text-gray-600 mb-4">
          The application encountered an unexpected error. Please try again.
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <details className="mb-4">
            <summary className="text-sm font-medium text-gray-700 cursor-pointer mb-2">
              Error Details (Development Only)
            </summary>
            <div className="mt-2 p-3 bg-gray-100 rounded">
              <p className="text-xs font-semibold text-gray-800 mb-1">Message:</p>
              <p className="text-xs text-gray-700 mb-2">{error.message}</p>
              {error.digest && (
                <>
                  <p className="text-xs font-semibold text-gray-800 mb-1">Digest:</p>
                  <p className="text-xs text-gray-700 mb-2">{error.digest}</p>
                </>
              )}
              {error.stack && (
                <>
                  <p className="text-xs font-semibold text-gray-800 mb-1">Stack Trace:</p>
                  <pre className="text-xs text-gray-700 overflow-auto max-h-48">
                    {error.stack}
                  </pre>
                </>
              )}
            </div>
          </details>
        )}

        <div className="flex gap-2">
          <button
            onClick={reset}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  )
}
