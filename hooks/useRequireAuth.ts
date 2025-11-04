import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Hook to require authentication for admin pages
 * Redirects to login if not authenticated
 * Optionally checks for specific roles
 */
export function useRequireAuth(allowedRoles?: string[]) {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
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
    }
  }, [user, loading, router, allowedRoles])

  return { user, loading }
}
