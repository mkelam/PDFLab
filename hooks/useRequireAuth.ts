import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Hook to require authentication for admin pages
 * Redirects to login if not authenticated
 * Optionally checks for specific roles
 */
export function useRequireAuth(options?: string[] | { requiredRole?: string }) {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  // Support both old API (array) and new API (object with requiredRole)
  const allowedRoles = Array.isArray(options)
    ? options
    : options?.requiredRole
      ? [options.requiredRole, 'super_admin'] // Always allow super_admin
      : undefined

  useEffect(() => {
    // Wait for auth to load before redirecting
    if (isLoading) return

    // Not authenticated - redirect to login
    if (!user) {
      router.push('/login?redirect=/admin')
      return
    }

    // Check role permissions if specified
    if (allowedRoles && allowedRoles.length > 0) {
      const hasPermission = user.role && allowedRoles.includes(user.role)
      if (!hasPermission) {
        router.push('/')
        return
      }
    }
  }, [user, isLoading, router, allowedRoles])

  return { user, loading: isLoading }
}
