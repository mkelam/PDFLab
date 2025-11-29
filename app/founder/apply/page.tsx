'use client'

import React, { useState, useEffect } from 'react'
import { FounderApplicationForm } from '@/components/FounderApplicationForm'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Crown,
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  MessageSquare,
  Users,
  Zap
} from 'lucide-react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

interface ApplicationStatus {
  founder_application_status: string
  founder_application_submitted_at?: string
  founder_application_reviewed_at?: string
  founder_rejection_reason?: string
  founder_status?: string
  founder_deadline?: string
}

export default function FounderApplyPage() {
  const router = useRouter()
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [spotsRemaining, setSpotsRemaining] = useState<number | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (!token) {
      router.push('/login?redirect=/founder/apply')
      return
    }

    fetchApplicationStatus()
    fetchSpotsRemaining()
  }, [])

  const fetchApplicationStatus = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/founder/my-application`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setApplicationStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch application status:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSpotsRemaining = async () => {
    try {
      const response = await fetch(`${API_URL}/api/founder/spots`)
      if (response.ok) {
        const data = await response.json()
        setSpotsRemaining(data.spots_remaining)
      }
    } catch (error) {
      console.error('Failed to fetch spots:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // User already has an application
  if (applicationStatus && applicationStatus.founder_application_status !== 'none') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-foreground mb-2">Founder's Edition</h1>
            <p className="text-muted-foreground">Application Status</p>
          </div>

          <Card className="glass-strong border-border/50">
            <CardContent className="pt-8 pb-8">
              {applicationStatus.founder_application_status === 'pending' && (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-yellow-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Application Under Review</h3>
                  <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                    Our team is reviewing your application. You'll receive an email notification with our decision within 24-48 hours.
                  </p>
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    Pending Review
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-4">
                    Submitted: {new Date(applicationStatus.founder_application_submitted_at!).toLocaleDateString()}
                  </p>
                </div>
              )}

              {applicationStatus.founder_application_status === 'approved' && (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Application Approved!</h3>
                  <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                    Congratulations! Your application has been approved. Check your dashboard to start the 14-day challenge.
                  </p>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition"
                  >
                    Go to Dashboard
                  </button>
                </div>
              )}

              {applicationStatus.founder_application_status === 'rejected' && (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                    <XCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Application Not Approved</h3>
                  <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                    Unfortunately, we're unable to approve your application at this time.
                  </p>
                  {applicationStatus.founder_rejection_reason && (
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 max-w-md mx-auto mb-4">
                      <p className="text-sm font-medium text-red-400 mb-1">Reason:</p>
                      <p className="text-sm text-red-300">{applicationStatus.founder_rejection_reason}</p>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    You can still use PDFLab with a regular account.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Show application form
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-foreground mb-2">Founder's Edition</h1>
          <p className="text-xl text-muted-foreground mb-4">
            Join the first 100 users and earn lifetime access
          </p>
          {spotsRemaining !== null && (
            <Badge className="bg-primary/20 text-primary border-primary/30 text-lg px-4 py-1">
              {spotsRemaining} of 100 spots remaining
            </Badge>
          )}
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <Card className="glass-strong border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-1">Lifetime Access</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete the 14-day challenge to earn lifetime Pro access - no subscription needed
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-strong border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-1">Shape the Product</h3>
                  <p className="text-sm text-muted-foreground">
                    Your feedback directly influences PDFLab's roadmap and features
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-strong border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-1">Exclusive Community</h3>
                  <p className="text-sm text-muted-foreground">
                    Join an elite group of early adopters and product enthusiasts
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-strong border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-1">Simple Challenge</h3>
                  <p className="text-sm text-muted-foreground">
                    10 conversions + feedback within 14 days - that's it!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Application Form */}
        <FounderApplicationForm onSuccess={() => fetchApplicationStatus()} />
      </div>
    </div>
  )
}
