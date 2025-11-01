'use client'

import React, { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminCard } from '@/components/admin/AdminCard'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { AdminButton } from '@/components/admin/AdminButton'
import {
  Server,
  Database,
  HardDrive,
  AlertCircle,
  CheckCircle,
  Activity,
  RefreshCw,
  Trash2,
  PlayCircle,
  Cloud
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

interface SystemHealth {
  overall_status: string
  components: {
    cloudconvert: {
      status: string
      success_rate: string
      error_rate: string
      total_jobs_24h: number
      completed_24h: number
      failed_24h: number
    }
    redis: {
      status: string
      waiting: number
      active: number
      completed: number
      failed: number
      completed_today: number
      failed_today: number
    }
    database: {
      status: string
      connections: {
        active: number
        idle: number
        max: number
      }
      usage_percent: string
    }
    storage: {
      status: string
      total_gb: string
      capacity_gb: number
      usage_percent: string
      file_count: number
    }
  }
  last_updated: string
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [operationLoading, setOperationLoading] = useState(false)

  const fetchHealth = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/system/health`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setHealth(data.health)
      }
    } catch (error) {
      console.error('Failed to fetch system health:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchHealth, 30000) // 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle size={24} className="text-green-400" />
      case 'warning':
        return <AlertCircle size={24} className="text-yellow-400" />
      case 'critical':
        return <AlertCircle size={24} className="text-red-400" />
      default:
        return <Activity size={24} className="text-[oklch(0.60_0.01_250)]" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400'
      case 'warning':
        return 'text-yellow-400'
      case 'critical':
        return 'text-red-400'
      default:
        return 'text-[oklch(0.60_0.01_250)]'
    }
  }

  const handleTestConversion = async () => {
    if (!confirm('Run test conversion?')) return

    try {
      setOperationLoading(true)
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/system/test-conversion`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message || 'Test conversion initiated')
      } else {
        alert('Failed to run test conversion')
      }
    } catch (error) {
      console.error('Test conversion error:', error)
      alert('Failed to run test conversion')
    } finally {
      setOperationLoading(false)
    }
  }

  const handleClearCache = async () => {
    if (!confirm('Clear Redis cache? This will remove all cached data.')) return

    try {
      setOperationLoading(true)
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/system/clear-cache`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        alert('Cache cleared successfully')
        fetchHealth()
      } else {
        alert('Failed to clear cache')
      }
    } catch (error) {
      console.error('Clear cache error:', error)
      alert('Failed to clear cache')
    } finally {
      setOperationLoading(false)
    }
  }

  const handleCleanupStorage = async () => {
    if (!confirm('Cleanup storage? This will delete expired conversions and files.')) return

    try {
      setOperationLoading(true)
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/system/cleanup-storage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Storage cleanup completed!\n\nDeleted jobs: ${data.stats.deleted_jobs}\nDeleted files: ${data.stats.deleted_files}\nFreed space: ${data.stats.freed_space_mb} MB`)
        fetchHealth()
      } else {
        alert('Failed to cleanup storage')
      }
    } catch (error) {
      console.error('Cleanup storage error:', error)
      alert('Failed to cleanup storage')
    } finally {
      setOperationLoading(false)
    }
  }

  return (
    <AdminLayout>
      <AdminPageHeader
        title="System Health & Monitoring"
        description="Monitor system components and perform maintenance operations"
        actions={
          <div className="flex gap-2">
            <AdminButton
              variant={autoRefresh ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
            </AdminButton>
            <AdminButton variant="secondary" size="sm" onClick={fetchHealth}>
              <RefreshCw size={16} />
              Refresh
            </AdminButton>
          </div>
        }
      />

      {loading && !health ? (
        <div className="text-center py-12 text-[oklch(0.60_0.01_250)]">
          Loading system health...
        </div>
      ) : !health ? (
        <div className="text-center py-12 text-[oklch(0.60_0.01_250)]">
          Failed to load system health
        </div>
      ) : (
        <>
          {/* Overall Status */}
          <div className="mb-8">
            <AdminCard>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>{getStatusIcon(health.overall_status)}</div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      System Status: <span className={getStatusColor(health.overall_status)}>
                        {health.overall_status.toUpperCase()}
                      </span>
                    </h3>
                    <p className="text-sm text-[oklch(0.60_0.01_250)]">
                      Last updated: {new Date(health.last_updated).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </AdminCard>
          </div>

          {/* Component Health Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* CloudConvert Health */}
            <AdminCard>
              <div className="flex items-center gap-3 mb-4">
                <Cloud size={24} className="text-[oklch(0.65_0.20_270)]" />
                <h3 className="text-lg font-semibold text-white">CloudConvert API</h3>
                <AdminBadge variant={health.components.cloudconvert.status === 'healthy' ? 'success' : 'error'}>
                  {health.components.cloudconvert.status}
                </AdminBadge>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[oklch(0.60_0.01_250)]">Success Rate (24h)</span>
                  <span className="text-white">{(parseFloat(health.components.cloudconvert.success_rate) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[oklch(0.60_0.01_250)]">Total Jobs (24h)</span>
                  <span className="text-white">{health.components.cloudconvert.total_jobs_24h}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[oklch(0.60_0.01_250)]">Completed / Failed</span>
                  <span className="text-white">
                    {health.components.cloudconvert.completed_24h} / {health.components.cloudconvert.failed_24h}
                  </span>
                </div>
              </div>
            </AdminCard>

            {/* Redis Queue Health */}
            <AdminCard>
              <div className="flex items-center gap-3 mb-4">
                <Server size={24} className="text-[oklch(0.65_0.20_270)]" />
                <h3 className="text-lg font-semibold text-white">Redis Queue</h3>
                <AdminBadge variant={health.components.redis.status === 'healthy' ? 'success' : 'warning'}>
                  {health.components.redis.status}
                </AdminBadge>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[oklch(0.60_0.01_250)]">Waiting / Active</span>
                  <span className="text-white">{health.components.redis.waiting} / {health.components.redis.active}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[oklch(0.60_0.01_250)]">Completed Today</span>
                  <span className="text-white">{health.components.redis.completed_today}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[oklch(0.60_0.01_250)]">Failed Today</span>
                  <span className="text-white">{health.components.redis.failed_today}</span>
                </div>
              </div>
            </AdminCard>

            {/* Database Health */}
            <AdminCard>
              <div className="flex items-center gap-3 mb-4">
                <Database size={24} className="text-[oklch(0.65_0.20_270)]" />
                <h3 className="text-lg font-semibold text-white">Database</h3>
                <AdminBadge variant={health.components.database.status === 'healthy' ? 'success' : 'warning'}>
                  {health.components.database.status}
                </AdminBadge>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[oklch(0.60_0.01_250)]">Active Connections</span>
                  <span className="text-white">
                    {health.components.database.connections.active} / {health.components.database.connections.max}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[oklch(0.60_0.01_250)]">Idle Connections</span>
                  <span className="text-white">{health.components.database.connections.idle}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[oklch(0.60_0.01_250)]">Usage</span>
                  <span className="text-white">{health.components.database.usage_percent}%</span>
                </div>
              </div>
            </AdminCard>

            {/* Storage Health */}
            <AdminCard>
              <div className="flex items-center gap-3 mb-4">
                <HardDrive size={24} className="text-[oklch(0.65_0.20_270)]" />
                <h3 className="text-lg font-semibold text-white">Storage</h3>
                <AdminBadge variant={health.components.storage.status === 'healthy' ? 'success' : 'warning'}>
                  {health.components.storage.status}
                </AdminBadge>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[oklch(0.60_0.01_250)]">Used / Capacity</span>
                  <span className="text-white">
                    {health.components.storage.total_gb} GB / {health.components.storage.capacity_gb} GB
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[oklch(0.60_0.01_250)]">Usage</span>
                  <span className="text-white">{health.components.storage.usage_percent}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[oklch(0.60_0.01_250)]">Total Files</span>
                  <span className="text-white">{health.components.storage.file_count}</span>
                </div>
              </div>
            </AdminCard>
          </div>

          {/* Manual Operations */}
          <AdminCard>
            <h3 className="text-lg font-semibold text-white mb-4">Manual Operations</h3>
            <div className="flex flex-wrap gap-3">
              <AdminButton
                variant="secondary"
                size="sm"
                onClick={handleTestConversion}
                disabled={operationLoading}
              >
                <PlayCircle size={16} />
                Test Conversion
              </AdminButton>

              <AdminButton
                variant="warning"
                size="sm"
                onClick={handleClearCache}
                disabled={operationLoading}
              >
                <RefreshCw size={16} />
                Clear Cache
              </AdminButton>

              <AdminButton
                variant="danger"
                size="sm"
                onClick={handleCleanupStorage}
                disabled={operationLoading}
              >
                <Trash2 size={16} />
                Cleanup Storage
              </AdminButton>
            </div>
            <p className="text-sm text-[oklch(0.60_0.01_250)] mt-4">
              All operations require confirmation and are logged to audit trail
            </p>
          </AdminCard>
        </>
      )}
    </AdminLayout>
  )
}
