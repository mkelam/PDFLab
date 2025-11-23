'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-red-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 border-2 border-red-500">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-red-600"
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
                <h2 className="text-xl font-semibold text-red-900">Critical Error</h2>
              </div>
            </div>

            <p className="text-red-700 mb-4">
              A critical error occurred. Please refresh the page or contact support if the problem
              persists.
            </p>

            {process.env.NODE_ENV === 'development' && error && (
              <details className="mb-4">
                <summary className="text-sm font-medium text-red-800 cursor-pointer mb-2">
                  Error Details (Development Only)
                </summary>
                <div className="mt-2 p-3 bg-red-100 rounded">
                  <p className="text-xs font-semibold text-red-900 mb-1">Message:</p>
                  <p className="text-xs text-red-800 mb-2">{error.message}</p>
                  {error.digest && (
                    <>
                      <p className="text-xs font-semibold text-red-900 mb-1">Digest:</p>
                      <p className="text-xs text-red-800 mb-2">{error.digest}</p>
                    </>
                  )}
                  {error.stack && (
                    <>
                      <p className="text-xs font-semibold text-red-900 mb-1">Stack Trace:</p>
                      <pre className="text-xs text-red-800 overflow-auto max-h-48">
                        {error.stack}
                      </pre>
                    </>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={reset}
                className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
              >
                Reset Application
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-red-100 text-red-800 px-4 py-2 rounded hover:bg-red-200 transition"
              >
                Reload Page
              </button>
              <a
                href="/"
                className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition text-center"
              >
                Go to Homepage
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
