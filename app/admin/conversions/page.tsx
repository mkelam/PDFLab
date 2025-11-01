'use client'

import React, { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminCard } from '@/components/admin/AdminCard'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { AdminButton } from '@/components/admin/AdminButton'
import { AdminEmptyState } from '@/components/admin/AdminEmptyState'
import { ConversionJobDetailModal } from '@/components/admin/ConversionJobDetailModal'
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'failed':
        return 'error'
      case 'processing':
        return 'info'
      default:
        return 'warning'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Conversion Job Monitoring"
        description="Monitor and manage all PDF conversion jobs"
        actions={
          <>
            <AdminButton variant="secondary" size="sm" onClick={fetchJobs}>
              <RefreshCw size={16} />
              Refresh
            </AdminButton>
            {selectedJobIds.size > 0 && (
              <AdminButton variant="secondary" size="sm" onClick={handleBulkRetry}>
                <RefreshCw size={16} />
                Retry Selected ({selectedJobIds.size})
              </AdminButton>
            )}
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <AdminCard>
          <div className="text-center">
            <p className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Pending</p>
            <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
          </div>
        </AdminCard>
        <AdminCard>
          <div className="text-center">
            <p className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Processing</p>
            <p className="text-3xl font-bold text-blue-400">{stats.processing}</p>
          </div>
        </AdminCard>
        <AdminCard>
          <div className="text-center">
            <p className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Completed Today</p>
            <p className="text-3xl font-bold text-green-400">{stats.completed_today}</p>
          </div>
        </AdminCard>
        <AdminCard>
          <div className="text-center">
            <p className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Failed Today</p>
            <p className="text-3xl font-bold text-red-400">{stats.failed_today}</p>
          </div>
        </AdminCard>
      </div>

      <AdminCard>
        {/* Search and Filters */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[oklch(0.60_0.01_250)]" size={20} />
              <input
                type="text"
                placeholder="Search by job ID or file name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg text-white placeholder-[oklch(0.60_0.01_250)] focus:outline-none focus:border-[oklch(0.65_0.20_270)]"
              />
            </div>
            <AdminButton type="submit" size="md">Search</AdminButton>
          </form>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg text-white focus:outline-none focus:border-[oklch(0.65_0.20_270)]"
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
              className="px-4 py-2 bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg text-white focus:outline-none focus:border-[oklch(0.65_0.20_270)]"
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
          <label className="flex items-center gap-2 text-sm text-[oklch(0.60_0.01_250)]">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded border-[oklch(0.25_0.01_250)] bg-[oklch(0.15_0.01_250)] text-[oklch(0.65_0.20_270)] focus:ring-2 focus:ring-[oklch(0.65_0.20_270)]"
            />
            Auto-refresh
          </label>
          {autoRefresh && (
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
              className="px-3 py-1 bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded text-white text-sm focus:outline-none focus:border-[oklch(0.65_0.20_270)]"
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
          <div className="text-center py-12 text-[oklch(0.60_0.01_250)]">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <AdminEmptyState
            title="No conversion jobs found"
            description="Try adjusting your search or filters"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[oklch(0.25_0.01_250)] text-left">
                    <th className="pb-3 w-12">
                      <input
                        type="checkbox"
                        checked={selectedJobIds.size === jobs.length && jobs.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-[oklch(0.25_0.01_250)] bg-[oklch(0.15_0.01_250)] text-[oklch(0.65_0.20_270)] focus:ring-2 focus:ring-[oklch(0.65_0.20_270)]"
                      />
                    </th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Status</th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Type</th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">File Name</th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">User</th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Size</th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Progress</th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Created</th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b border-[oklch(0.25_0.01_250)] hover:bg-[oklch(0.20_0.01_250)] transition">
                      <td className="py-4">
                        <input
                          type="checkbox"
                          checked={selectedJobIds.has(job.id)}
                          onChange={() => handleSelectJob(job.id)}
                          className="w-4 h-4 rounded border-[oklch(0.25_0.01_250)] bg-[oklch(0.15_0.01_250)] text-[oklch(0.65_0.20_270)] focus:ring-2 focus:ring-[oklch(0.65_0.20_270)]"
                        />
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(job.status)}
                          <AdminBadge variant={getStatusBadgeVariant(job.status)}>
                            {job.status}
                          </AdminBadge>
                        </div>
                      </td>
                      <td className="py-4 text-[oklch(0.90_0.01_250)] text-sm">
                        {job.type.replace(/_/g, ' ').toUpperCase()}
                      </td>
                      <td className="py-4 text-white">
                        <div className="max-w-xs truncate" title={job.file_name}>
                          {job.file_name}
                        </div>
                      </td>
                      <td className="py-4 text-[oklch(0.90_0.01_250)] text-sm">
                        {job.user?.email || '-'}
                      </td>
                      <td className="py-4 text-[oklch(0.60_0.01_250)] text-sm">
                        {formatFileSize(job.file_size)}
                      </td>
                      <td className="py-4">
                        {job.status === 'processing' ? (
                          <div className="w-20">
                            <div className="bg-[oklch(0.25_0.01_250)] rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-blue-500 h-full transition-all duration-300"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                            <p className="text-xs text-center mt-1 text-[oklch(0.60_0.01_250)]">{job.progress}%</p>
                          </div>
                        ) : (
                          <span className="text-[oklch(0.60_0.01_250)] text-sm">-</span>
                        )}
                      </td>
                      <td className="py-4 text-[oklch(0.60_0.01_250)] text-sm">
                        {new Date(job.created_at).toLocaleString()}
                      </td>
                      <td className="py-4">
                        <AdminButton
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedJobId(job.id)}
                        >
                          View
                        </AdminButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-[oklch(0.60_0.01_250)]">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} jobs
              </div>
              <div className="flex items-center gap-2">
                <AdminButton
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  <ChevronLeft size={16} />
                  Previous
                </AdminButton>
                <span className="text-sm text-white px-4">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <AdminButton
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                  <ChevronRight size={16} />
                </AdminButton>
              </div>
            </div>
          </>
        )}
      </AdminCard>

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
