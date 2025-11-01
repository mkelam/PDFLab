'use client'

import React, { useState, useEffect } from 'react'
import { Activity as ActivityIcon, FileText, User, Clock, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { AdminBadge } from './AdminBadge'
import { AdminButton } from './AdminButton'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

interface Activity {
  id: string
  type: string
  action: string
  details: string
  status?: string
  ip_address?: string
  timestamp: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface UserActivityTabProps {
  userId: string
}

export function UserActivityTab({ userId }: UserActivityTabProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivity()
  }, [pagination.page])

  const fetchActivity = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      })

      const response = await fetch(`${API_URL}/api/admin/users/${userId}/activity?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities || [])
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'conversion':
        return <FileText size={20} className="text-blue-400" />
      case 'login':
        return <User size={20} className="text-green-400" />
      case 'admin_action':
        return <AlertTriangle size={20} className="text-yellow-400" />
      default:
        return <ActivityIcon size={20} className="text-gray-400" />
    }
  }

  const getActivityBadgeVariant = (type: string) => {
    switch (type) {
      case 'conversion':
        return 'info'
      case 'login':
        return 'success'
      case 'admin_action':
        return 'warning'
      default:
        return 'default'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  return (
    <div className="space-y-4">
      {/* Activity Timeline */}
      {loading ? (
        <div className="text-center py-12 text-[oklch(0.60_0.01_250)]">
          Loading activity...
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12">
          <ActivityIcon size={48} className="mx-auto mb-4 text-[oklch(0.60_0.01_250)] opacity-50" />
          <p className="text-[oklch(0.60_0.01_250)]">No activity found</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div
                key={activity.id}
                className="relative flex gap-4 pb-4 border-b border-[oklch(0.25_0.01_250)] last:border-b-0"
              >
                {/* Timeline dot and line */}
                <div className="relative flex flex-col items-center">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[oklch(0.20_0.01_250)] border-2 border-[oklch(0.25_0.01_250)]">
                    {getActivityIcon(activity.type)}
                  </div>
                  {index < activities.length - 1 && (
                    <div className="absolute top-10 w-0.5 h-full bg-[oklch(0.25_0.01_250)]"></div>
                  )}
                </div>

                {/* Activity content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-white font-medium">{activity.action}</h4>
                      <p className="text-sm text-[oklch(0.60_0.01_250)] mt-1">
                        {activity.details}
                      </p>
                      {activity.ip_address && (
                        <p className="text-xs text-[oklch(0.50_0.01_250)] mt-1">
                          IP: {activity.ip_address}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <AdminBadge variant={getActivityBadgeVariant(activity.type)}>
                        {activity.type.replace('_', ' ')}
                      </AdminBadge>
                      {activity.status && (
                        <AdminBadge variant={activity.status === 'completed' ? 'success' : 'error'}>
                          {activity.status}
                        </AdminBadge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[oklch(0.50_0.01_250)]">
                    <Clock size={12} />
                    {formatTimestamp(activity.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-[oklch(0.60_0.01_250)]">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} activities
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
