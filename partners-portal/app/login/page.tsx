'use client'

import { useState } from 'react'
import { usePartnerAuth } from '@/contexts/PartnerAuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, User, AlertCircle } from 'lucide-react'

export default function PartnerLoginPage() {
  const { login } = usePartnerAuth()
  const [slug, setSlug] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await login(slug, password)

      if (!result.success) {
        setError(result.error || 'Login failed')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5">
      <Card className="glass-strong w-full max-w-md border-border/50">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-to-r from-primary to-purple-600 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl">Partner Login</CardTitle>
          <CardDescription>Access your PDFLab Partner Dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="slug">Partner Slug</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="slug"
                  type="text"
                  placeholder="your-partner-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Your unique partner identifier (e.g., john-doe)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !slug || !password}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Logging in...
                </div>
              ) : (
                'Login to Dashboard'
              )}
            </Button>

            <div className="pt-4 border-t border-border/50 text-center">
              <p className="text-sm text-muted-foreground">
                Don't have access?{' '}
                <a
                  href="/apply"
                  className="text-primary hover:underline font-medium"
                >
                  Apply to become a partner
                </a>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
