'use client'

import React, { useState, useEffect } from 'react'
import { FileText, Download, AlertCircle, CheckCircle, Clock, XCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { AdminBadge } from './AdminBadge'
import { AdminButton } from './AdminButton'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

interface Conversion {
  id: string
  type: string
  status: string
  file_name: string
  file_size: number
  output_file?: string
  error_message?: string
  created_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface UserConversionsTabProps {
  userId: string
}

export function UserConversionsTab({ userId }: UserConversionsTabProps) {
  const [conversions, setConversions] = useState<Conversion[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchConversions()
  }, [pagination.page, typeFilter, statusFilter])

  const fetchConversions = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      })

      const response = await fetch(`${API_URL}/api/admin/users/${userId}/conversions?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setConversions(data.conversions || [])
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch conversions:', error)
    } finally {
      setLoading(false)
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

  const handleDownload = async (conversion: Conversion) => {
    if (!conversion.output_file) return

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/download/${conversion.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = conversion.output_file
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Download failed:', error)
      alert('Failed to download file')
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value)
            setPagination(prev => ({ ...prev, page: 1 }))
          }}
          className="px-4 py-2 bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg text-white focus:outline-none focus:border-[oklch(0.65_0.20_270)]"
        >
          <option value="all">All Types</option>
          <option value="pdf-to-pptx">PDF to PPTX</option>
          <option value="pdf-to-docx">PDF to DOCX</option>
          <option value="pdf-to-xlsx">PDF to XLSX</option>
          <option value="pdf-to-png">PDF to PNG</option>
          <option value="merge-pdf">Merge PDF</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPagination(prev => ({ ...prev, page: 1 }))
          }}
          className="px-4 py-2 bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg text-white focus:outline-none focus:border-[oklch(0.65_0.20_270)]"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Conversions Table */}
      {loading ? (
        <div className="text-center py-12 text-[oklch(0.60_0.01_250)]">
          Loading conversions...
        </div>
      ) : conversions.length === 0 ? (
        <div className="text-center py-12">
          <FileText size={48} className="mx-auto mb-4 text-[oklch(0.60_0.01_250)] opacity-50" />
          <p className="text-[oklch(0.60_0.01_250)]">No conversions found</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[oklch(0.25_0.01_250)] text-left">
                  <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Status</th>
                  <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Type</th>
                  <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">File Name</th>
                  <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Size</th>
                  <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Date</th>
                  <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {conversions.map((conversion) => (
                  <tr key={conversion.id} className="border-b border-[oklch(0.25_0.01_250)] hover:bg-[oklch(0.20_0.01_250)] transition">
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(conversion.status)}
                        <AdminBadge variant={getStatusBadgeVariant(conversion.status)}>
                          {conversion.status}
                        </AdminBadge>
                      </div>
                    </td>
                    <td className="py-4 text-[oklch(0.90_0.01_250)]">
                      {conversion.type.replace('-', ' → ').toUpperCase()}
                    </td>
                    <td className="py-4 text-white">
                      <div className="max-w-xs truncate" title={conversion.file_name}>
                        {conversion.file_name}
                      </div>
                      {conversion.error_message && (
                        <div className="text-xs text-red-400 mt-1">
                          {conversion.error_message}
                        </div>
                      )}
                    </td>
                    <td className="py-4 text-[oklch(0.60_0.01_250)] text-sm">
                      {formatFileSize(conversion.file_size)}
                    </td>
                    <td className="py-4 text-[oklch(0.60_0.01_250)] text-sm">
                      {new Date(conversion.created_at).toLocaleString()}
                    </td>
                    <td className="py-4">
                      {conversion.status === 'completed' && conversion.output_file && (
                        <AdminButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(conversion)}
                        >
                          <Download size={14} />
                          Download
                        </AdminButton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-[oklch(0.60_0.01_250)]">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} conversions
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
          )}
        </>
      )}
    </div>
  )
}
