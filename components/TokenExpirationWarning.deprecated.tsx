"use client"

import { useEffect, useState } from "react"

export function TokenExpirationWarning() {
  const [showWarning, setShowWarning] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState("")

  useEffect(() => {
    // Check for token expiration time in localStorage or session
    const checkTokenExpiration = () => {
      const expirationTime = localStorage.getItem("tokenExpiration")
      if (!expirationTime) return

      const now = Date.now()
      const expiration = parseInt(expirationTime, 10)
      const timeLeft = expiration - now

      // Show warning if less than 5 minutes remaining
      if (timeLeft > 0 && timeLeft < 5 * 60 * 1000) {
        setShowWarning(true)
        const minutes = Math.floor(timeLeft / 60000)
        const seconds = Math.floor((timeLeft % 60000) / 1000)
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`)
      } else {
        setShowWarning(false)
      }
    }

    checkTokenExpiration()
    const interval = setInterval(checkTokenExpiration, 1000)

    return () => clearInterval(interval)
  }, [])

  if (!showWarning) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md rounded-lg border border-yellow-500 bg-yellow-50 p-4 shadow-lg dark:bg-yellow-900/20">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-600 dark:text-yellow-400"
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
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Session Expiring Soon
          </h3>
          <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
            Your session will expire in {timeRemaining}. Please save your work.
          </p>
        </div>
        <button
          onClick={() => setShowWarning(false)}
          className="flex-shrink-0 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-200"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
