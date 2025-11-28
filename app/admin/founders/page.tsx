'use client'

import React, { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Crown,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Trophy,
  MessageSquare,
  FileText,
  AlertTriangle
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

interface FounderStats {
  total_spots: number
  spots_remaining: number
  active_founders: number
  earned_founders: number
  expired_founders: number
}

interface FounderUser {
  id: string
  email: string
  name?: string
  founder_status: 'none' | 'active' | 'earned' | 'expired'
  founder_deadline?: string
  founder_feedback_submitted: boolean
  founder_conversions_count: number
  created_at: string
}

export default function FoundersPage() {
  const [stats, setStats] = useState<FounderStats | null>(null)
  const [founders, setFounders] = useState<FounderUser[]>([])
  const [loading, setLoading] = useState(true)
  const [expiryLoading, setExpiryLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/founder/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch founder stats:', error)
    }
  }

  const fetchFounders = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')

      const params = new URLSearchParams({
        founder_status: statusFilter !== 'all' ? statusFilter : ''
      })

      const response = await fetch(`${API_URL}/api/admin/users?${params}&limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Filter to only show founder users
        const founderUsers = (data.users || []).filter(
          (u: FounderUser) => u.founder_status && u.founder_status !== 'none'
        )
        setFounders(founderUsers)
      }
    } catch (error) {
      console.error('Failed to fetch founders:', error)
    } finally {
      setLoading(false)
    }
  }

  const triggerExpiryCheck = async () => {
    try {
      setExpiryLoading(true)
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/founder/check-expiry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Expiry check complete. ${data.expired_count || 0} founders expired.`)
        fetchStats()
        fetchFounders()
      } else {
        alert('Failed to run expiry check')
      }
    } catch (error) {
      console.error('Expiry check error:', error)
      alert('Failed to run expiry check')
    } finally {
      setExpiryLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchFounders()
  }, [statusFilter])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Active</Badge>
      case 'earned':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Earned Lifetime</Badge>
      case 'expired':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Expired</Badge>
      default:
        return <Badge variant="outline">None</Badge>
    }
  }

  const getDaysRemaining = (deadline: string) => {
    const now = new Date()
    const deadlineDate = new Date(deadline)
    const diff = deadlineDate.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }

  const getProgressPercentage = (conversions: number, feedback: boolean) => {
    // 10 conversions = 50%, feedback = 50%
    const conversionProgress = Math.min(conversions / 10, 1) * 50
    const feedbackProgress = feedback ? 50 : 0
    return Math.round(conversionProgress + feedbackProgress)
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <Crown className="w-8 h-8 text-yellow-500" />
              Founder's Edition
            </h1>
            <p className="text-muted-foreground">Monitor and manage Founder's Edition users and their challenge progress</p>
          </div>
          <Button
            variant="outline"
            onClick={triggerExpiryCheck}
            disabled={expiryLoading}
            className="flex items-center gap-2"
          >
            {expiryLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
            Run Expiry Check
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card className="glass-strong border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Spots Remaining</p>
                <p className="text-3xl font-bold text-foreground">
                  {stats?.spots_remaining ?? '-'} / {stats?.total_spots ?? 100}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Founders</p>
                <p className="text-3xl font-bold text-blue-400">{stats?.active_founders ?? '-'}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Earned Lifetime</p>
                <p className="text-3xl font-bold text-green-400">{stats?.earned_founders ?? '-'}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-3xl font-bold text-red-400">{stats?.expired_founders ?? '-'}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-3xl font-bold text-yellow-400">
                  {stats && (stats.active_founders + stats.earned_founders + stats.expired_founders) > 0
                    ? Math.round((stats.earned_founders / (stats.active_founders + stats.earned_founders + stats.expired_founders)) * 100)
                    : 0}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Founders List */}
      <Card className="glass-strong border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                Founder Users
              </CardTitle>
              <CardDescription>All users enrolled in Founder's Edition challenge</CardDescription>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="earned">Earned</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading founders...</p>
            </div>
          ) : founders.length === 0 ? (
            <div className="text-center py-12">
              <Crown className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No founders found</h3>
              <p className="text-muted-foreground">No users have enrolled in Founder's Edition yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 text-sm font-medium text-muted-foreground">User</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Progress</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Conversions</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Feedback</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Days Left</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Enrolled</th>
                  </tr>
                </thead>
                <tbody>
                  {founders.map((founder) => {
                    const daysRemaining = founder.founder_deadline ? getDaysRemaining(founder.founder_deadline) : null
                    const progress = getProgressPercentage(founder.founder_conversions_count, founder.founder_feedback_submitted)

                    return (
                      <tr key={founder.id} className="border-b border-border hover:bg-muted/50 transition">
                        <td className="py-4">
                          <div>
                            <p className="text-foreground font-medium">{founder.email}</p>
                            {founder.name && <p className="text-sm text-muted-foreground">{founder.name}</p>}
                          </div>
                        </td>
                        <td className="py-4">
                          {getStatusBadge(founder.founder_status)}
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  progress === 100 ? 'bg-green-500' : 'bg-primary'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">{progress}%</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className={`font-medium ${
                              founder.founder_conversions_count >= 10 ? 'text-green-400' : 'text-foreground'
                            }`}>
                              {founder.founder_conversions_count} / 10
                            </span>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            {founder.founder_feedback_submitted ? (
                              <>
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-green-400">Submitted</span>
                              </>
                            ) : (
                              <>
                                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Pending</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-4">
                          {founder.founder_status === 'active' && daysRemaining !== null ? (
                            <div className="flex items-center gap-2">
                              {daysRemaining <= 3 ? (
                                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                              ) : (
                                <Clock className="w-4 h-4 text-muted-foreground" />
                              )}
                              <span className={`font-medium ${
                                daysRemaining <= 3 ? 'text-yellow-400' : 'text-foreground'
                              }`}>
                                {daysRemaining > 0 ? `${daysRemaining} days` : 'Expired'}
                              </span>
                            </div>
                          ) : founder.founder_status === 'earned' ? (
                            <span className="text-green-400">-</span>
                          ) : (
                            <span className="text-red-400">-</span>
                          )}
                        </td>
                        <td className="py-4 text-muted-foreground text-sm">
                          {new Date(founder.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  )
}
