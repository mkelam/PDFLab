"use client"

import { useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2 } from "lucide-react"

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token')
      const refreshToken = searchParams.get('refreshToken')

      if (token && refreshToken) {
        try {
          // Store tokens in localStorage
          localStorage.setItem('authToken', token)
          localStorage.setItem('refreshToken', refreshToken)

          // Redirect to dashboard (AuthContext will pick up the tokens)
          router.push('/dashboard')
        } catch (error) {
          console.error('OAuth callback error:', error)
          router.push('/login?error=auth_failed')
        }
      } else {
        // No tokens, redirect to login with error
        router.push('/login?error=auth_failed')
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
