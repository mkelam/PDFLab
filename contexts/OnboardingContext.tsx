'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { fetchWithTokenRefresh } from '@/lib/api'
import { useAuth } from './AuthContext'

// =====================================================
// Types
// =====================================================

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped'

export interface OnboardingProgress {
  id: string
  user_id: string
  status: OnboardingStatus

  // Tour
  tour_completed: boolean
  tour_step_completed: number
  tour_last_seen_at: string | null

  // Conversion
  first_conversion_completed: boolean
  first_conversion_at: string | null

  // Wizard
  wizard_started: boolean
  wizard_completed: boolean
  wizard_last_step: number

  // Template
  sample_template_used: string | null

  // Completion
  completion_percentage: number
  started_at: string | null
  completed_at: string | null
  skipped_at: string | null

  created_at: string
  updated_at: string
}

export interface OnboardingTemplate {
  id: string
  name: string
  description: string
  file_size: number
  formatted_file_size: string
  recommended_format: 'pptx' | 'docx' | 'xlsx' | 'png'
  category: string
  category_display: string
  preview_image: string | null
  usage_count: number
}

interface OnboardingContextType {
  // State
  progress: OnboardingProgress | null
  templates: OnboardingTemplate[]
  isLoading: boolean
  error: string | null

  // Progress Methods
  fetchProgress: () => Promise<void>
  updateProgress: (updates: Partial<OnboardingProgress>) => Promise<void>
  completeOnboarding: () => Promise<void>
  skipOnboarding: () => Promise<void>

  // Template Methods
  fetchTemplates: () => Promise<void>
  convertTemplate: (templateId: string, outputFormat: string) => Promise<{ job_id: string }>

  // Helper Methods
  shouldShowOnboarding: () => boolean
  getNextStep: () => 'tour' | 'conversion' | 'wizard' | 'template' | null
}

// =====================================================
// Context
// =====================================================

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

// =====================================================
// Provider
// =====================================================

interface OnboardingProviderProps {
  children: ReactNode
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { isAuthenticated, user } = useAuth()
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // =====================================================
  // Fetch Progress
  // =====================================================

  const fetchProgress = async () => {
    if (!isAuthenticated) return

    try {
      setIsLoading(true)
      setError(null)

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'
      const response = await fetchWithTokenRefresh(`${API_URL}/api/onboarding/progress`)

      if (!response.ok) {
        throw new Error('Failed to fetch onboarding progress')
      }

      const data = await response.json()
      setProgress(data.progress)
    } catch (err) {
      console.error('Error fetching onboarding progress:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  // =====================================================
  // Update Progress
  // =====================================================

  const updateProgress = async (updates: Partial<OnboardingProgress>) => {
    if (!isAuthenticated) return

    try {
      setError(null)

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'
      const response = await fetchWithTokenRefresh(`${API_URL}/api/onboarding/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error('Failed to update onboarding progress')
      }

      const data = await response.json()

      // Refresh progress from server
      await fetchProgress()

      return data
    } catch (err) {
      console.error('Error updating onboarding progress:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // =====================================================
  // Complete Onboarding
  // =====================================================

  const completeOnboarding = async () => {
    if (!isAuthenticated) return

    try {
      setError(null)

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'
      const response = await fetchWithTokenRefresh(`${API_URL}/api/onboarding/complete`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to complete onboarding')
      }

      // Refresh progress from server
      await fetchProgress()
    } catch (err) {
      console.error('Error completing onboarding:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // =====================================================
  // Skip Onboarding
  // =====================================================

  const skipOnboarding = async () => {
    if (!isAuthenticated) return

    try {
      setError(null)

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'
      const response = await fetchWithTokenRefresh(`${API_URL}/api/onboarding/skip`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to skip onboarding')
      }

      // Refresh progress from server
      await fetchProgress()
    } catch (err) {
      console.error('Error skipping onboarding:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // =====================================================
  // Fetch Templates
  // =====================================================

  const fetchTemplates = async () => {
    if (!isAuthenticated) return

    try {
      setIsLoading(true)
      setError(null)

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'
      const response = await fetchWithTokenRefresh(`${API_URL}/api/onboarding/templates`)

      if (!response.ok) {
        throw new Error('Failed to fetch onboarding templates')
      }

      const data = await response.json()
      setTemplates(data.templates)
    } catch (err) {
      console.error('Error fetching onboarding templates:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  // =====================================================
  // Convert Template
  // =====================================================

  const convertTemplate = async (templateId: string, outputFormat: string) => {
    if (!isAuthenticated) {
      throw new Error('Authentication required')
    }

    try {
      setError(null)

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'
      const response = await fetchWithTokenRefresh(
        `${API_URL}/api/onboarding/templates/${templateId}/convert`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ output_format: outputFormat })
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to convert template')
      }

      const data = await response.json()

      // Refresh progress (template usage tracked automatically)
      await fetchProgress()

      return { job_id: data.job.id }
    } catch (err) {
      console.error('Error converting template:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // =====================================================
  // Helper: Should Show Onboarding
  // =====================================================

  const shouldShowOnboarding = (): boolean => {
    if (!isAuthenticated || !progress) return false

    // Don't show if user skipped or completed
    if (progress.status === 'skipped' || progress.status === 'completed') {
      return false
    }

    // Don't show if user has onboarding_completed flag (from users table)
    if (user?.onboarding_completed) {
      return false
    }

    // Show if not started or in progress
    return progress.status === 'not_started' || progress.status === 'in_progress'
  }

  // =====================================================
  // Helper: Get Next Step
  // =====================================================

  const getNextStep = (): 'tour' | 'conversion' | 'wizard' | 'template' | null => {
    if (!progress) return null

    // Check milestones in order
    if (!progress.tour_completed) {
      return 'tour'
    }

    if (!progress.first_conversion_completed) {
      return 'conversion'
    }

    if (!progress.wizard_completed) {
      return 'wizard'
    }

    if (!progress.sample_template_used) {
      return 'template'
    }

    // All milestones complete
    return null
  }

  // =====================================================
  // Effects
  // =====================================================

  // Fetch progress and templates when user logs in
  useEffect(() => {
    if (isAuthenticated) {
      fetchProgress()
      fetchTemplates()
    } else {
      // Reset state when user logs out
      setProgress(null)
      setTemplates([])
      setError(null)
    }
  }, [isAuthenticated])

  // =====================================================
  // Context Value
  // =====================================================

  const value: OnboardingContextType = {
    // State
    progress,
    templates,
    isLoading,
    error,

    // Progress Methods
    fetchProgress,
    updateProgress,
    completeOnboarding,
    skipOnboarding,

    // Template Methods
    fetchTemplates,
    convertTemplate,

    // Helper Methods
    shouldShowOnboarding,
    getNextStep
  }

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}

// =====================================================
// Hook
// =====================================================

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}
