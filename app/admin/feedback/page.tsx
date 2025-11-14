'use client'

import React, { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Search, ChevronLeft, ChevronRight, RefreshCw, MessageSquare, CheckCircle, X, Trash2, Send, AlertCircle, Lightbulb, Bug, HelpCircle } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

type FeedbackType = 'bug' | 'feature' | 'general' | 'other'
type FeedbackStatus = 'new' | 'in_progress' | 'resolved' | 'dismissed'

interface Feedback {
  id: string
  user_id: string | null
  user_email: string | null
  user_name: string | null
  type: FeedbackType
  message: string
  page_url: string | null
  user_agent: string | null
  screenshot_url: string | null
  status: FeedbackStatus
  admin_reply: string | null
  admin_id: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  user?: {
    id: string
    email: string
    name: string
    plan: string
  }
  admin?: {
    id: string
    email: string
    name: string
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface Stats {
  total: number
  byStatus: {
    new: number
    in_progress: number
    resolved: number
    dismissed: number
  }
  byType: {
    bug: number
    feature: number
    general: number
  }
}

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isReplying, setIsReplying] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const fetchFeedback = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(typeFilter !== 'all' && { type: typeFilter })
      })

      const response = await fetch(`${API_URL}/api/admin/feedback?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setFeedback(data.feedback || [])
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch feedback:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/feedback/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  useEffect(() => {
    fetchFeedback()
    fetchStats()
  }, [pagination.page, statusFilter, typeFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchFeedback()
  }

  const updateStatus = async (id: string, status: FeedbackStatus) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/feedback/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        fetchFeedback()
        fetchStats()
        if (selectedFeedback?.id === id) {
          setSelectedFeedback(null)
        }
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      alert('Failed to update status')
    }
  }

  const sendReply = async () => {
    if (!selectedFeedback || !replyText.trim()) return

    try {
      setIsReplying(true)
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/feedback/${selectedFeedback.id}/reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reply: replyText.trim() })
      })

      if (response.ok) {
        alert('Reply sent successfully!')
        setReplyText('')
        setSelectedFeedback(null)
        fetchFeedback()
        fetchStats()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to send reply')
      }
    } catch (error) {
      console.error('Failed to send reply:', error)
      alert('Failed to send reply')
    } finally {
      setIsReplying(false)
    }
  }

  const deleteFeedback = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/feedback/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        fetchFeedback()
        fetchStats()
        if (selectedFeedback?.id === id) {
          setSelectedFeedback(null)
        }
      }
    } catch (error) {
      console.error('Failed to delete feedback:', error)
      alert('Failed to delete feedback')
    }
  }

  const bulkUpdateStatus = async (status: FeedbackStatus) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    if (!confirm(`Update status to "${status}" for ${ids.length} items?`)) return

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/feedback/bulk-update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids, status })
      })

      if (response.ok) {
        setSelectedIds(new Set())
        fetchFeedback()
        fetchStats()
      }
    } catch (error) {
      console.error('Failed to bulk update:', error)
      alert('Failed to bulk update')
    }
  }

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    if (!confirm(`Delete ${ids.length} feedback items?`)) return

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/feedback/bulk-delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids })
      })

      if (response.ok) {
        setSelectedIds(new Set())
        fetchFeedback()
        fetchStats()
      }
    } catch (error) {
      console.error('Failed to bulk delete:', error)
      alert('Failed to bulk delete')
    }
  }

  const getTypeBadge = (type: FeedbackType) => {
    const config = {
      bug: { icon: Bug, color: 'bg-red-100 text-red-700', label: 'Bug' },
      feature: { icon: Lightbulb, color: 'bg-blue-100 text-blue-700', label: 'Feature' },
      general: { icon: MessageSquare, color: 'bg-gray-100 text-gray-700', label: 'General' },
      other: { icon: HelpCircle, color: 'bg-purple-100 text-purple-700', label: 'Other' }
    }
    const { icon: Icon, color, label } = config[type]
    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${color}`}>
        <Icon size={12} />
        {label}
      </div>
    )
  }

  const getStatusBadge = (status: FeedbackStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'new': return 'destructive'
      case 'in_progress': return 'default'
      case 'resolved': return 'secondary'
      case 'dismissed': return 'outline'
    }
  }

  const handleSelectAll = () => {
    if (selectedIds.size === feedback.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(feedback.map(f => f.id)))
    }
  }

  const handleSelectFeedback = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-primary" />
              Feedback Management
            </h1>
            <p className="text-muted-foreground">Review and respond to user feedback</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="glass-strong border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Feedback</div>
            </CardContent>
          </Card>
          <Card className="glass-strong border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.byStatus.new}</div>
              <div className="text-sm text-muted-foreground">New</div>
            </CardContent>
          </Card>
          <Card className="glass-strong border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats.byStatus.in_progress}</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </CardContent>
          </Card>
          <Card className="glass-strong border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.byStatus.resolved}</div>
              <div className="text-sm text-muted-foreground">Resolved</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="glass-strong border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Feedback List
          </CardTitle>
          <CardDescription>Browse and manage user feedback submissions</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters and Search */}
          <div className="mb-6 space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
                <Input
                  type="text"
                  placeholder="Search feedback..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">Search</Button>
              <Button type="button" variant="outline" onClick={fetchFeedback}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </form>

            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
              >
                <option value="all">All Types</option>
                <option value="bug">Bug Reports</option>
                <option value="feature">Feature Requests</option>
                <option value="general">General</option>
                <option value="other">Other</option>
              </select>

              {selectedIds.size > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={() => bulkUpdateStatus('in_progress')}>
                    Mark In Progress ({selectedIds.size})
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => bulkUpdateStatus('resolved')}>
                    Mark Resolved ({selectedIds.size})
                  </Button>
                  <Button variant="destructive" size="sm" onClick={bulkDelete}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete ({selectedIds.size})
                  </Button>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading feedback...</p>
            </div>
          ) : feedback.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No feedback found</h3>
              <p className="text-muted-foreground">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === feedback.length && feedback.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-2 focus:ring-ring"
                        />
                      </th>
                      <th className="pb-3 text-sm font-medium text-muted-foreground">Type</th>
                      <th className="pb-3 text-sm font-medium text-muted-foreground">Message</th>
                      <th className="pb-3 text-sm font-medium text-muted-foreground">From</th>
                      <th className="pb-3 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="pb-3 text-sm font-medium text-muted-foreground">Created</th>
                      <th className="pb-3 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedback.map((item) => (
                      <tr key={item.id} className="border-b border-border hover:bg-muted/50 transition">
                        <td className="py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => handleSelectFeedback(item.id)}
                            className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-2 focus:ring-ring"
                          />
                        </td>
                        <td className="py-4">{getTypeBadge(item.type)}</td>
                        <td className="py-4 text-foreground max-w-md">
                          <div className="truncate">{item.message}</div>
                        </td>
                        <td className="py-4 text-sm">
                          <div className="text-foreground">{item.user_name || item.user_email || 'Anonymous'}</div>
                          {item.user && (
                            <div className="text-muted-foreground text-xs">{item.user.plan}</div>
                          )}
                        </td>
                        <td className="py-4">
                          <Badge variant={getStatusBadge(item.status)}>
                            {item.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-4 text-sm text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-4">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedFeedback(item)}
                            >
                              View
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} items
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </Button>
                  <span className="text-sm text-foreground px-4">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Next
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedFeedback(null)}
          />
          <div className="relative w-full max-w-2xl glass-strong rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                {getTypeBadge(selectedFeedback.type)}
                Feedback Details
              </h2>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="rounded-full p-2 transition-colors hover:bg-black/5"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge variant={getStatusBadge(selectedFeedback.status)}>
                    {selectedFeedback.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              {/* From */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">From</label>
                <div className="mt-1 text-foreground">
                  {selectedFeedback.user_name || 'Anonymous'}
                  {selectedFeedback.user_email && (
                    <span className="text-muted-foreground ml-2">({selectedFeedback.user_email})</span>
                  )}
                  {selectedFeedback.user && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Plan: {selectedFeedback.user.plan}
                    </div>
                  )}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Message</label>
                <div className="mt-1 p-4 bg-muted/30 rounded-lg text-foreground whitespace-pre-wrap">
                  {selectedFeedback.message}
                </div>
              </div>

              {/* Page URL */}
              {selectedFeedback.page_url && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Page URL</label>
                  <div className="mt-1 text-sm text-foreground break-all">
                    <a href={selectedFeedback.page_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {selectedFeedback.page_url}
                    </a>
                  </div>
                </div>
              )}

              {/* Admin Reply */}
              {selectedFeedback.admin_reply && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Admin Reply</label>
                  <div className="mt-1 p-4 bg-green-50 border border-green-200 rounded-lg text-foreground whitespace-pre-wrap">
                    {selectedFeedback.admin_reply}
                  </div>
                </div>
              )}

              {/* Reply Form */}
              {!selectedFeedback.admin_reply && selectedFeedback.user_email && selectedFeedback.status !== 'dismissed' && (
                <div>
                  <label htmlFor="reply" className="text-sm font-medium text-muted-foreground">
                    Send Reply (will email user)
                  </label>
                  <Textarea
                    id="reply"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your response..."
                    rows={4}
                    className="mt-1"
                  />
                  <Button
                    onClick={sendReply}
                    disabled={isReplying || !replyText.trim()}
                    className="mt-2"
                  >
                    {isReplying ? (
                      <>Sending...</>
                    ) : (
                      <>
                        <Send size={16} className="mr-2" />
                        Send Reply & Mark Resolved
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStatus(selectedFeedback.id, 'new')}
                  disabled={selectedFeedback.status === 'new'}
                >
                  Mark New
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStatus(selectedFeedback.id, 'in_progress')}
                  disabled={selectedFeedback.status === 'in_progress'}
                >
                  Mark In Progress
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStatus(selectedFeedback.id, 'resolved')}
                  disabled={selectedFeedback.status === 'resolved'}
                >
                  Mark Resolved
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStatus(selectedFeedback.id, 'dismissed')}
                  disabled={selectedFeedback.status === 'dismissed'}
                >
                  Dismiss
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteFeedback(selectedFeedback.id)}
                >
                  <Trash2 size={16} className="mr-1" />
                  Delete
                </Button>
              </div>

              {/* Metadata */}
              <div className="text-xs text-muted-foreground pt-4 border-t border-border">
                <div>Created: {new Date(selectedFeedback.created_at).toLocaleString()}</div>
                {selectedFeedback.resolved_at && (
                  <div>Resolved: {new Date(selectedFeedback.resolved_at).toLocaleString()}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
