/**
 * Centralized API Configuration
 *
 * This file exports the API_URL constant that should be used throughout the application
 * for making backend API calls. It automatically reads from environment variables and
 * provides a fallback for local development.
 *
 * Usage:
 * ```typescript
 * import { API_URL } from '@/lib/api-config'
 *
 * const response = await fetch(`${API_URL}/api/endpoint`)
 * ```
 *
 * Environment Variables:
 * - Development (.env.local): NEXT_PUBLIC_API_URL=http://localhost:3006
 * - Production (.env.production): NEXT_PUBLIC_API_URL=http://141.136.44.168:3006
 *
 * The NEXT_PUBLIC_ prefix is required for client-side environment variables in Next.js.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

/**
 * Helper function to get auth token from localStorage
 * Only works on client-side (returns null during SSR)
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('authToken')
}

/**
 * Helper function to create fetch headers with authentication
 * Automatically includes Authorization header if token exists
 */
export function createAuthHeaders(contentType: string = 'application/json'): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': contentType,
  }

  const token = getAuthToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

/**
 * Type-safe API endpoints
 * Add new endpoints here as constants for better IDE autocomplete and refactoring
 */
export const API_ENDPOINTS = {
  // Authentication
  auth: {
    login: `${API_URL}/api/auth/login`,
    register: `${API_URL}/api/auth/register`,
    profile: `${API_URL}/api/auth/profile`,
    verifyEmail: `${API_URL}/api/auth/verify-email`,
    resendVerification: `${API_URL}/api/auth/resend-verification`,
    forgotPassword: `${API_URL}/api/auth/forgot-password`,
    resetPassword: `${API_URL}/api/auth/reset-password`,
  },

  // Conversion
  conversion: {
    upload: `${API_URL}/api/upload`,
    status: (jobId: string) => `${API_URL}/api/status/${jobId}`,
    download: (jobId: string) => `${API_URL}/api/download/${jobId}`,
    history: `${API_URL}/api/history`,
    merge: `${API_URL}/api/merge`,
  },

  // Payment (PayFast)
  payfast: {
    plans: `${API_URL}/api/payfast/plans`,
    initialize: `${API_URL}/api/payfast/initialize`,
    subscription: (id: string) => `${API_URL}/api/payfast/subscription/${id}`,
    cancelSubscription: `${API_URL}/api/payfast/cancel-subscription`,
  },

  // Admin
  admin: {
    users: {
      list: `${API_URL}/api/admin/users`,
      detail: (userId: string) => `${API_URL}/api/admin/users/${userId}`,
      update: (userId: string) => `${API_URL}/api/admin/users/${userId}`,
    },
    conversions: {
      list: `${API_URL}/api/admin/conversions`,
      detail: (jobId: string) => `${API_URL}/api/admin/conversions/${jobId}`,
    },
    payments: {
      list: `${API_URL}/api/admin/payments`,
      transactions: `${API_URL}/api/admin/payments/transactions`,
    },
    analytics: `${API_URL}/api/admin/analytics`,
    auditLogs: `${API_URL}/api/admin/audit-logs`,
    system: `${API_URL}/api/admin/system`,
  },
} as const
