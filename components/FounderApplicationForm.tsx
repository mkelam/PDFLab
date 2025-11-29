'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Crown, Send, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

interface FounderApplicationFormProps {
  onSuccess?: () => void
}

export function FounderApplicationForm({ onSuccess }: FounderApplicationFormProps) {
  const [reason, setReason] = useState('')
  const [useCase, setUseCase] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!reason.trim() || !useCase.trim()) {
      setError('Please fill in all fields')
      return
    }

    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')

      const response = await fetch(`${API_URL}/api/founder/apply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: reason.trim(),
          use_case: useCase.trim()
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        onSuccess?.()
      } else {
        setError(data.message || 'Failed to submit application')
      }
    } catch (err) {
      setError('Failed to submit application. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="glass-strong border-border/50">
        <CardContent className="pt-12 pb-12 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">Application Submitted!</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Thank you for applying to Founder's Edition. Our team will review your application and notify you via email within 24-48 hours.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-yellow-400">
            <Clock className="w-4 h-4" />
            <span>Pending Review</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-strong border-border/50">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-3">
          <Crown className="w-6 h-6 text-yellow-500" />
          Apply for Founder's Edition
        </CardTitle>
        <CardDescription className="text-base">
          Help shape PDFLab and earn lifetime access. Limited to 100 spots.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400">Application Error</p>
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-foreground mb-2">
                Why do you want to join Founder's Edition? *
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tell us why you're excited about Founder's Edition and what makes you a good fit..."
                className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Be specific and authentic. This helps us understand your motivation.
              </p>
            </div>

            <div>
              <label htmlFor="useCase" className="block text-sm font-medium text-foreground mb-2">
                How will you use PDFLab? *
              </label>
              <textarea
                id="useCase"
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                placeholder="Describe your use case - What types of PDFs will you convert? For work, personal projects, etc.?"
                className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Help us understand how PDFLab fits into your workflow.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
            <p className="text-sm font-medium text-foreground mb-2">What happens next:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                Our team reviews your application (typically within 24-48 hours)
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                You'll receive an email with our decision
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                If approved, you get immediate access to the 14-day challenge
              </li>
            </ul>
          </div>

          <Button
            type="submit"
            disabled={loading || !reason.trim() || !useCase.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting Application...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Application
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
