'use client'

import React, { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

  const getSeverityBadgeVariant = (severity: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'warning': return 'secondary'
      case 'info': return 'default'
      default: return 'outline'
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
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Audit Logs & Compliance</h1>
            <p className="text-muted-foreground">Track all admin actions and system events</p>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchLogs}>
            <RefreshCw size={16} />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="glass-strong border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Audit Log History
          </CardTitle>
          <CardDescription>Complete record of administrative actions</CardDescription>
        </CardHeader>
        <CardContent>
        {/* Search and Filters */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                type="text"
                placeholder="Search by entity ID or action..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>

          <div className="flex gap-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Severity</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>

            <select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
          <div className="text-center py-12 text-muted-foreground">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <h3 className="text-lg font-medium text-foreground mb-2">No audit logs found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Timestamp</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Admin User</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Action</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Entity</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Severity</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">IP Address</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-border hover:bg-muted/50 transition">
                      <td className="py-4 text-sm text-foreground">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="py-4">
                        <div>
                          <div className="text-foreground text-sm">{log.adminUser?.email}</div>
                          <Badge variant="outline">{log.adminUser?.role}</Badge>
                        </div>
                      </td>
                      <td className="py-4 text-sm text-foreground">
                        {log.action}
                      </td>
                      <td className="py-4">
                        <div className="text-sm">
                          <div className="text-foreground">{log.entity_type}</div>
                          {log.entity_id && (
                            <div className="text-muted-foreground font-mono text-xs">
                              {log.entity_id.substring(0, 8)}...
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4">
                        <Badge variant={getSeverityBadgeVariant(log.severity)}>
                          <div className="flex items-center gap-1">
                            {getSeverityIcon(log.severity)}
                            {log.severity}
                          </div>
                        </Badge>
                      </td>
                      <td className="py-4 text-sm text-muted-foreground font-mono">
                        {log.ip_address || '-'}
                      </td>
                      <td className="py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLogId(log.id)}
                        >
                          View Details
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
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} logs
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
