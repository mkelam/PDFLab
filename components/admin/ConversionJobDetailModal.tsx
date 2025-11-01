'use client'

import React, { useState, useEffect } from 'react'
import { X, FileText, User, Clock, Download, RefreshCw, XCircle, Trash2, AlertCircle } from 'lucide-react'
import { AdminButton } from './AdminButton'
import { AdminBadge } from './AdminBadge'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

interface JobDetail {
  id: string
  type: string
  status: string
  progress: number
  file_name: string
  file_size: number
  input_file?: string
  output_file?: string
  cloudconvert_job_id?: string
  error_message?: string
  estimated_time?: number
  processing_started_at?: string
  processing_completed_at?: string
  created_at: string
  updated_at: string
  expires_at: string
  user?: {
    id: string
    email: string
    name?: string
    plan: string
  }
}

interface ConversionJobDetailModalProps {
  jobId: string
  isOpen: boolean
  onClose: () => void
  onJobUpdated: () => void
}

export function ConversionJobDetailModal({ jobId, isOpen, onClose, onJobUpdated }: ConversionJobDetailModalProps) {
  const [job, setJob] = useState<JobDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (isOpen && jobId) {
      fetchJobDetails()
    }
  }, [isOpen, jobId])

  const fetchJobDetails = async () => {
    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem('authToken')

      const response = await fetch(`${API_URL}/api/admin/conversions/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setJob(data.job)
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to fetch job details')
      }
    } catch (err) {
      console.error('Failed to fetch job:', err)
      setError('Failed to load job details')
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = async () => {
    if (!confirm('Retry this conversion job?')) return

    try {
      setActionLoading(true)
      const token = localStorage.getItem('authToken')

      const response = await fetch(`${API_URL}/api/admin/conversions/${jobId}/retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        alert('Job queued for retry')
        onJobUpdated()
        onClose()
      } else {
        const errorData = await response.json()
        alert(errorData.message || 'Failed to retry job')
      }
    } catch (err) {
      console.error('Retry failed:', err)
      alert('Failed to retry job')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Cancel this conversion job?')) return

    try {
      setActionLoading(true)
      const token = localStorage.getItem('authToken')

      const response = await fetch(`${API_URL}/api/admin/conversions/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        alert('Job cancelled successfully')
        onJobUpdated()
        onClose()
      } else {
        const errorData = await response.json()
        alert(errorData.message || 'Failed to cancel job')
      }
    } catch (err) {
      console.error('Cancel failed:', err)
      alert('Failed to cancel job')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this conversion job? This action cannot be undone.')) return

    try {
      setActionLoading(true)
      const token = localStorage.getItem('authToken')

      const response = await fetch(`${API_URL}/api/admin/conversions/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        alert('Job deleted successfully')
        onJobUpdated()
        onClose()
      } else {
        const errorData = await response.json()
        alert(errorData.message || 'Failed to delete job')
      }
    } catch (err) {
      console.error('Delete failed:', err)
      alert('Failed to delete job')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDownloadOutput = async () => {
    if (!job?.output_file) return

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/download/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = job.output_file.split('/').pop() || 'download'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        alert('Failed to download file')
      }
    } catch (err) {
      console.error('Download failed:', err)
      alert('Failed to download file')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[oklch(0.25_0.01_250)]">
          <div>
            <h2 className="text-2xl font-bold text-white">Conversion Job Details</h2>
            {job && (
              <p className="text-sm text-[oklch(0.60_0.01_250)] mt-1">Job ID: {job.id}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-[oklch(0.60_0.01_250)] hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-[oklch(0.60_0.01_250)]">
              Loading job details...
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-400">
              {error}
            </div>
          ) : job ? (
            <div className="space-y-6">
              {/* Status & Progress */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[oklch(0.60_0.01_250)] mb-2">
                    Status
                  </label>
                  <AdminBadge variant={getStatusBadgeVariant(job.status)}>
                    {job.status}
                  </AdminBadge>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[oklch(0.60_0.01_250)] mb-2">
                    Progress
                  </label>
                  {job.status === 'processing' ? (
                    <div className="w-full">
                      <div className="bg-[oklch(0.25_0.01_250)] rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full transition-all duration-300"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <p className="text-sm mt-1 text-white">{job.progress}%</p>
                    </div>
                  ) : (
                    <p className="text-white">-</p>
                  )}
                </div>
              </div>

              {/* File Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[oklch(0.60_0.01_250)] mb-2">
                    File Name
                  </label>
                  <p className="text-white">{job.file_name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[oklch(0.60_0.01_250)] mb-2">
                    File Size
                  </label>
                  <p className="text-white">{formatFileSize(job.file_size)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[oklch(0.60_0.01_250)] mb-2">
                    Conversion Type
                  </label>
                  <p className="text-white">{job.type.replace(/_/g, ' ').toUpperCase()}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[oklch(0.60_0.01_250)] mb-2">
                    CloudConvert Job ID
                  </label>
                  <p className="text-white text-sm">{job.cloudconvert_job_id || '-'}</p>
                </div>
              </div>

              {/* User Info */}
              {job.user && (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[oklch(0.60_0.01_250)] mb-2">
                      User Email
                    </label>
                    <p className="text-white">{job.user.email}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[oklch(0.60_0.01_250)] mb-2">
                      User Plan
                    </label>
                    <AdminBadge variant="info">{job.user.plan}</AdminBadge>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[oklch(0.60_0.01_250)] mb-2">
                    Created At
                  </label>
                  <p className="text-white text-sm">{new Date(job.created_at).toLocaleString()}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[oklch(0.60_0.01_250)] mb-2">
                    Updated At
                  </label>
                  <p className="text-white text-sm">{new Date(job.updated_at).toLocaleString()}</p>
                </div>

                {job.processing_started_at && (
                  <div>
                    <label className="block text-sm font-medium text-[oklch(0.60_0.01_250)] mb-2">
                      Processing Started
                    </label>
                    <p className="text-white text-sm">{new Date(job.processing_started_at).toLocaleString()}</p>
                  </div>
                )}

                {job.processing_completed_at && (
                  <div>
                    <label className="block text-sm font-medium text-[oklch(0.60_0.01_250)] mb-2">
                      Processing Completed
                    </label>
                    <p className="text-white text-sm">{new Date(job.processing_completed_at).toLocaleString()}</p>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {job.error_message && (
                <div>
                  <label className="block text-sm font-medium text-[oklch(0.60_0.01_250)] mb-2">
                    Error Message
                  </label>
                  <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                    <p className="text-red-400 text-sm font-mono">{job.error_message}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t border-[oklch(0.25_0.01_250)]">
                {job.status === 'failed' && (
                  <AdminButton onClick={handleRetry} disabled={actionLoading}>
                    <RefreshCw size={16} />
                    Retry Job
                  </AdminButton>
                )}

                {(job.status === 'pending' || job.status === 'processing') && (
                  <AdminButton variant="secondary" onClick={handleCancel} disabled={actionLoading}>
                    <XCircle size={16} />
                    Cancel Job
                  </AdminButton>
                )}

                {job.status === 'completed' && job.output_file && (
                  <AdminButton variant="secondary" onClick={handleDownloadOutput}>
                    <Download size={16} />
                    Download Output
                  </AdminButton>
                )}

                <AdminButton variant="danger" onClick={handleDelete} disabled={actionLoading}>
                  <Trash2 size={16} />
                  Delete Job
                </AdminButton>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
