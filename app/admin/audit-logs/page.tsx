'use client'

import React, { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminCard } from '@/components/admin/AdminCard'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { AdminButton } from '@/components/admin/AdminButton'
import { AdminEmptyState } from '@/components/admin/AdminEmptyState'
import { AuditLogDetailModal } from '@/components/admin/AuditLogDetailModal'
import { Search, RefreshCw, ChevronLeft, ChevronRight, Shield, AlertTriangle, Info } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

interface AuditLog {
  id: string
  admin_user_id: string
  action: string
  entity_type: string
  entity_id?: string
  changes?: any
  ip_address?: string
  user_agent?: string
  severity: string
  created_at: string
  adminUser?: {
    id: string
    email: string
    name?: string
    role: string
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [entityTypeFilter, setEntityTypeFilter] = useState('all')
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(severityFilter !== 'all' && { severity: severityFilter }),
        ...(entityTypeFilter !== 'all' && { entity_type: entityTypeFilter })
      })

      const response = await fetch(`${API_URL}/api/admin/audit-logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [pagination.page, severityFilter, entityTypeFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchLogs()
  }

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error'
      case 'warning': return 'warning'
      case 'info': return 'info'
      default: return 'default'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle size={16} />
      case 'warning': return <AlertTriangle size={16} />
      case 'info': return <Info size={16} />
      default: return <Shield size={16} />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Audit Logs & Compliance"
        description="Track all admin actions and system events"
        actions={
          <AdminButton variant="secondary" size="sm" onClick={fetchLogs}>
            <RefreshCw size={16} />
            Refresh
          </AdminButton>
        }
      />

      <AdminCard>
        {/* Search and Filters */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[oklch(0.60_0.01_250)]" size={20} />
              <input
                type="text"
                placeholder="Search by entity ID or action..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg text-white placeholder-[oklch(0.60_0.01_250)] focus:outline-none focus:border-[oklch(0.65_0.20_270)]"
              />
            </div>
            <AdminButton type="submit" size="md">Search</AdminButton>
          </form>

          <div className="flex gap-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-4 py-2 bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg text-white focus:outline-none focus:border-[oklch(0.65_0.20_270)]"
            >
              <option value="all">All Severity</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>

            <select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="px-4 py-2 bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg text-white focus:outline-none focus:border-[oklch(0.65_0.20_270)]"
            >
              <option value="all">All Entity Types</option>
              <option value="user">User</option>
              <option value="subscription">Subscription</option>
              <option value="payment">Payment</option>
              <option value="conversion">Conversion</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="text-center py-12 text-[oklch(0.60_0.01_250)]">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <AdminEmptyState
            title="No audit logs found"
            description="Try adjusting your search or filters"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[oklch(0.25_0.01_250)] text-left">
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Timestamp</th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Admin User</th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Action</th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Entity</th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Severity</th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">IP Address</th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-[oklch(0.25_0.01_250)] hover:bg-[oklch(0.20_0.01_250)] transition">
                      <td className="py-4 text-sm text-[oklch(0.90_0.01_250)]">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="py-4">
                        <div>
                          <div className="text-white text-sm">{log.adminUser?.email}</div>
                          <AdminBadge variant="default" size="sm">{log.adminUser?.role}</AdminBadge>
                        </div>
                      </td>
                      <td className="py-4 text-sm text-[oklch(0.90_0.01_250)]">
                        {log.action}
                      </td>
                      <td className="py-4">
                        <div className="text-sm">
                          <div className="text-white">{log.entity_type}</div>
                          {log.entity_id && (
                            <div className="text-[oklch(0.60_0.01_250)] font-mono text-xs">
                              {log.entity_id.substring(0, 8)}...
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4">
                        <AdminBadge variant={getSeverityBadgeVariant(log.severity)} size="sm">
                          <div className="flex items-center gap-1">
                            {getSeverityIcon(log.severity)}
                            {log.severity}
                          </div>
                        </AdminBadge>
                      </td>
                      <td className="py-4 text-sm text-[oklch(0.60_0.01_250)] font-mono">
                        {log.ip_address || '-'}
                      </td>
                      <td className="py-4">
                        <AdminButton
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLogId(log.id)}
                        >
                          View Details
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
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} logs
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

      {/* Audit Log Detail Modal */}
      {selectedLogId && (
        <AuditLogDetailModal
          logId={selectedLogId}
          isOpen={!!selectedLogId}
          onClose={() => setSelectedLogId(null)}
        />
      )}
    </AdminLayout>
  )
}
