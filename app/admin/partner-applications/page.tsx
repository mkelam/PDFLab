'use client'

import React, { useState, useEffect } from 'react'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import {
  FileText,
  Users,
  CheckCircle,
  XCircle,
  Flag,
  Eye,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle
} from 'lucide-react'

interface PartnerApplication {
  id: string
  email: string
  full_name: string
  brand_name: string | null
  country: string | null
  primary_platform: string
  audience_size: string
  audience_niche: string
  platform_url: string
  why_pdflab: string | null
  promotion_methods: string[]
  content_idea: string | null
  estimated_conversions: string | null
  previous_affiliates: string | null
  status: 'pending' | 'approved' | 'rejected' | 'flagged'
  score: number
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

function StatCard({ icon, label, value, loading }: {
  icon: React.ReactNode
  label: string
  value: string | number
  loading?: boolean
}) {
  return (
    <Card className="glass-strong border-border/50">
      <CardHeader className="pb-3">
        <div className="p-2 bg-primary/10 rounded-lg text-primary w-fit">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <CardTitle className="text-sm font-medium text-muted-foreground mb-1">{label}</CardTitle>
        <p className="text-2xl font-bold text-foreground">
          {loading ? (
            <span className="animate-pulse">Loading...</span>
          ) : (
            value
          )}
        </p>
      </CardContent>
    </Card>
  )
}

export default function AdminPartnerApplicationsPage() {
  useRequireAuth({ requiredRole: 'admin' })

  const [applications, setApplications] = useState<PartnerApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedApp, setSelectedApp] = useState<PartnerApplication | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    fetchApplications()
  }, [statusFilter])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const params = statusFilter !== 'all' ? { status: statusFilter } : {}
      const response = await api.get('/partner-applications', { params })

      if (response?.applications) {
        setApplications(response.applications)
      } else {
        setApplications([])
      }
    } catch (error: any) {
      console.error('Error fetching applications:', error)
      setApplications([])
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = (app: PartnerApplication) => {
    setSelectedApp(app)
    setAdminNotes(app.admin_notes || '')
    setRejectionReason(app.rejection_reason || '')
    setShowDetailModal(true)
  }

  const handleApprove = async (applicationId: string) => {
    if (!confirm('Are you sure you want to approve this application? This will create a partner account.')) {
      return
    }

    try {
      setActionLoading(true)
      await api.post(`/partner-applications/${applicationId}/approve`, {
        admin_notes: adminNotes
      })

      alert('Application approved! Partner account created successfully.')
      setShowDetailModal(false)
      setSelectedApp(null)
      setAdminNotes('')
      await fetchApplications()
    } catch (error: any) {
      console.error('Approve error:', error)
      alert(error.response?.data?.error || 'Failed to approve application')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (applicationId: string) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason to send to the applicant.')
      return
    }

    if (!confirm('Are you sure you want to reject this application?')) {
      return
    }

    try {
      setActionLoading(true)
      await api.post(`/partner-applications/${applicationId}/reject`, {
        rejection_reason: rejectionReason,
        admin_notes: adminNotes
      })

      alert('Application rejected. Email sent to applicant.')
      setShowDetailModal(false)
      setSelectedApp(null)
      setRejectionReason('')
      setAdminNotes('')
      await fetchApplications()
    } catch (error: any) {
      console.error('Reject error:', error)
      alert(error.response?.data?.error || 'Failed to reject application')
    } finally {
      setActionLoading(false)
    }
  }

  const handleFlag = async (applicationId: string) => {
    try {
      setActionLoading(true)
      await api.post(`/partner-applications/${applicationId}/flag`, {
        admin_notes: adminNotes
      })

      alert('Application flagged for review.')
      await fetchApplications()
    } catch (error: any) {
      console.error('Flag error:', error)
      alert(error.response?.data?.error || 'Failed to flag application')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
    switch (status) {
      case 'approved': return 'default'
      case 'rejected': return 'destructive'
      case 'flagged': return 'secondary'
      default: return 'outline'
    }
  }

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    if (score >= 40) return 'text-orange-500'
    return 'text-red-500'
  }

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    flagged: applications.filter(a => a.status === 'flagged').length
  }

  const filteredApplications = statusFilter === 'all'
    ? applications
    : applications.filter(a => a.status === statusFilter)

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading applications...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Partner Applications</h1>
          <p className="text-muted-foreground">Review and approve influencer partner applications</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <StatCard
            icon={<FileText size={24} />}
            label="Total Applications"
            value={stats.total}
            loading={loading}
          />
          <StatCard
            icon={<Users size={24} />}
            label="Pending Review"
            value={stats.pending}
            loading={loading}
          />
          <StatCard
            icon={<CheckCircle size={24} />}
            label="Approved"
            value={stats.approved}
            loading={loading}
          />
          <StatCard
            icon={<XCircle size={24} />}
            label="Rejected"
            value={stats.rejected}
            loading={loading}
          />
          <StatCard
            icon={<Flag size={24} />}
            label="Flagged"
            value={stats.flagged}
            loading={loading}
          />
        </div>

        <Card className="glass-strong border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Applications</CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('all')}
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'pending' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('pending')}
                >
                  Pending
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'approved' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('approved')}
                >
                  Approved
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'rejected' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('rejected')}
                >
                  Rejected
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'flagged' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('flagged')}
                >
                  Flagged
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredApplications.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No applications found</h3>
                <p className="text-muted-foreground">
                  {statusFilter === 'all' ? 'No applications yet' : `No ${statusFilter} applications`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredApplications.map((app) => (
                  <Card key={app.id} className="glass-subtle border-border/40 hover:border-border transition-all">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-foreground">{app.full_name}</h3>
                            <Badge variant={getStatusBadgeVariant(app.status)}>
                              {app.status}
                            </Badge>
                            <Badge variant="outline" className={getScoreColor(app.score)}>
                              Score: {app.score}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>{app.email}</p>
                            <p>{app.primary_platform} • {app.audience_size.replace(/_/g, ' ')} • {app.audience_niche}</p>
                            <p className="text-xs">{app.platform_url}</p>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            Applied: {new Date(app.created_at).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="flex gap-2 ml-6">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(app)}
                            className="flex items-center gap-2"
                          >
                            <Eye size={16} />
                            Review
                          </Button>
                          {app.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  setSelectedApp(app)
                                  handleApprove(app.id)
                                }}
                                className="flex items-center gap-2"
                              >
                                <ThumbsUp size={16} />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedApp(app)
                                  setShowDetailModal(true)
                                }}
                                className="flex items-center gap-2"
                              >
                                <ThumbsDown size={16} />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showDetailModal && selectedApp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="glass-strong border-border/50 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Application Review</CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowDetailModal(false)
                    setSelectedApp(null)
                    setRejectionReason('')
                    setAdminNotes('')
                  }}
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Full Name</h4>
                  <p className="text-foreground">{selectedApp.full_name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Email</h4>
                  <p className="text-foreground">{selectedApp.email}</p>
                </div>
                {selectedApp.brand_name && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Brand Name</h4>
                    <p className="text-foreground">{selectedApp.brand_name}</p>
                  </div>
                )}
                {selectedApp.country && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Country</h4>
                    <p className="text-foreground">{selectedApp.country}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Platform</h4>
                  <p className="text-foreground capitalize">{selectedApp.primary_platform}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Audience Size</h4>
                  <p className="text-foreground">{selectedApp.audience_size.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Niche</h4>
                  <p className="text-foreground">{selectedApp.audience_niche}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Auto Score</h4>
                  <p className={`text-lg font-bold ${getScoreColor(selectedApp.score)}`}>{selectedApp.score}/100</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Platform URL</h4>
                <a href={selectedApp.platform_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {selectedApp.platform_url}
                </a>
              </div>

              {selectedApp.why_pdflab && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Why PDFLab?</h4>
                  <p className="text-foreground whitespace-pre-wrap">{selectedApp.why_pdflab}</p>
                </div>
              )}

              {selectedApp.content_idea && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Content Idea</h4>
                  <p className="text-foreground whitespace-pre-wrap">{selectedApp.content_idea}</p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Promotion Methods</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedApp.promotion_methods.map((method, i) => (
                    <Badge key={i} variant="outline">{method}</Badge>
                  ))}
                </div>
              </div>

              {selectedApp.estimated_conversions && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Estimated Conversions</h4>
                  <p className="text-foreground">{selectedApp.estimated_conversions.replace(/_/g, ' ')}</p>
                </div>
              )}

              {selectedApp.previous_affiliates && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Previous Affiliates</h4>
                  <p className="text-foreground whitespace-pre-wrap">{selectedApp.previous_affiliates}</p>
                </div>
              )}

              {selectedApp.status !== 'pending' && (
                <div className="pt-4 border-t border-border/50">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Review Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Status:</strong> <Badge variant={getStatusBadgeVariant(selectedApp.status)}>{selectedApp.status}</Badge></p>
                    {selectedApp.reviewed_at && (
                      <p><strong>Reviewed:</strong> {new Date(selectedApp.reviewed_at).toLocaleString()}</p>
                    )}
                    {selectedApp.rejection_reason && (
                      <div>
                        <strong>Rejection Reason:</strong>
                        <p className="text-muted-foreground mt-1">{selectedApp.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedApp.status === 'pending' && (
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Admin Notes (Internal Only)
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add internal notes about this application..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-border/50 bg-gray-900/90 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Rejection Reason (Sent to Applicant)
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Only required if rejecting. This will be sent to the applicant..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-border/50 bg-gray-900/90 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => handleFlag(selectedApp.id)}
                      disabled={actionLoading}
                      className="flex items-center gap-2"
                    >
                      <AlertTriangle size={16} />
                      Flag for Review
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleReject(selectedApp.id)}
                      disabled={actionLoading}
                      className="flex items-center gap-2"
                    >
                      <ThumbsDown size={16} />
                      Reject
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => handleApprove(selectedApp.id)}
                      disabled={actionLoading}
                      className="flex items-center gap-2"
                    >
                      {actionLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <ThumbsUp size={16} />
                          Approve & Create Partner
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AdminLayout>
  )
}
