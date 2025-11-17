'use client'

import React, { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  Cloud,
  Upload,
  Download,
  Clock,
  ArrowRight,
  Users,
  TrendingUp,
  TrendingDown,
  Zap,
  AlertTriangle,
  Info,
  Settings,
  Lock,
  CreditCard,
  Mail
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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

interface FlowHealth {
  overall_status: string
  stages: {
    auth: {
      status: string
      success_rate: string
      logins_last_hour: number
    }
    upload: {
      status: string
      avg_response_time_ms: number
      jobs_last_hour: number
    }
    database: {
      status: string
      query_time_ms: number
      connections_used: number
      connections_max: number
      usage_percent: string
    }
    convert: {
      status: string
      success_rate: string
      completed_last_hour: number
      failed_last_hour: number
      queue_waiting: number
      queue_active: number
      avg_processing_time_s?: number
    }
    download: {
      status: string
      avg_response_time_ms: number
    }
    payment: {
      status: string
      success_rate: string
      total_payments_last_hour: number
      successful_payments: number
    }
    email: {
      status: string
      smtp_configured: boolean
      smtp_host: string
    }
    storage: {
      status: string
      used_gb: string
      capacity_gb: number
      usage_percent: string
      file_count: number
    }
  }
}

interface BusinessMetrics {
  active_users: number
  conversions_today: number
  conversions_yesterday: number
  percent_change: string
  success_rate_last_hour: string
  avg_processing_time_s: number
  p95_processing_time_s: number
  total_jobs_last_hour: number
}

interface EnvironmentConfig {
  node_env: string
  is_production: boolean
  cloudconvert_sandbox: boolean
  payfast_mode: string
  cors_origins: string[]
  cors_valid: boolean
  db_host: string
  db_uses_localhost: boolean
  redis_host: string
  redis_uses_localhost: boolean
  validation_status: string
  issues: string[]
}

interface RecentError {
  id: string
  type: string
  message: string
  timestamp: string
  user_id: string | null
  user_email: string
  file_name: string
  endpoint: string
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [flowHealth, setFlowHealth] = useState<FlowHealth | null>(null)
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null)
  const [environmentConfig, setEnvironmentConfig] = useState<EnvironmentConfig | null>(null)
  const [recentErrors, setRecentErrors] = useState<RecentError[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [operationLoading, setOperationLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')
      const headers = { 'Authorization': `Bearer ${token}` }

      const [healthRes, flowRes, metricsRes, configRes, errorsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/system/health`, { headers }),
        fetch(`${API_URL}/api/admin/system/flow-health`, { headers }),
        fetch(`${API_URL}/api/admin/system/business-metrics`, { headers }),
        fetch(`${API_URL}/api/admin/system/environment-config`, { headers }),
        fetch(`${API_URL}/api/admin/system/recent-errors`, { headers })
      ])

      if (healthRes.ok) {
        const data = await healthRes.json()
        setHealth(data.health)
      }
      if (flowRes.ok) {
        const data = await flowRes.json()
        setFlowHealth(data.flow_health)
      }
      if (metricsRes.ok) {
        const data = await metricsRes.json()
        setBusinessMetrics(data.metrics)
      }
      if (configRes.ok) {
        const data = await configRes.json()
        setEnvironmentConfig(data.config)
      }
      if (errorsRes.ok) {
        const data = await errorsRes.json()
        setRecentErrors(data.errors)
      }

      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to fetch system data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchAllData, 30000) // 30 seconds
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

  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' => {
    switch (status) {
      case 'healthy':
        return 'default'
      case 'warning':
        return 'secondary'
      case 'critical':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const handleTestConversion = async () => {
    if (!confirm('Run test conversion?')) return

    try {
      setOperationLoading(true)
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/system/test-conversion`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
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
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        alert('Cache cleared successfully')
        fetchAllData()
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
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Storage cleanup completed!\n\nDeleted jobs: ${data.stats.deleted_jobs}\nDeleted files: ${data.stats.deleted_files}\nFreed space: ${data.stats.freed_space_mb} MB`)
        fetchAllData()
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

  if (loading && !health) {
    return (
      <AdminLayout>
        <div className="text-center py-12 text-muted-foreground">
          Loading system health...
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Application Health & Operations</h1>
            <p className="text-muted-foreground">End-to-end monitoring and system diagnostics</p>
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={autoRefresh ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
            </Button>
            <Button variant="secondary" size="sm" onClick={fetchAllData}>
              <RefreshCw size={16} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Overall Status Banner */}
      <div className="mb-8">
        <Card className="glass-strong border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>{getStatusIcon(health?.overall_status || 'unknown')}</div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">
                    System Status: <span className={getStatusColor(health?.overall_status || 'unknown')}>
                      {(health?.overall_status || 'UNKNOWN').toUpperCase()}
                    </span>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    All systems operational • {flowHealth?.stages.convert?.queue_waiting || 0} jobs in queue
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* End-to-End Flow Health Pipeline (8 Stages - 2 Rows) */}
      <div className="mb-8">
        <Card className="glass-strong border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Comprehensive Application Pipeline
            </CardTitle>
            <CardDescription>End-to-end flow health (last 1 hour) - User Flow + Infrastructure</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Row 1: User Flow (Auth → Upload → Convert → Download) */}
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">User Flow</h4>
              <div className="flex items-center justify-between gap-3">
                {/* Stage 1: Auth */}
                <div className="flex flex-col items-center flex-1">
                  <div className={`p-3 rounded-lg border-2 ${
                    flowHealth?.stages.auth?.status === 'healthy'
                      ? 'border-green-500/50 bg-green-500/10'
                      : flowHealth?.stages.auth?.status === 'warning'
                      ? 'border-yellow-500/50 bg-yellow-500/10'
                      : 'border-red-500/50 bg-red-500/10'
                  }`}>
                    <Lock className={`w-6 h-6 ${
                      flowHealth?.stages.auth?.status === 'healthy'
                        ? 'text-green-400'
                        : flowHealth?.stages.auth?.status === 'warning'
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`} />
                  </div>
                  <span className="text-xs font-medium mt-2">Auth</span>
                  <Badge variant={getStatusBadgeVariant(flowHealth?.stages.auth?.status || 'unknown')} className="mt-1 text-xs">
                    {flowHealth?.stages.auth?.status || 'unknown'}
                  </Badge>
                  <span className="text-xs text-muted-foreground mt-1">
                    {flowHealth?.stages.auth?.success_rate || '0'}% success
                  </span>
                </div>

                <ArrowRight className="text-muted-foreground flex-shrink-0" size={20} />

                {/* Stage 2: Upload */}
                <div className="flex flex-col items-center flex-1">
                  <div className={`p-3 rounded-lg border-2 ${
                    flowHealth?.stages.upload?.status === 'healthy'
                      ? 'border-green-500/50 bg-green-500/10'
                      : flowHealth?.stages.upload?.status === 'warning'
                      ? 'border-yellow-500/50 bg-yellow-500/10'
                      : 'border-red-500/50 bg-red-500/10'
                  }`}>
                    <Upload className={`w-6 h-6 ${
                      flowHealth?.stages.upload?.status === 'healthy'
                        ? 'text-green-400'
                        : flowHealth?.stages.upload?.status === 'warning'
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`} />
                  </div>
                  <span className="text-xs font-medium mt-2">Upload</span>
                  <Badge variant={getStatusBadgeVariant(flowHealth?.stages.upload?.status || 'unknown')} className="mt-1 text-xs">
                    {flowHealth?.stages.upload?.status || 'unknown'}
                  </Badge>
                  <span className="text-xs text-muted-foreground mt-1">
                    {flowHealth?.stages.upload?.avg_response_time_ms || 0}ms avg
                  </span>
                </div>

                <ArrowRight className="text-muted-foreground flex-shrink-0" size={20} />

                {/* Stage 3: Convert (CloudConvert + Queue) */}
                <div className="flex flex-col items-center flex-1">
                  <div className={`p-3 rounded-lg border-2 ${
                    flowHealth?.stages.convert?.status === 'healthy'
                      ? 'border-green-500/50 bg-green-500/10'
                      : flowHealth?.stages.convert?.status === 'warning'
                      ? 'border-yellow-500/50 bg-yellow-500/10'
                      : 'border-red-500/50 bg-red-500/10'
                  }`}>
                    <Cloud className={`w-6 h-6 ${
                      flowHealth?.stages.convert?.status === 'healthy'
                        ? 'text-green-400'
                        : flowHealth?.stages.convert?.status === 'warning'
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`} />
                  </div>
                  <span className="text-xs font-medium mt-2">Convert</span>
                  <Badge variant={getStatusBadgeVariant(flowHealth?.stages.convert?.status || 'unknown')} className="mt-1 text-xs">
                    {flowHealth?.stages.convert?.status || 'unknown'}
                  </Badge>
                  <span className="text-xs text-muted-foreground mt-1">
                    {flowHealth?.stages.convert?.success_rate || '0'}% success
                  </span>
                </div>

                <ArrowRight className="text-muted-foreground flex-shrink-0" size={20} />

                {/* Stage 4: Download */}
                <div className="flex flex-col items-center flex-1">
                  <div className={`p-3 rounded-lg border-2 ${
                    flowHealth?.stages.download?.status === 'healthy'
                      ? 'border-green-500/50 bg-green-500/10'
                      : flowHealth?.stages.download?.status === 'warning'
                      ? 'border-yellow-500/50 bg-yellow-500/10'
                      : 'border-red-500/50 bg-red-500/10'
                  }`}>
                    <Download className={`w-6 h-6 ${
                      flowHealth?.stages.download?.status === 'healthy'
                        ? 'text-green-400'
                        : flowHealth?.stages.download?.status === 'warning'
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`} />
                  </div>
                  <span className="text-xs font-medium mt-2">Download</span>
                  <Badge variant={getStatusBadgeVariant(flowHealth?.stages.download?.status || 'unknown')} className="mt-1 text-xs">
                    {flowHealth?.stages.download?.status || 'unknown'}
                  </Badge>
                  <span className="text-xs text-muted-foreground mt-1">
                    {flowHealth?.stages.download?.avg_response_time_ms || 0}ms avg
                  </span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border/50 mb-6"></div>

            {/* Row 2: Infrastructure (Database → Payment → Email → Storage) */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Infrastructure</h4>
              <div className="flex items-center justify-between gap-3">
                {/* Stage 5: Database */}
                <div className="flex flex-col items-center flex-1">
                  <div className={`p-3 rounded-lg border-2 ${
                    flowHealth?.stages.database?.status === 'healthy'
                      ? 'border-green-500/50 bg-green-500/10'
                      : flowHealth?.stages.database?.status === 'warning'
                      ? 'border-yellow-500/50 bg-yellow-500/10'
                      : 'border-red-500/50 bg-red-500/10'
                  }`}>
                    <Database className={`w-6 h-6 ${
                      flowHealth?.stages.database?.status === 'healthy'
                        ? 'text-green-400'
                        : flowHealth?.stages.database?.status === 'warning'
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`} />
                  </div>
                  <span className="text-xs font-medium mt-2">Database</span>
                  <Badge variant={getStatusBadgeVariant(flowHealth?.stages.database?.status || 'unknown')} className="mt-1 text-xs">
                    {flowHealth?.stages.database?.status || 'unknown'}
                  </Badge>
                  <span className="text-xs text-muted-foreground mt-1">
                    {flowHealth?.stages.database?.query_time_ms || 0}ms query
                  </span>
                </div>

                <ArrowRight className="text-muted-foreground flex-shrink-0" size={20} />

                {/* Stage 6: Payment */}
                <div className="flex flex-col items-center flex-1">
                  <div className={`p-3 rounded-lg border-2 ${
                    flowHealth?.stages.payment?.status === 'healthy'
                      ? 'border-green-500/50 bg-green-500/10'
                      : flowHealth?.stages.payment?.status === 'warning'
                      ? 'border-yellow-500/50 bg-yellow-500/10'
                      : 'border-red-500/50 bg-red-500/10'
                  }`}>
                    <CreditCard className={`w-6 h-6 ${
                      flowHealth?.stages.payment?.status === 'healthy'
                        ? 'text-green-400'
                        : flowHealth?.stages.payment?.status === 'warning'
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`} />
                  </div>
                  <span className="text-xs font-medium mt-2">Payment</span>
                  <Badge variant={getStatusBadgeVariant(flowHealth?.stages.payment?.status || 'unknown')} className="mt-1 text-xs">
                    {flowHealth?.stages.payment?.status || 'unknown'}
                  </Badge>
                  <span className="text-xs text-muted-foreground mt-1">
                    {flowHealth?.stages.payment?.success_rate || '100'}% success
                  </span>
                </div>

                <ArrowRight className="text-muted-foreground flex-shrink-0" size={20} />

                {/* Stage 7: Email */}
                <div className="flex flex-col items-center flex-1">
                  <div className={`p-3 rounded-lg border-2 ${
                    flowHealth?.stages.email?.status === 'healthy'
                      ? 'border-green-500/50 bg-green-500/10'
                      : flowHealth?.stages.email?.status === 'warning'
                      ? 'border-yellow-500/50 bg-yellow-500/10'
                      : 'border-red-500/50 bg-red-500/10'
                  }`}>
                    <Mail className={`w-6 h-6 ${
                      flowHealth?.stages.email?.status === 'healthy'
                        ? 'text-green-400'
                        : flowHealth?.stages.email?.status === 'warning'
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`} />
                  </div>
                  <span className="text-xs font-medium mt-2">Email</span>
                  <Badge variant={getStatusBadgeVariant(flowHealth?.stages.email?.status || 'unknown')} className="mt-1 text-xs">
                    {flowHealth?.stages.email?.status || 'unknown'}
                  </Badge>
                  <span className="text-xs text-muted-foreground mt-1">
                    {flowHealth?.stages.email?.smtp_configured ? 'Configured' : 'Not set'}
                  </span>
                </div>

                <ArrowRight className="text-muted-foreground flex-shrink-0" size={20} />

                {/* Stage 8: Storage */}
                <div className="flex flex-col items-center flex-1">
                  <div className={`p-3 rounded-lg border-2 ${
                    flowHealth?.stages.storage?.status === 'healthy'
                      ? 'border-green-500/50 bg-green-500/10'
                      : flowHealth?.stages.storage?.status === 'warning'
                      ? 'border-yellow-500/50 bg-yellow-500/10'
                      : 'border-red-500/50 bg-red-500/10'
                  }`}>
                    <HardDrive className={`w-6 h-6 ${
                      flowHealth?.stages.storage?.status === 'healthy'
                        ? 'text-green-400'
                        : flowHealth?.stages.storage?.status === 'warning'
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`} />
                  </div>
                  <span className="text-xs font-medium mt-2">Storage</span>
                  <Badge variant={getStatusBadgeVariant(flowHealth?.stages.storage?.status || 'unknown')} className="mt-1 text-xs">
                    {flowHealth?.stages.storage?.status || 'unknown'}
                  </Badge>
                  <span className="text-xs text-muted-foreground mt-1">
                    {flowHealth?.stages.storage?.usage_percent || '0'}% used
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Active Users */}
        <Card className="glass-strong border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{businessMetrics?.active_users || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Last 15 minutes</p>
          </CardContent>
        </Card>

        {/* Conversions Today */}
        <Card className="glass-strong border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Conversions Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{businessMetrics?.conversions_today || 0}</p>
            <p className={`text-xs mt-1 flex items-center gap-1 ${
              parseFloat(businessMetrics?.percent_change || '0') >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {parseFloat(businessMetrics?.percent_change || '0') >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {businessMetrics?.percent_change}% vs yesterday
            </p>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card className="glass-strong border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Success Rate (1h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{businessMetrics?.success_rate_last_hour || '100'}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {businessMetrics?.total_jobs_last_hour || 0} total jobs
            </p>
          </CardContent>
        </Card>

        {/* Avg Processing Time */}
        <Card className="glass-strong border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Avg Processing Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{businessMetrics?.avg_processing_time_s || 0}s</p>
            <p className="text-xs text-muted-foreground mt-1">
              P95: {businessMetrics?.p95_processing_time_s || 0}s
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Left Column - Component Health */}
        <div className="space-y-6">
          {/* CloudConvert Health */}
          <Card className="glass-strong border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Cloud className="w-5 h-5 text-primary" />
                CloudConvert API
              </CardTitle>
              <CardDescription>
                <Badge variant={health?.components.cloudconvert.status === 'healthy' ? 'default' : 'destructive'}>
                  {health?.components.cloudconvert.status}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Success Rate (24h)</span>
                  <span className="text-foreground">{(parseFloat(health?.components.cloudconvert.success_rate || '0') * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Jobs (24h)</span>
                  <span className="text-foreground">{health?.components.cloudconvert.total_jobs_24h}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completed / Failed</span>
                  <span className="text-foreground">
                    {health?.components.cloudconvert.completed_24h} / {health?.components.cloudconvert.failed_24h}
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
                <Badge variant={health?.components.redis.status === 'healthy' ? 'default' : 'secondary'}>
                  {health?.components.redis.status}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Waiting / Active</span>
                  <span className="text-foreground">{health?.components.redis.waiting} / {health?.components.redis.active}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completed Today</span>
                  <span className="text-foreground">{health?.components.redis.completed_today}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Failed Today</span>
                  <span className="text-foreground">{health?.components.redis.failed_today}</span>
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
                <Badge variant={health?.components.database.status === 'healthy' ? 'default' : 'secondary'}>
                  {health?.components.database.status}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Active Connections</span>
                  <span className="text-foreground">
                    {health?.components.database.connections.active} / {health?.components.database.connections.max}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Idle Connections</span>
                  <span className="text-foreground">{health?.components.database.connections.idle}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Usage</span>
                  <span className="text-foreground">{health?.components.database.usage_percent}%</span>
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
                <Badge variant={health?.components.storage.status === 'healthy' ? 'default' : 'secondary'}>
                  {health?.components.storage.status}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Used / Capacity</span>
                  <span className="text-foreground">
                    {health?.components.storage.total_gb} GB / {health?.components.storage.capacity_gb} GB
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Usage</span>
                  <span className="text-foreground">{health?.components.storage.usage_percent}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Files</span>
                  <span className="text-foreground">{health?.components.storage.file_count}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Environment & Errors */}
        <div className="space-y-6">
          {/* Environment Configuration */}
          <Card className="glass-strong border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Environment Configuration
              </CardTitle>
              <CardDescription>
                <Badge variant={environmentConfig?.validation_status === 'healthy' ? 'default' : 'destructive'}>
                  {environmentConfig?.validation_status || 'unknown'}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground">Node Environment</span>
                  <Badge variant={environmentConfig?.node_env === 'production' ? 'default' : 'secondary'}>
                    {environmentConfig?.node_env}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground">CloudConvert Mode</span>
                  <Badge variant={environmentConfig?.is_production && environmentConfig?.cloudconvert_sandbox ? 'destructive' : 'default'}>
                    {environmentConfig?.cloudconvert_sandbox ? 'Sandbox' : 'Production'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground">PayFast Mode</span>
                  <Badge variant={environmentConfig?.payfast_mode === 'production' ? 'default' : 'secondary'}>
                    {environmentConfig?.payfast_mode}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground">CORS Valid</span>
                  <Badge variant={environmentConfig?.cors_valid ? 'default' : 'destructive'}>
                    {environmentConfig?.cors_valid ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground">Database Host</span>
                  <Badge variant={environmentConfig?.db_uses_localhost && environmentConfig?.is_production ? 'destructive' : 'default'}>
                    {environmentConfig?.db_uses_localhost ? 'Localhost' : 'Production'}
                  </Badge>
                </div>
              </div>
              {environmentConfig && environmentConfig.issues.length > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-sm font-semibold text-red-400 mb-2">Configuration Issues:</p>
                  <ul className="text-xs text-red-300 space-y-1">
                    {environmentConfig.issues.map((issue, index) => (
                      <li key={index}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Real-Time Error Stream */}
          <Card className="glass-strong border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-primary" />
                Recent Errors
              </CardTitle>
              <CardDescription>Last 10 errors from the past hour</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentErrors.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-foreground">No Recent Errors</p>
                    <p className="text-xs text-muted-foreground mt-1">All systems operating normally</p>
                  </div>
                ) : (
                  recentErrors.map((error) => (
                    <div key={error.id} className="p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="destructive" className="text-xs">
                          {error.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(error.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground font-mono mb-2 truncate">
                        {error.message}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>User: {error.user_email}</span>
                        <span>{error.file_name}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Manual Operations */}
      <Card className="glass-strong border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Diagnostic Tools
          </CardTitle>
          <CardDescription>System maintenance and testing operations</CardDescription>
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
    </AdminLayout>
  )
}
