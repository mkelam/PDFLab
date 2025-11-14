'use client'

import React, { useState, useEffect } from 'react'
import { Clock, Sparkles, ArrowRight, X } from 'lucide-react'
import { Button } from './ui/button'
import Link from 'next/link'

interface BetaExpirationTimerProps {
  expiresAt: string
  placement?: 'dashboard' | 'banner' | 'modal'
  onDismiss?: () => void
}

type UrgencyLevel = 'none' | 'low' | 'medium' | 'high' | 'critical'

interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  urgencyLevel: UrgencyLevel
}

function calculateTimeRemaining(expiresAt: string): TimeRemaining {
  const now = new Date().getTime()
  const expiration = new Date(expiresAt).getTime()
  const diff = expiration - now

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, urgencyLevel: 'critical' }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  // Determine urgency level
  let urgencyLevel: UrgencyLevel = 'none'
  if (days === 0) {
    urgencyLevel = 'critical' // Last day
  } else if (days <= 3) {
    urgencyLevel = 'high' // 1-3 days
  } else if (days <= 7) {
    urgencyLevel = 'medium' // 4-7 days
  } else if (days <= 30) {
    urgencyLevel = 'low' // 8-30 days
  }

  return { days, hours, minutes, urgencyLevel }
}

export function BetaExpirationTimer({
  expiresAt,
  placement = 'dashboard',
  onDismiss
}: BetaExpirationTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(
    calculateTimeRemaining(expiresAt)
  )
  const [isDismissed, setIsDismissed] = useState(false)

  // Update every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(expiresAt))
    }, 60000) // 1 minute

    return () => clearInterval(interval)
  }, [expiresAt])

  // Check localStorage for dismissal (only for low/medium urgency)
  useEffect(() => {
    if (timeRemaining.urgencyLevel === 'low' || timeRemaining.urgencyLevel === 'medium') {
      const dismissedUntil = localStorage.getItem('betaTimerDismissedUntil')
      if (dismissedUntil) {
        const dismissTime = new Date(dismissedUntil).getTime()
        const now = new Date().getTime()
        if (now < dismissTime) {
          setIsDismissed(true)
        } else {
          localStorage.removeItem('betaTimerDismissedUntil')
        }
      }
    }
  }, [timeRemaining.urgencyLevel])

  const handleDismiss = () => {
    setIsDismissed(true)
    if (onDismiss) onDismiss()

    // Dismiss for 24 hours
    const dismissUntil = new Date()
    dismissUntil.setHours(dismissUntil.getHours() + 24)
    localStorage.setItem('betaTimerDismissedUntil', dismissUntil.toISOString())
  }

  // Don't show if more than 30 days remaining
  if (timeRemaining.days > 30) {
    return null
  }

  // Don't show if dismissed (except for high/critical urgency)
  if (isDismissed && (timeRemaining.urgencyLevel === 'low' || timeRemaining.urgencyLevel === 'medium')) {
    return null
  }

  // Get styling based on urgency
  const getStyles = () => {
    switch (timeRemaining.urgencyLevel) {
      case 'critical':
        return {
          container: 'bg-red-500/10 border-red-500 dark:bg-red-500/20',
          icon: 'text-red-600 dark:text-red-400',
          text: 'text-red-900 dark:text-red-100',
          progress: 'bg-red-500',
          button: 'bg-red-600 hover:bg-red-700'
        }
      case 'high':
        return {
          container: 'bg-orange-500/10 border-orange-500 dark:bg-orange-500/20',
          icon: 'text-orange-600 dark:text-orange-400',
          text: 'text-orange-900 dark:text-orange-100',
          progress: 'bg-orange-500',
          button: 'bg-orange-600 hover:bg-orange-700'
        }
      case 'medium':
        return {
          container: 'bg-yellow-500/10 border-yellow-500 dark:bg-yellow-500/20',
          icon: 'text-yellow-600 dark:text-yellow-400',
          text: 'text-yellow-900 dark:text-yellow-100',
          progress: 'bg-yellow-500',
          button: 'bg-yellow-600 hover:bg-yellow-700'
        }
      default:
        return {
          container: 'bg-blue-500/10 border-blue-500 dark:bg-blue-500/20',
          icon: 'text-blue-600 dark:text-blue-400',
          text: 'text-blue-900 dark:text-blue-100',
          progress: 'bg-blue-500',
          button: 'bg-blue-600 hover:bg-blue-700'
        }
    }
  }

  const styles = getStyles()

  // Get message based on urgency
  const getMessage = () => {
    const { days, hours } = timeRemaining

    if (days === 0) {
      if (hours === 0) {
        return 'Your beta access expires in less than 1 hour!'
      }
      return `Your beta access expires in ${hours} hour${hours > 1 ? 's' : ''}!`
    }

    if (days === 1) {
      return 'Only 1 day left in your beta trial!'
    }

    if (days <= 3) {
      return `Only ${days} days remaining in your beta trial!`
    }

    if (days <= 7) {
      return `${days} days left to experience Pro features`
    }

    return `${days} days of beta access remaining`
  }

  const getCTA = () => {
    if (timeRemaining.urgencyLevel === 'critical') {
      return 'Upgrade Now to Keep Access'
    }
    if (timeRemaining.urgencyLevel === 'high') {
      return 'Upgrade to Pro'
    }
    return 'View Plans'
  }

  // Calculate progress percentage (30 days = 100%)
  const totalDays = 30
  const progressPercentage = Math.max(0, Math.min(100, ((totalDays - timeRemaining.days) / totalDays) * 100))

  // Dashboard card variant
  if (placement === 'dashboard') {
    return (
      <div className={`glass-strong rounded-lg border-2 p-4 ${styles.container}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Clock className={`w-5 h-5 mt-0.5 ${styles.icon}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className={`w-4 h-4 ${styles.icon}`} />
                <h3 className={`font-semibold ${styles.text}`}>Beta Access</h3>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-white/50 dark:bg-black/30 rounded-full h-2 mb-3">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${styles.progress}`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              <p className={`text-sm font-medium mb-1 ${styles.text}`}>
                {getMessage()}
              </p>
              <p className="text-sm text-muted-foreground">
                Expires {new Date(expiresAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Dismiss button for low/medium urgency */}
          {(timeRemaining.urgencyLevel === 'low' || timeRemaining.urgencyLevel === 'medium') && (
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mt-4">
          <Button asChild className={styles.button}>
            <Link href="/pricing?source=beta-timer">
              {getCTA()}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/pricing">
              Learn More
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // Banner variant (for headers)
  if (placement === 'banner') {
    return (
      <div className={`glass-strong border-l-4 p-3 ${styles.container}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className={`w-5 h-5 ${styles.icon}`} />
            <div>
              <p className={`text-sm font-semibold ${styles.text}`}>
                {getMessage()}
              </p>
              <p className="text-xs text-muted-foreground">
                Upgrade to keep unlimited conversions and premium features
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild size="sm" className={styles.button}>
              <Link href="/pricing?source=beta-timer-banner">
                {getCTA()}
              </Link>
            </Button>
            {(timeRemaining.urgencyLevel === 'low' || timeRemaining.urgencyLevel === 'medium') && (
              <Button variant="ghost" size="sm" onClick={handleDismiss}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Modal variant (for critical urgency)
  if (placement === 'modal' && timeRemaining.urgencyLevel === 'critical') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className={`glass-strong max-w-md w-full mx-4 p-6 rounded-lg border-2 ${styles.container}`}>
          <div className="flex items-start gap-3 mb-4">
            <Clock className={`w-6 h-6 ${styles.icon}`} />
            <div>
              <h2 className={`text-xl font-bold mb-2 ${styles.text}`}>
                {getMessage()}
              </h2>
              <p className="text-sm text-muted-foreground">
                Your beta access is ending soon. Upgrade now to avoid losing access to premium features like unlimited conversions, advanced compression, and batch processing.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button asChild className={`w-full ${styles.button}`}>
              <Link href="/pricing?source=beta-timer-modal">
                {getCTA()}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/pricing">
                Compare Plans
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
