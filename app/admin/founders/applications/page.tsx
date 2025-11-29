'use client'

import React, { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Crown,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Mail,
  User,
  MessageSquare,
  FileText
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

interface Application {
  id: string
  email: string
  name?: string
  founder_application_status: 'pending' | 'approved' | 'rejected'
  founder_application_reason: string
  founder_application_use_case: string
  founder_application_submitted_at: string
  founder_application_reviewed_at?: string
  founder_rejection_reason?: string
  created_at: string
}

interface ApplicationStats {
  pending_count: number
  approved_count: number
  rejected_count: number
  spots_remaining: number
}

export default function FounderApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [stats, setStats] = useState<ApplicationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/founder/application-stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')

      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      const response = await fetch(`${API_URL}/api/founder/applications${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setApplications(data.applications || [])
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (userId: string) => {
    if (!confirm('Approve this application? The user will be enrolled in the 14-day challenge.')) {
      return
    }

    try {
      setActionLoading(true)
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/founder/approve/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        alert('Application approved! User has been notified.')
        fetchStats()
        fetchApplications()
      } else {
        const data = await response.json()
        alert(`Failed to approve: ${data.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Approval error:', error)
      alert('Failed to approve application')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedApp || !rejectionReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    try {
      setActionLoading(true)
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/founder/reject/${selectedApp.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: rejectionReason })
      })

      if (response.ok) {
        alert('Application rejected. User has been notified.')
        setShowRejectModal(false)
        setRejectionReason('')
        setSelectedApp(null)
        fetchStats()
        fetchApplications()
      } else {
        const data = await response.json()
        alert(`Failed to reject: ${data.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Rejection error:', error)
      alert('Failed to reject application')
    } finally {
      setActionLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchApplications()
  }, [statusFilter])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Approved</Badge>
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Rejected</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <Crown className="w-8 h-8 text-yellow-500" />
              Founder Applications
            </h1>
            <p className="text-muted-foreground">Review and approve Founder's Edition applications</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="glass-strong border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-400">{stats?.pending_count ?? '-'}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-3xl font-bold text-green-400">{stats?.approved_count ?? '-'}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-3xl font-bold text-red-400">{stats?.rejected_count ?? '-'}</p>
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
                <p className="text-sm text-muted-foreground">Spots Remaining</p>
                <p className="text-3xl font-bold text-primary">{stats?.spots_remaining ?? '-'} / 100</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Crown className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applications List */}
      <Card className="glass-strong border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Applications
              </CardTitle>
              <CardDescription>Review pending applications or view application history</CardDescription>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All Applications</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No applications found</h3>
              <p className="text-muted-foreground">No {statusFilter !== 'all' ? statusFilter : ''} applications to display</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <Card key={app.id} className="border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium text-foreground">{app.name || 'No name provided'}</h3>
                          {getStatusBadge(app.founder_application_status)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          {app.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Clock className="w-4 h-4" />
                          Applied {new Date(app.founder_application_submitted_at).toLocaleDateString()}
                        </div>
                      </div>

                      {app.founder_application_status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleApprove(app.id)}
                            disabled={actionLoading}
                            className="bg-green-500 hover:bg-green-600 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedApp(app)
                              setShowRejectModal(true)
                            }}
                            disabled={actionLoading}
                            variant="outline"
                            className="border-red-500 text-red-400 hover:bg-red-500/10"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1">Why they want to join:</p>
                        <p className="text-sm text-muted-foreground pl-4 border-l-2 border-primary/30">
                          {app.founder_application_reason}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-foreground mb-1">How they'll use PDFLab:</p>
                        <p className="text-sm text-muted-foreground pl-4 border-l-2 border-primary/30">
                          {app.founder_application_use_case}
                        </p>
                      </div>

                      {app.founder_rejection_reason && (
                        <div>
                          <p className="text-sm font-medium text-red-400 mb-1">Rejection Reason:</p>
                          <p className="text-sm text-red-300 pl-4 border-l-2 border-red-500/30">
                            {app.founder_rejection_reason}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md glass-strong border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <XCircle className="w-5 h-5" />
                Reject Application
              </CardTitle>
              <CardDescription>
                Provide a reason for rejecting {selectedApp?.email}'s application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Rejection Reason
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why this application is being rejected..."
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    rows={4}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    onClick={() => {
                      setShowRejectModal(false)
                      setRejectionReason('')
                      setSelectedApp(null)
                    }}
                    variant="outline"
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={actionLoading || !rejectionReason.trim()}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    {actionLoading ? 'Rejecting...' : 'Reject Application'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminLayout>
  )
}
