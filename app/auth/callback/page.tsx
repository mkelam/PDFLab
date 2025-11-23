"use client"

import { useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2 } from "lucide-react"

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setTokens } = useAuth()

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token')
      const refreshToken = searchParams.get('refreshToken')

      if (token && refreshToken) {
        try {
          // Store tokens and fetch user profile
          await setTokens(token, refreshToken)

          // Redirect to dashboard
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
  }, [searchParams, setTokens, router])

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
