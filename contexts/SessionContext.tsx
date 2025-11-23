"use client"

import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface SessionContextType {
  sessionId: string | null
  isActive: boolean
  expiresAt: number | null
  refreshSession: () => void
  endSession: () => void
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)

  useEffect(() => {
    // Initialize or restore session
    const storedSessionId = localStorage.getItem("sessionId")
    const storedExpiresAt = localStorage.getItem("sessionExpiresAt")

    if (storedSessionId && storedExpiresAt) {
      const expiration = parseInt(storedExpiresAt, 10)
      if (expiration > Date.now()) {
        setSessionId(storedSessionId)
        setExpiresAt(expiration)
        setIsActive(true)
      } else {
        // Session expired, clean up
        endSession()
      }
    }
  }, [])

  /**
   * @deprecated This function is not currently used
   * @todo Remove in v2.0.0
   * Session management is handled by JWT expiry, not explicit refresh
   */
  const refreshSession = () => {
    console.warn('refreshSession() is deprecated and non-functional')
    // Keep function for backward compatibility
    // Will be removed in v2.0.0
    // Extend session by 30 minutes
    const newExpiresAt = Date.now() + 30 * 60 * 1000
    setExpiresAt(newExpiresAt)
    localStorage.setItem("sessionExpiresAt", newExpiresAt.toString())
    localStorage.setItem("tokenExpiration", newExpiresAt.toString())
  }

  /**
   * @deprecated This function is not currently used
   * @todo Remove in v2.0.0
   */
  const endSession = () => {
    console.warn('endSession() is deprecated and non-functional')
    // Keep function for backward compatibility
    // Will be removed in v2.0.0
    setSessionId(null)
    setIsActive(false)
    setExpiresAt(null)
    localStorage.removeItem("sessionId")
    localStorage.removeItem("sessionExpiresAt")
    localStorage.removeItem("tokenExpiration")
  }

  return (
    <SessionContext.Provider
      value={{
        sessionId,
        isActive,
        expiresAt,
        refreshSession,
        endSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider")
  }
  return context
}
