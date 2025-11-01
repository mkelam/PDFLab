'use client'

import React, { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
        return <Activity size={24} className="text-muted-foreground" />
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
        return 'text-muted-foreground'
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
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">System Health & Monitoring</h1>
            <p className="text-muted-foreground">Monitor system components and perform maintenance operations</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={autoRefresh ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
            </Button>
            <Button variant="secondary" size="sm" onClick={fetchHealth}>
              <RefreshCw size={16} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {loading && !health ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading system health...
        </div>
      ) : !health ? (
        <div className="text-center py-12 text-muted-foreground">
          Failed to load system health
        </div>
      ) : (
        <>
          {/* Overall Status */}
          <div className="mb-8">
            <Card className="glass-strong border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>{getStatusIcon(health.overall_status)}</div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">
                        System Status: <span className={getStatusColor(health.overall_status)}>
                          {health.overall_status.toUpperCase()}
                        </span>
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Last updated: {new Date(health.last_updated).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Component Health Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* CloudConvert Health */}
            <Card className="glass-strong border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-primary" />
                  CloudConvert API
                </CardTitle>
                <CardDescription>
                  <Badge variant={health.components.cloudconvert.status === 'healthy' ? 'default' : 'destructive'}>
                    {health.components.cloudconvert.status}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Success Rate (24h)</span>
                    <span className="text-foreground">{(parseFloat(health.components.cloudconvert.success_rate) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Jobs (24h)</span>
                    <span className="text-foreground">{health.components.cloudconvert.total_jobs_24h}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Completed / Failed</span>
                    <span className="text-foreground">
                      {health.components.cloudconvert.completed_24h} / {health.components.cloudconvert.failed_24h}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Redis Queue Health */}
            <Card className="glass-strong border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Server className="w-5 h-5 text-primary" />
                  Redis Queue
                </CardTitle>
                <CardDescription>
                  <Badge variant={health.components.redis.status === 'healthy' ? 'default' : 'secondary'}>
                    {health.components.redis.status}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Waiting / Active</span>
                    <span className="text-foreground">{health.components.redis.waiting} / {health.components.redis.active}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Completed Today</span>
                    <span className="text-foreground">{health.components.redis.completed_today}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Failed Today</span>
                    <span className="text-foreground">{health.components.redis.failed_today}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Database Health */}
            <Card className="glass-strong border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  Database
                </CardTitle>
                <CardDescription>
                  <Badge variant={health.components.database.status === 'healthy' ? 'default' : 'secondary'}>
                    {health.components.database.status}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active Connections</span>
                    <span className="text-foreground">
                      {health.components.database.connections.active} / {health.components.database.connections.max}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Idle Connections</span>
                    <span className="text-foreground">{health.components.database.connections.idle}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Usage</span>
                    <span className="text-foreground">{health.components.database.usage_percent}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Storage Health */}
            <Card className="glass-strong border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-primary" />
                  Storage
                </CardTitle>
                <CardDescription>
                  <Badge variant={health.components.storage.status === 'healthy' ? 'default' : 'secondary'}>
                    {health.components.storage.status}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Used / Capacity</span>
                    <span className="text-foreground">
                      {health.components.storage.total_gb} GB / {health.components.storage.capacity_gb} GB
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Usage</span>
                    <span className="text-foreground">{health.components.storage.usage_percent}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Files</span>
                    <span className="text-foreground">{health.components.storage.file_count}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Manual Operations */}
          <Card className="glass-strong border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Manual Operations
              </CardTitle>
              <CardDescription>System maintenance and testing tools</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleTestConversion}
                  disabled={operationLoading}
                >
                  <PlayCircle size={16} />
                  Test Conversion
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleClearCache}
                  disabled={operationLoading}
                >
                  <RefreshCw size={16} />
                  Clear Cache
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleCleanupStorage}
                  disabled={operationLoading}
                >
                  <Trash2 size={16} />
                  Cleanup Storage
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                All operations require confirmation and are logged to audit trail
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </AdminLayout>
  )
}
