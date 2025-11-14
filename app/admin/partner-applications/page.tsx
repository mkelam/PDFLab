'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { api } from '@/lib/api'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Flag,
  Loader2,
  ExternalLink,
  Mail,
  Users,
  TrendingUp,
  AlertCircle
} from 'lucide-react'

interface PartnerApplication {
  id: string
  email: string
  full_name: string
  brand_name?: string
  country?: string
  primary_platform: string
  audience_size: string
  audience_niche: string
  platform_url: string
  why_pdflab: string
  promotion_methods: string[]
  content_idea: string
  estimated_conversions?: string
  previous_affiliates?: string
  status: 'pending' | 'approved' | 'rejected' | 'flagged'
  score: number
  reviewed_by?: string
  reviewed_at?: string
  rejection_reason?: string
  created_at: string
}

const statusConfig = {
  pending: { color: 'bg-yellow-500', icon: Clock, label: 'Pending' },
  approved: { color: 'bg-green-500', icon: CheckCircle2, label: 'Approved' },
  rejected: { color: 'bg-red-500', icon: XCircle, label: 'Rejected' },
  flagged: { color: 'bg-orange-500', icon: Flag, label: 'Flagged' }
}

const platformLabels: Record<string, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  twitter: 'Twitter/X',
  linkedin: 'LinkedIn',
  blog: 'Blog',
  newsletter: 'Newsletter',
  other: 'Other'
}

const audienceSizeLabels: Record<string, string> = {
  under_1k: 'Under 1,000',
  '1k_10k': '1,000 - 10,000',
  '10k_50k': '10,000 - 50,000',
  '50k_100k': '50,000 - 100,000',
  '100k_500k': '100,000 - 500,000',
  '500k_plus': '500,000+'
}

export default function PartnerApplicationsPage() {
  const { user, loading: authLoading } = useRequireAuth({ requiredRole: 'admin' })
  const [applications, setApplications] = useState<PartnerApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('pending')
  const [selectedApp, setSelectedApp] = useState<PartnerApplication | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | 'flag' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [formData, setFormData] = useState({
    rejection_reason: '',
    admin_notes: '',
    tier: 'bronze',
    commission_rate: '30.00'
  })

  useEffect(() => {
    if (!authLoading && user) {
      fetchApplications()
    }
  }, [authLoading, user, filter])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      // FIX: api.get() already adds /api prefix, so don't include it in endpoint
      const response = await api.get(`/partner-applications?status=${filter}`)
      // FIX: API wrapper (lib/api.ts) already unwraps response.json()
      // Backend returns { applications: [...] }, NOT { data: { applications: [...] } }
      setApplications(response.applications || [])
    } catch (error) {
      console.error('Error fetching applications:', error)
      setApplications([]) // Ensure empty state on error
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async () => {
    if (!selectedApp || !action) return

    try {
      setActionLoading(true)

      let endpoint = ''
      let body: any = {}

      switch (action) {
        case 'approve':
          // FIX: api.post() already adds /api prefix
          endpoint = `/partner-applications/${selectedApp.id}/approve`
          body = {
            admin_notes: formData.admin_notes,
            tier: formData.tier,
            commission_rate: parseFloat(formData.commission_rate)
          }
          break
        case 'reject':
          endpoint = `/partner-applications/${selectedApp.id}/reject`
          body = {
            rejection_reason: formData.rejection_reason,
            admin_notes: formData.admin_notes
          }
          break
        case 'flag':
          endpoint = `/partner-applications/${selectedApp.id}/flag`
          body = { admin_notes: formData.admin_notes }
          break
      }

      await api.post(endpoint, body)

      // Refresh applications
      await fetchApplications()

      // Close dialog
      setSelectedApp(null)
      setAction(null)
      setFormData({ rejection_reason: '', admin_notes: '', tier: 'bronze', commission_rate: '30.00' })
    } catch (error) {
      console.error('Error performing action:', error)
      alert('Failed to perform action. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const openActionDialog = (app: PartnerApplication, actionType: 'approve' | 'reject' | 'flag') => {
    setSelectedApp(app)
    setAction(actionType)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    if (score >= 40) return 'text-orange-500'
    return 'text-red-500'
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    avgScore: applications.length > 0
      ? Math.round(applications.reduce((sum, a) => sum + a.score, 0) / applications.length)
      : 0
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Partner Applications</h1>
          <p className="text-muted-foreground">Review and manage partner program applications</p>
        </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card className="glass-strong border-border/50">
          <CardHeader className="pb-2">
            <CardDescription>Total Applications</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>

        <Card className="glass-strong border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-500">{stats.pending}</p>
          </CardContent>
        </Card>

        <Card className="glass-strong border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Approved
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-500">{stats.approved}</p>
          </CardContent>
        </Card>

        <Card className="glass-strong border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Rejected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-500">{stats.rejected}</p>
          </CardContent>
        </Card>

        <Card className="glass-strong border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Avg Score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${getScoreColor(stats.avgScore)}`}>{stats.avgScore}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="glass-strong border-border/50 mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Applications</CardTitle>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No {filter} applications found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Niche</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => {
                    const StatusIcon = statusConfig[app.status].icon
                    return (
                      <TableRow key={app.id}>
                        <TableCell>
                          <div>
                            <p className="font-semibold">{app.full_name}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {app.email}
                            </p>
                            {app.brand_name && (
                              <p className="text-xs text-muted-foreground">{app.brand_name}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{platformLabels[app.primary_platform]}</Badge>
                            <a
                              href={app.platform_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            <Users className="w-3 h-3 mr-1" />
                            {audienceSizeLabels[app.audience_size]}
                          </Badge>
                        </TableCell>
                        <TableCell>{app.audience_niche}</TableCell>
                        <TableCell>
                          <span className={`font-bold ${getScoreColor(app.score)}`}>
                            {app.score}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(app.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {app.status === 'pending' || app.status === 'flagged' ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => openActionDialog(app, 'approve')}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => openActionDialog(app, 'reject')}
                                >
                                  Reject
                                </Button>
                                {app.status !== 'flagged' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openActionDialog(app, 'flag')}
                                  >
                                    Flag
                                  </Button>
                                )}
                              </>
                            ) : (
                              <Badge className={statusConfig[app.status].color}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusConfig[app.status].label}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!selectedApp && !!action} onOpenChange={() => {
        setSelectedApp(null)
        setAction(null)
        setFormData({ rejection_reason: '', admin_notes: '', tier: 'bronze', commission_rate: '30.00' })
      }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' && 'Approve Application'}
              {action === 'reject' && 'Reject Application'}
              {action === 'flag' && 'Flag Application'}
            </DialogTitle>
            <DialogDescription>
              {selectedApp && `${selectedApp.full_name} (${selectedApp.email})`}
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-4">
              {/* Application Details */}
              <Card className="glass-strong border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Application Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-semibold">Platform</p>
                      <p className="text-muted-foreground">{platformLabels[selectedApp.primary_platform]}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Audience Size</p>
                      <p className="text-muted-foreground">{audienceSizeLabels[selectedApp.audience_size]}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Niche</p>
                      <p className="text-muted-foreground">{selectedApp.audience_niche}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Score</p>
                      <p className={`font-bold ${getScoreColor(selectedApp.score)}`}>
                        {selectedApp.score}/100
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="font-semibold">Platform URL</p>
                    <a
                      href={selectedApp.platform_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      {selectedApp.platform_url}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div>
                    <p className="font-semibold">Why PDFLab?</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">{selectedApp.why_pdflab}</p>
                  </div>

                  <div>
                    <p className="font-semibold">Promotion Methods</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedApp.promotion_methods.map(method => (
                        <Badge key={method} variant="secondary">{method}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="font-semibold">Content Idea</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">{selectedApp.content_idea}</p>
                  </div>

                  {selectedApp.previous_affiliates && (
                    <div>
                      <p className="font-semibold">Previous Affiliates</p>
                      <p className="text-muted-foreground whitespace-pre-wrap">{selectedApp.previous_affiliates}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Form */}
              <div className="space-y-4">
                {action === 'approve' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="tier">Partner Tier</Label>
                      <Select
                        name="tier"
                        value={formData.tier}
                        onValueChange={(value) => setFormData({ ...formData, tier: value })}
                      >
                        <SelectTrigger id="tier">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bronze">Bronze (30% commission)</SelectItem>
                          <SelectItem value="silver">Silver (35% commission)</SelectItem>
                          <SelectItem value="gold">Gold (40% commission)</SelectItem>
                          <SelectItem value="platinum">Platinum (50% commission)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="commission_rate">Commission Rate (%)</Label>
                      <Input
                        id="commission_rate"
                        name="commission_rate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.commission_rate}
                        onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                        placeholder="30.00"
                      />
                    </div>
                  </>
                )}

                {action === 'reject' && (
                  <div className="space-y-2">
                    <Label htmlFor="rejection_reason">Rejection Reason (sent to applicant)</Label>
                    <Textarea
                      id="rejection_reason"
                      placeholder="Explain why the application was rejected..."
                      value={formData.rejection_reason}
                      onChange={(e) => setFormData({ ...formData, rejection_reason: e.target.value })}
                      rows={3}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="admin_notes">Admin Notes (internal only)</Label>
                  <Textarea
                    id="admin_notes"
                    placeholder="Add internal notes about this application..."
                    value={formData.admin_notes}
                    onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedApp(null)
                setAction(null)
                setFormData({ rejection_reason: '', admin_notes: '', tier: 'bronze', commission_rate: '30.00' })
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={actionLoading || (action === 'reject' && !formData.rejection_reason)}
              variant={action === 'reject' ? 'destructive' : 'default'}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {action === 'approve' && 'Approve & Create Partner'}
                  {action === 'reject' && 'Reject Application'}
                  {action === 'flag' && 'Flag for Review'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </AdminLayout>
  )
}
