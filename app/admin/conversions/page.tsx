'use client'

import React, { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { ConversionJobDetailModal } from '@/components/admin/ConversionJobDetailModal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Download, RefreshCw, ChevronLeft, ChevronRight, FileText, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

interface ConversionJob {
  id: string
  type: string
  status: string
  progress: number
  file_name: string
  file_size: number
  cloudconvert_job_id?: string
  error_message?: string
  created_at: string
  updated_at: string
  user?: {
    id: string
    email: string
    name?: string
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface Stats {
  pending: number
  processing: number
  completed_today: number
  failed_today: number
}

export default function ConversionsPage() {
  const [jobs, setJobs] = useState<ConversionJob[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0
  })
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    processing: 0,
    completed_today: 0,
    failed_today: 0
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set())
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(10) // seconds

  useEffect(() => {
    fetchJobs()
  }, [pagination.page, statusFilter, typeFilter])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchJobs, refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, pagination.page, statusFilter, typeFilter])

  const fetchJobs = async () => {
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

      const response = await fetch(`${API_URL}/api/admin/conversions?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setJobs(data.jobs || [])
        setPagination(data.pagination)
        setStats(data.stats || { pending: 0, processing: 0, completed_today: 0, failed_today: 0 })
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchJobs()
  }

  const handleSelectAll = () => {
    if (selectedJobIds.size === jobs.length) {
      setSelectedJobIds(new Set())
    } else {
      setSelectedJobIds(new Set(jobs.map(j => j.id)))
    }
  }

  const handleSelectJob = (jobId: string) => {
    const newSelected = new Set(selectedJobIds)
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId)
    } else {
      newSelected.add(jobId)
    }
    setSelectedJobIds(newSelected)
  }

  const handleBulkRetry = async () => {
    const jobIds = Array.from(selectedJobIds)
    if (!confirm(`Retry ${jobIds.length} selected failed jobs?`)) return

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/conversions/bulk-retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ jobIds })
      })

      if (response.ok) {
        alert(`Successfully queued ${jobIds.length} jobs for retry`)
        setSelectedJobIds(new Set())
        fetchJobs()
      } else {
        const errorData = await response.json()
        alert(errorData.message || 'Failed to retry jobs')
      }
    } catch (error) {
      console.error('Bulk retry error:', error)
      alert('Failed to retry jobs')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />
      case 'failed':
        return <XCircle size={16} className="text-red-500" />
      case 'processing':
        return <Clock size={16} className="text-blue-500" />
      default:
        return <AlertCircle size={16} className="text-yellow-500" />
    }
  }

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed':
        return 'default'
      case 'failed':
        return 'destructive'
      case 'processing':
        return 'default'
      default:
        return 'secondary'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Conversion Job Monitoring</h1>
          <p className="text-muted-foreground">Monitor and manage all PDF conversion jobs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={fetchJobs}>
            <RefreshCw size={16} />
            Refresh
          </Button>
          {selectedJobIds.size > 0 && (
            <Button variant="secondary" size="sm" onClick={handleBulkRetry}>
              <RefreshCw size={16} />
              Retry Selected ({selectedJobIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="glass-strong border-border/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Pending</p>
              <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong border-border/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Processing</p>
              <p className="text-3xl font-bold text-blue-400">{stats.processing}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong border-border/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Completed Today</p>
              <p className="text-3xl font-bold text-green-400">{stats.completed_today}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong border-border/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Failed Today</p>
              <p className="text-3xl font-bold text-red-400">{stats.failed_today}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-strong border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Conversion Jobs
          </CardTitle>
          <CardDescription>Search and filter all conversion jobs</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                  type="text"
                  placeholder="Search by job ID or file name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <Button type="submit" size="default">Search</Button>
            </form>

            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
              >
                <option value="all">All Types</option>
                <option value="pdf_to_pptx">PDF to PPTX</option>
                <option value="pdf_to_docx">PDF to DOCX</option>
                <option value="pdf_to_xlsx">PDF to XLSX</option>
                <option value="pdf_to_images">PDF to Images</option>
                <option value="pdf_merge">PDF Merge</option>
              </select>
            </div>
          </div>

          {/* Auto-refresh Toggle */}
          <div className="mb-6 flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-2 focus:ring-primary"
              />
              Auto-refresh
            </label>
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                className="px-3 py-1 bg-input border border-border rounded text-foreground text-sm focus:outline-none focus:border-primary"
              >
                <option value="5">Every 5s</option>
                <option value="10">Every 10s</option>
                <option value="30">Every 30s</option>
                <option value="60">Every 60s</option>
              </select>
            )}
          </div>

          {/* Jobs Table */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No conversion jobs found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
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
                        checked={selectedJobIds.size === jobs.length && jobs.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-2 focus:ring-primary"
                      />
                    </th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">File Name</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">User</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Size</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Progress</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Created</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b border-border hover:bg-muted/50 transition">
                      <td className="py-4">
                        <input
                          type="checkbox"
                          checked={selectedJobIds.has(job.id)}
                          onChange={() => handleSelectJob(job.id)}
                          className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-2 focus:ring-primary"
                        />
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(job.status)}
                          <Badge variant={getStatusBadgeVariant(job.status)}>
                            {job.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-4 text-foreground text-sm">
                        {job.type.replace(/_/g, ' ').toUpperCase()}
                      </td>
                      <td className="py-4 text-foreground">
                        <div className="max-w-xs truncate" title={job.file_name}>
                          {job.file_name}
                        </div>
                      </td>
                      <td className="py-4 text-foreground text-sm">
                        {job.user?.email || '-'}
                      </td>
                      <td className="py-4 text-muted-foreground text-sm">
                        {formatFileSize(job.file_size)}
                      </td>
                      <td className="py-4">
                        {job.status === 'processing' ? (
                          <div className="w-20">
                            <div className="bg-border rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-blue-500 h-full transition-all duration-300"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                            <p className="text-xs text-center mt-1 text-muted-foreground">{job.progress}%</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td className="py-4 text-muted-foreground text-sm">
                        {new Date(job.created_at).toLocaleString()}
                      </td>
                      <td className="py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedJobId(job.id)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} jobs
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

      {/* Job Detail Modal */}
      {selectedJobId && (
        <ConversionJobDetailModal
          jobId={selectedJobId}
          isOpen={!!selectedJobId}
          onClose={() => setSelectedJobId(null)}
          onJobUpdated={fetchJobs}
        />
      )}
    </AdminLayout>
  )
}
