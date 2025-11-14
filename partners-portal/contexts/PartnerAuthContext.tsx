'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface Partner {
  id: string
  slug: string
  name: string
  email: string
  platform: string
  status: string
}

interface PartnerAuthContextType {
  partner: Partner | null
  loading: boolean
  login: (slug: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const PartnerAuthContext = createContext<PartnerAuthContextType | undefined>(undefined)

export function PartnerAuthProvider({ children }: { children: ReactNode }) {
  const [partner, setPartner] = useState<Partner | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if partner is already logged in (check localStorage)
    const checkAuth = () => {
      try {
        const storedPartner = localStorage.getItem('partner')
        const partnerSlug = localStorage.getItem('partnerSlug')

        if (storedPartner && partnerSlug) {
          setPartner(JSON.parse(storedPartner))
        }
      } catch (error) {
        console.error('Auth check error:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (slug: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/partners/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slug, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.message || 'Login failed' }
      }

      const data = await response.json()

      // Store partner data and slug
      localStorage.setItem('partner', JSON.stringify(data.partner))
      localStorage.setItem('partnerSlug', data.partner.slug)

      setPartner(data.partner)

      // Redirect to dashboard
      router.push(`/${data.partner.slug}`)

      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Unable to connect to server' }
    }
  }

  const logout = () => {
    localStorage.removeItem('partner')
    localStorage.removeItem('partnerSlug')
    setPartner(null)
    router.push('/login')
  }

  return (
    <PartnerAuthContext.Provider value={{ partner, loading, login, logout }}>
      {children}
    </PartnerAuthContext.Provider>
  )
}

export function usePartnerAuth() {
  const context = useContext(PartnerAuthContext)
  if (context === undefined) {
    throw new Error('usePartnerAuth must be used within a PartnerAuthProvider')
  }
  return context
}

// Hook to require authentication
export function useRequirePartnerAuth() {
  const { partner, loading } = usePartnerAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !partner) {
      router.push('/login')
    }
  }, [partner, loading, router])

  return { partner, loading }
}
