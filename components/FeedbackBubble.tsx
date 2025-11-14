'use client'

import { useState } from 'react'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

type FeedbackType = 'bug' | 'feature' | 'general' | 'other'

export default function FeedbackBubble() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>('general')
  const [message, setMessage] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim()) {
      setErrorMessage('Please enter your feedback')
      return
    }

    if (!user && !userEmail.trim()) {
      setErrorMessage('Please enter your email address')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }

      // Add auth token if user is logged in
      const token = localStorage.getItem('authToken')
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type,
          message: message.trim(),
          user_email: !user ? userEmail.trim() : undefined,
          user_name: !user ? userName.trim() : undefined,
          page_url: window.location.href,
          screenshot_url: null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback')
      }

      setSubmitStatus('success')
      setMessage('')
      setUserEmail('')
      setUserName('')
      setType('general')

      // Close modal after 2 seconds
      setTimeout(() => {
        setIsOpen(false)
        setSubmitStatus('idle')
      }, 2000)
    } catch (error) {
      console.error('Submit feedback error:', error)
      setSubmitStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit feedback')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 rounded-full p-4 shadow-lg transition-all hover:scale-110 hover:shadow-xl"
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(16px)',
          border: '3px solid #14b8a6'
        }}
        aria-label="Send Feedback"
      >
        <MessageCircle size={24} className="text-foreground" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Content */}
          <div
            className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              backdropFilter: 'blur(24px)',
              border: '3px solid #14b8a6'
            }}
          >
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Send Feedback</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 transition-colors hover:bg-black/5"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Success Message */}
            {submitStatus === 'success' && (
              <div className="mb-4 rounded-lg bg-green-50 p-4 text-green-800">
                <p className="font-medium">Thank you for your feedback!</p>
                <p className="text-sm">We appreciate you taking the time to help us improve.</p>
              </div>
            )}

            {/* Error Message */}
            {submitStatus === 'error' && errorMessage && (
              <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">
                <p className="text-sm">{errorMessage}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Selector */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Feedback Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'bug', label: 'Bug Report' },
                    { value: 'feature', label: 'Feature Request' },
                    { value: 'general', label: 'General' },
                    { value: 'other', label: 'Other' }
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-lg border-2 p-3 text-center text-sm font-medium transition-all ${
                        type === option.value
                          ? 'border-teal-500 bg-teal-500 text-white backdrop-blur-sm shadow-xs'
                          : 'border-gray-400/30 bg-black/20 text-white/90 hover:border-gray-300/50 hover:bg-black/30 hover:text-white backdrop-blur-sm'
                      }`}
                    >
                      <input
                        type="radio"
                        name="type"
                        value={option.value}
                        checked={type === option.value}
                        onChange={(e) => setType(e.target.value as FeedbackType)}
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Guest Email/Name (only show if not logged in) */}
              {!user && (
                <>
                  <div>
                    <label htmlFor="userEmail" className="mb-2 block text-sm font-medium text-foreground">
                      Your Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="userEmail"
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full rounded-lg border border-gray-200/30 bg-white/30 backdrop-blur-sm px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      required={!user}
                    />
                  </div>

                  <div>
                    <label htmlFor="userName" className="mb-2 block text-sm font-medium text-foreground">
                      Your Name (optional)
                    </label>
                    <input
                      id="userName"
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full rounded-lg border border-gray-200/30 bg-white/30 backdrop-blur-sm px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </>
              )}

              {/* Message */}
              <div>
                <label htmlFor="message" className="mb-2 block text-sm font-medium text-foreground">
                  Your Feedback <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what you think..."
                  rows={6}
                  maxLength={5000}
                  className="w-full rounded-lg border border-gray-200/30 bg-white/30 backdrop-blur-sm px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
                <p className="mt-1 text-right text-xs text-muted-foreground">
                  {message.length}/5000
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || submitStatus === 'success'}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-teal-500 text-white shadow-xs px-6 py-3 font-medium transition-all hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Sending...
                  </>
                ) : submitStatus === 'success' ? (
                  'Sent!'
                ) : (
                  <>
                    <Send size={18} />
                    Send Feedback
                  </>
                )}
              </button>
            </form>

            {/* Info */}
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Your feedback helps us improve PDFLab for everyone
            </p>
          </div>
        </div>
      )}
    </>
  )
}
