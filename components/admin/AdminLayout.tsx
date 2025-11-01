'use client'

import React from 'react'
import { AdminNav } from './AdminNav'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login?redirect=/admin')
    }
  }, [user, isLoading, router])

  // Check if user has admin role
  const isAdmin = user && ['support', 'finance', 'admin', 'super_admin'].includes(user.role || '')

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[oklch(0.12_0.01_250)]">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[oklch(0.12_0.01_250)]">
        <div className="glass-strong p-8 rounded-lg text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-4">You do not have permission to access the admin panel.</p>
          <a
            href="/"
            className="inline-block px-6 py-2 bg-[oklch(0.65_0.20_270)] text-white rounded-lg hover:bg-[oklch(0.70_0.20_270)] transition"
          >
            Return to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[oklch(0.12_0.01_250)] text-[oklch(0.90_0.01_250)]">
      {/* Admin Navigation */}
      <AdminNav />

      {/* Main Content */}
      <main className="pl-64 pt-16">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
