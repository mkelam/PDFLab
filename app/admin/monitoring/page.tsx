'use client'

import React, { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  RefreshCw,
  Server,
  Database,
  Wifi,
  HardDrive,
  Bell,
  BellOff,
  Eye,
  Filter,
  Monitor,
  Users,
  Trash2,
  Play,
  RotateCw
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

interface MonitoringDashboardData {
  currentStatus: {
    health: any
    drift: any
    alerts: {
      total: number
      critical: number
      warning: number
    }
  }
  trends: {
    drift: any[]
    uptime: any
  }
  recentAlerts: any[]
}

interface HealthCheck {
  id: string
  environment: string
  timestamp: string
  overall_status: 'healthy' | 'unhealthy' | 'degraded'
  services_healthy: number
  services_unhealthy: number
  backend_status: string
  worker_status: string
  mysql_status: string
  redis_status: string
}

interface DriftCheck {
  id: string
  timestamp: string
  drift_score: number
  drift_level: 'none' | 'minor' | 'critical'
  checks_total: number
  checks_passed: number
  checks_failed: number
}

interface Alert {
  id: string
  alert_type: string
  severity: 'info' | 'warning' | 'critical' | 'urgent'
  environment: string
  timestamp: string
  title: string
  message: string
  acknowledged: boolean
  resolved: boolean
  metric_name?: string
  metric_value?: number
  action_taken?: string
  requires_human_action?: boolean
}

export default function MonitoringDashboard() {
  const [dashboardData, setDashboardData] = useState<MonitoringDashboardData | null>(null)
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([])
  const [driftChecks, setDriftChecks] = useState<DriftCheck[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Service management state
  const [servicesStatus, setServicesStatus] = useState<any[]>([])
  const [dbConnections, setDbConnections] = useState<any[]>([])
  const [cachePattern, setCachePattern] = useState('*')
  const [operationLoading, setOperationLoading] = useState(false)

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/monitoring/dashboard`, {
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error('Failed to fetch monitoring data')
      }

      const data = await response.json()
      setDashboardData(data.data)
      setLastUpdate(new Date())
      setError('') // Clear any previous errors
    } catch (err: any) {
      console.error('Dashboard fetch error:', err)
      setError(err.message)
    }
  }

  // Fetch health checks
  const fetchHealthChecks = async (page = 1, limit = 20) => {
    try {
      const response = await fetch(
        `${API_URL}/api/admin/monitoring/health-checks?page=${page}&limit=${limit}`,
        { headers: getAuthHeaders() }
      )
      const data = await response.json()
      setHealthChecks(data.data || [])
    } catch (err: any) {
      console.error('Health checks fetch error:', err)
    }
  }

  // Fetch drift checks
  const fetchDriftChecks = async (page = 1, limit = 20) => {
    try {
      const response = await fetch(
        `${API_URL}/api/admin/monitoring/drift-checks?page=${page}&limit=${limit}`,
        { headers: getAuthHeaders() }
      )
      const data = await response.json()
      setDriftChecks(data.data || [])
    } catch (err: any) {
      console.error('Drift checks fetch error:', err)
    }
  }

  // Fetch alerts
  const fetchAlerts = async (page = 1, limit = 50) => {
    try {
      const response = await fetch(
        `${API_URL}/api/admin/monitoring/alerts?page=${page}&limit=${limit}&acknowledged=false&resolved=false`,
        { headers: getAuthHeaders() }
      )
      const data = await response.json()
      setAlerts(data.data || [])
    } catch (err: any) {
      console.error('Alerts fetch error:', err)
    }
  }

  // Acknowledge alert
  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`${API_URL}/api/admin/monitoring/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: getAuthHeaders()
      })
      fetchAlerts()
      fetchDashboardData()
    } catch (err: any) {
      console.error('Acknowledge alert error:', err)
    }
  }

  // Resolve alert
  const resolveAlert = async (alertId: string) => {
    try {
      await fetch(`${API_URL}/api/admin/monitoring/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: getAuthHeaders()
      })
      fetchAlerts()
      fetchDashboardData()
    } catch (err: any) {
      console.error('Resolve alert error:', err)
    }
  }

  // Fetch services status
  const fetchServicesStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/manage/services/status`, {
        headers: getAuthHeaders()
      })
      const data = await response.json()
      if (data.services) {
        setServicesStatus(data.services)
      }
    } catch (err: any) {
      console.error('Fetch services status error:', err)
    }
  }

  // Restart service
  const restartService = async (serviceName: string) => {
    if (!confirm(`Are you sure you want to restart ${serviceName}? This may cause brief downtime.`)) return

    try {
      setOperationLoading(true)
      const response = await fetch(`${API_URL}/api/admin/manage/services/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ serviceName })
      })
      const data = await response.json()
      alert(data.message || 'Service restart initiated')
      fetchServicesStatus()
    } catch (err: any) {
      alert('Failed to restart service: ' + err.message)
    } finally {
      setOperationLoading(false)
    }
  }

  // Clear Redis cache
  const clearRedisCache = async () => {
    if (!confirm(`Clear cache for pattern: ${cachePattern}?`)) return

    try {
      setOperationLoading(true)
      const response = await fetch(`${API_URL}/api/admin/manage/cache/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ pattern: cachePattern })
      })
      const data = await response.json()
      alert(data.message || 'Cache cleared successfully')
    } catch (err: any) {
      alert('Failed to clear cache: ' + err.message)
    } finally {
      setOperationLoading(false)
    }
  }

  // Run disk cleanup
  const runDiskCleanup = async () => {
    if (!confirm('Run disk cleanup? This will remove unused Docker images and compress logs.')) return

    try {
      setOperationLoading(true)
      const response = await fetch(`${API_URL}/api/admin/manage/disk/cleanup`, {
        method: 'POST',
        headers: getAuthHeaders()
      })
      const data = await response.json()
      alert(data.message || 'Disk cleanup completed')
    } catch (err: any) {
      alert('Failed to run disk cleanup: ' + err.message)
    } finally {
      setOperationLoading(false)
    }
  }

  // Optimize database
  const optimizeDatabase = async () => {
    if (!confirm('Optimize all database tables? This may take a few moments.')) return

    try {
      setOperationLoading(true)
      const response = await fetch(`${API_URL}/api/admin/manage/database/optimize`, {
        method: 'POST',
        headers: getAuthHeaders()
      })
      const data = await response.json()
      alert(data.message || 'Database optimization completed')
    } catch (err: any) {
      alert('Failed to optimize database: ' + err.message)
    } finally {
      setOperationLoading(false)
    }
  }

  // Fetch database connections
  const fetchDatabaseConnections = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/manage/database/connections`, {
        headers: getAuthHeaders()
      })
      const data = await response.json()
      if (data.connections) {
        setDbConnections(data.connections)
      }
    } catch (err: any) {
      console.error('Fetch DB connections error:', err)
    }
  }

  // Check authentication before making API calls
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('authToken')
      if (token) {
        setIsAuthenticated(true)
      }
    }

    // Check immediately
    checkAuth()

    // Also check after a delay to catch token refresh
    const timeout = setTimeout(checkAuth, 1000)

    return () => clearTimeout(timeout)
  }, [])

  // Initial data fetch (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated) return

    const fetchAllData = async () => {
      setIsLoading(true)
      await Promise.all([
        fetchDashboardData(),
        fetchHealthChecks(),
        fetchDriftChecks(),
        fetchAlerts()
      ])
      setIsLoading(false)
    }
    fetchAllData()
  }, [isAuthenticated])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh || !isAuthenticated) return

    const interval = setInterval(() => {
      fetchDashboardData()
      fetchHealthChecks()
      fetchDriftChecks()
      fetchAlerts()
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh, isAuthenticated])

  // Get status badge variant
  const getStatusVariant = (status: string): 'default' | 'destructive' | 'secondary' => {
    if (status === 'healthy') return 'default'
    if (status === 'unhealthy') return 'destructive'
    return 'secondary'
  }

  // Get drift level color
  const getDriftColor = (level: string) => {
    if (level === 'none') return 'text-green-500'
    if (level === 'minor') return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <AdminLayout>
      <div>
        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">System Monitoring</h1>
            <p className="text-muted-foreground">Real-time infrastructure health & drift detection</p>
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="flex items-center gap-2"
            >
              {autoRefresh ? <Eye className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                fetchDashboardData()
                fetchHealthChecks()
                fetchDriftChecks()
                fetchAlerts()
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Now
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Current Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Health Status */}
          <Card className="glass-strong border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Current Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">
                    {dashboardData?.currentStatus.health?.services_healthy || 0}/6
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Services Healthy</p>
                </div>
                <Badge variant={getStatusVariant(dashboardData?.currentStatus.health?.overall_status || 'unknown')} className="text-lg px-4 py-2 capitalize">
                  {dashboardData?.currentStatus.health?.overall_status || 'Unknown'}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="flex items-center gap-2">
                  <Server className={`w-3 h-3 ${dashboardData?.currentStatus.health?.backend_status === 'healthy' ? 'text-green-500' : 'text-red-500'}`} />
                  <span className="text-xs">Backend</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className={`w-3 h-3 ${dashboardData?.currentStatus.health?.worker_status === 'healthy' ? 'text-green-500' : 'text-red-500'}`} />
                  <span className="text-xs">Worker</span>
                </div>
                <div className="flex items-center gap-2">
                  <Monitor className={`w-3 h-3 ${dashboardData?.currentStatus.health?.frontend_status === 'running' ? 'text-green-500' : 'text-red-500'}`} />
                  <span className="text-xs">Frontend</span>
                </div>
                <div className="flex items-center gap-2">
                  <Database className={`w-3 h-3 ${dashboardData?.currentStatus.health?.mysql_status === 'healthy' ? 'text-green-500' : 'text-red-500'}`} />
                  <span className="text-xs">MySQL</span>
                </div>
                <div className="flex items-center gap-2">
                  <HardDrive className={`w-3 h-3 ${dashboardData?.currentStatus.health?.redis_status === 'healthy' ? 'text-green-500' : 'text-red-500'}`} />
                  <span className="text-xs">Redis</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className={`w-3 h-3 ${dashboardData?.currentStatus.health?.partners_status === 'running' ? 'text-green-500' : 'text-red-500'}`} />
                  <span className="text-xs">Partners</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Drift Score */}
          <Card className="glass-strong border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Drift Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-3xl font-bold ${getDriftColor(dashboardData?.currentStatus.drift?.drift_level || 'none')}`}>
                    {dashboardData?.currentStatus.drift?.drift_score || 0}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Configuration Drift</p>
                </div>
                <Badge variant={dashboardData?.currentStatus.drift?.drift_level === 'none' ? 'default' : 'destructive'} className="text-lg px-4 py-2 capitalize">
                  {dashboardData?.currentStatus.drift?.drift_level || 'None'}
                </Badge>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Checks Passed</span>
                  <span>{dashboardData?.currentStatus.drift?.checks_passed || 0}/{dashboardData?.currentStatus.drift?.checks_total || 6}</span>
                </div>
                <div className="w-full bg-border/50 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${((dashboardData?.currentStatus.drift?.checks_passed || 0) / (dashboardData?.currentStatus.drift?.checks_total || 6)) * 100}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Alerts */}
          <Card className="glass-strong border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">
                    {dashboardData?.currentStatus.alerts?.total || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Unacknowledged</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Badge variant="destructive" className="text-xs">
                    {dashboardData?.currentStatus.alerts?.critical || 0} Critical
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {dashboardData?.currentStatus.alerts?.warning || 0} Warning
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Drift Trend Chart */}
          <Card className="glass-strong border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">7-Day Drift Trend</CardTitle>
              <CardDescription>Configuration drift over the past week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={dashboardData?.trends.drift || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#888" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#888" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="avg_drift" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Service Uptime Chart */}
          <Card className="glass-strong border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">7-Day Service Uptime</CardTitle>
              <CardDescription>Percentage of time each service was healthy</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={[
                  { name: 'Backend', uptime: dashboardData?.trends.uptime?.backend_uptime || 0 },
                  { name: 'Worker', uptime: dashboardData?.trends.uptime?.worker_uptime || 0 },
                  { name: 'MySQL', uptime: dashboardData?.trends.uptime?.mysql_uptime || 0 },
                  { name: 'Redis', uptime: dashboardData?.trends.uptime?.redis_uptime || 0 },
                  { name: 'Frontend', uptime: dashboardData?.trends.uptime?.frontend_uptime || 0 },
                  { name: 'Partners', uptime: dashboardData?.trends.uptime?.partners_uptime || 0 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#888" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#888" style={{ fontSize: '12px' }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value: number) => `${value.toFixed(2)}%`}
                  />
                  <Bar dataKey="uptime" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for detailed views */}
        <Tabs defaultValue="alerts" className="space-y-6">
          <TabsList className="glass-subtle border border-border/50">
            <TabsTrigger value="alerts">Alerts ({alerts.length})</TabsTrigger>
            <TabsTrigger value="health">Health Checks ({healthChecks.length})</TabsTrigger>
            <TabsTrigger value="drift">Drift Checks ({driftChecks.length})</TabsTrigger>
            <TabsTrigger value="management">Service Management</TabsTrigger>
          </TabsList>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <Card className="glass-strong border-border/50">
              <CardHeader>
                <CardTitle>Active Alerts</CardTitle>
                <CardDescription>Unacknowledged system alerts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <p className="text-lg font-semibold text-foreground">No Active Alerts</p>
                      <p className="text-sm text-muted-foreground mt-2">All systems operating normally</p>
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <div key={alert.id} className="p-4 rounded-lg border border-border/50 hover:border-border transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant={alert.severity === 'critical' || alert.severity === 'urgent' ? 'destructive' : alert.severity === 'warning' ? 'secondary' : 'default'} className="capitalize">
                                {alert.severity}
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {alert.alert_type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{alert.environment}</span>
                              {alert.requires_human_action && (
                                <Badge variant="destructive" className="text-xs">
                                  <Bell className="w-3 h-3 mr-1" />
                                  Action Required
                                </Badge>
                              )}
                            </div>
                            <h4 className="font-semibold text-foreground mb-1">{alert.title}</h4>
                            <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                            {(alert.metric_name || alert.action_taken) && (
                              <div className="flex items-center gap-4 mb-2 text-xs">
                                {alert.metric_name && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Metric:</span>
                                    <span className="font-mono text-foreground">{alert.metric_name}</span>
                                    {alert.metric_value !== undefined && (
                                      <span className="font-mono text-primary">{alert.metric_value}</span>
                                    )}
                                  </div>
                                )}
                                {alert.action_taken && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Action:</span>
                                    <span className="text-foreground">{alert.action_taken}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">{new Date(alert.timestamp).toLocaleString()}</p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => acknowledgeAlert(alert.id)}
                              className="flex items-center gap-2"
                            >
                              <Eye className="w-3 h-3" />
                              Acknowledge
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => resolveAlert(alert.id)}
                              className="flex items-center gap-2"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Resolve
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Health Checks Tab */}
          <TabsContent value="health">
            <Card className="glass-strong border-border/50">
              <CardHeader>
                <CardTitle>Recent Health Checks</CardTitle>
                <CardDescription>Last 20 health check results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {healthChecks.map((check) => (
                    <div key={check.id} className="p-3 rounded-lg border border-border/50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Badge variant={getStatusVariant(check.overall_status)} className="capitalize">
                          {check.overall_status}
                        </Badge>
                        <div className="flex gap-2">
                          <span className={`text-xs ${check.backend_status === 'healthy' ? 'text-green-500' : 'text-red-500'}`}>BE</span>
                          <span className={`text-xs ${check.worker_status === 'healthy' ? 'text-green-500' : 'text-red-500'}`}>WK</span>
                          <span className={`text-xs ${check.mysql_status === 'healthy' ? 'text-green-500' : 'text-red-500'}`}>DB</span>
                          <span className={`text-xs ${check.redis_status === 'healthy' ? 'text-green-500' : 'text-red-500'}`}>RD</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{check.environment}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(check.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Drift Checks Tab */}
          <TabsContent value="drift">
            <Card className="glass-strong border-border/50">
              <CardHeader>
                <CardTitle>Recent Drift Checks</CardTitle>
                <CardDescription>Last 20 drift detection results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {driftChecks.map((check) => (
                    <div key={check.id} className="p-3 rounded-lg border border-border/50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`text-2xl font-bold ${getDriftColor(check.drift_level)}`}>
                          {check.drift_score}%
                        </div>
                        <Badge variant={check.drift_level === 'none' ? 'default' : 'destructive'} className="capitalize">
                          {check.drift_level}
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          {check.checks_passed}/{check.checks_total} checks passed
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(check.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Service Management Tab */}
          <TabsContent value="management">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Baseline Calculation */}
              <Card className="glass-strong border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Baseline Calculation
                  </CardTitle>
                  <CardDescription>Calculate 7-day rolling baseline for resource metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Scheduled: Daily at 2:00 AM UTC
                  </p>
                  <Button
                    onClick={async () => {
                      try {
                        await fetch(`${API_URL}/api/admin/monitoring/services/baseline/run`, {
                          method: 'POST',
                          headers: getAuthHeaders()
                        })
                        alert('Baseline calculation started')
                      } catch (err) {
                        alert('Failed to start baseline calculation')
                      }
                    }}
                    className="w-full"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Run Baseline Calculation Now
                  </Button>
                </CardContent>
              </Card>

              {/* Daily Report */}
              <Card className="glass-strong border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Daily Report
                  </CardTitle>
                  <CardDescription>Send comprehensive daily digest email</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Scheduled: Daily at 9:00 AM UTC
                  </p>
                  <Button
                    onClick={async () => {
                      try {
                        await fetch(`${API_URL}/api/admin/monitoring/services/daily-report/send`, {
                          method: 'POST',
                          headers: getAuthHeaders()
                        })
                        alert('Daily report sent successfully')
                      } catch (err) {
                        alert('Failed to send daily report')
                      }
                    }}
                    className="w-full"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Send Daily Report Now
                  </Button>
                </CardContent>
              </Card>

              {/* Security Scan */}
              <Card className="glass-strong border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Security Scan
                  </CardTitle>
                  <CardDescription>Scan for suspicious activity and auto-block IPs</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Scheduled: Every 5 minutes
                  </p>
                  <Button
                    onClick={async () => {
                      try {
                        await fetch(`${API_URL}/api/admin/monitoring/services/security-blocker/scan`, {
                          method: 'POST',
                          headers: getAuthHeaders()
                        })
                        alert('Security scan started')
                      } catch (err) {
                        alert('Failed to start security scan')
                      }
                    }}
                    className="w-full"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Run Security Scan Now
                  </Button>
                </CardContent>
              </Card>

              {/* IP Management */}
              <Card className="glass-strong border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wifi className="w-5 h-5" />
                    IP Management
                  </CardTitle>
                  <CardDescription>Manually block or unblock IP addresses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">IP Address</label>
                      <input
                        type="text"
                        id="ip-address"
                        placeholder="192.168.1.1"
                        className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={async () => {
                          const ip = (document.getElementById('ip-address') as HTMLInputElement)?.value
                          if (!ip) return alert('Please enter an IP address')
                          try {
                            await fetch(`${API_URL}/api/admin/monitoring/services/security-blocker/block-ip`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                              body: JSON.stringify({ ip, reason: 'Manual block', duration: 86400 })
                            })
                            alert(`IP ${ip} blocked successfully`)
                          } catch (err) {
                            alert('Failed to block IP')
                          }
                        }}
                        variant="destructive"
                        className="flex-1"
                      >
                        Block IP
                      </Button>
                      <Button
                        onClick={async () => {
                          const ip = (document.getElementById('ip-address') as HTMLInputElement)?.value
                          if (!ip) return alert('Please enter an IP address')
                          try {
                            await fetch(`${API_URL}/api/admin/monitoring/services/security-blocker/unblock-ip`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                              body: JSON.stringify({ ip })
                            })
                            alert(`IP ${ip} unblocked successfully`)
                          } catch (err) {
                            alert('Failed to unblock IP')
                          }
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        Unblock IP
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Docker Service Management */}
              <Card className="glass-strong border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    Docker Services
                  </CardTitle>
                  <CardDescription>View and manage Docker containers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button
                      onClick={fetchServicesStatus}
                      variant="outline"
                      size="sm"
                      className="w-full mb-3"
                    >
                      <RefreshCw className="w-3 h-3 mr-2" />
                      Refresh Services Status
                    </Button>
                    {servicesStatus.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Click refresh to load services</p>
                    ) : (
                      servicesStatus.map((service: any) => (
                        <div key={service.name} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                          <div className="flex items-center gap-3">
                            <Badge variant={service.status === 'running' ? 'default' : 'destructive'}>
                              {service.status}
                            </Badge>
                            <span className="text-sm font-medium">{service.name}</span>
                          </div>
                          <Button
                            onClick={() => restartService(service.name)}
                            disabled={operationLoading}
                            variant="outline"
                            size="sm"
                          >
                            <RotateCw className="w-3 h-3 mr-1" />
                            Restart
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Redis Cache Management */}
              <Card className="glass-strong border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <HardDrive className="w-5 h-5" />
                    Redis Cache
                  </CardTitle>
                  <CardDescription>Clear cached data by pattern</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Cache Pattern</label>
                      <input
                        type="text"
                        value={cachePattern}
                        onChange={(e) => setCachePattern(e.target.value)}
                        placeholder="* (all) or specific pattern"
                        className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Examples: * (all), user:*, conversion:*
                      </p>
                    </div>
                    <Button
                      onClick={clearRedisCache}
                      disabled={operationLoading}
                      variant="destructive"
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Cache
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Disk Management */}
              <Card className="glass-strong border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <HardDrive className="w-5 h-5" />
                    Disk Management
                  </CardTitle>
                  <CardDescription>Clean up disk space and optimize storage</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Removes unused Docker images, compresses logs, and cleans old uploads
                  </p>
                  <Button
                    onClick={runDiskCleanup}
                    disabled={operationLoading}
                    variant="secondary"
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Run Disk Cleanup
                  </Button>
                </CardContent>
              </Card>

              {/* Database Management */}
              <Card className="glass-strong border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Database Optimization
                  </CardTitle>
                  <CardDescription>Optimize tables and view connections</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button
                      onClick={optimizeDatabase}
                      disabled={operationLoading}
                      variant="secondary"
                      className="w-full"
                    >
                      <Database className="w-4 h-4 mr-2" />
                      Optimize All Tables
                    </Button>
                    <Button
                      onClick={fetchDatabaseConnections}
                      disabled={operationLoading}
                      variant="outline"
                      className="w-full"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Active Connections
                    </Button>
                    {dbConnections.length > 0 && (
                      <div className="mt-3 p-3 rounded-lg border border-border/50">
                        <p className="text-xs text-muted-foreground mb-2">Active Connections: {dbConnections.length}</p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {dbConnections.map((conn: any, idx: number) => (
                            <div key={idx} className="text-xs p-2 bg-background/50 rounded">
                              <span className="font-mono">{conn.user}@{conn.host}</span>
                              <span className="text-muted-foreground ml-2">({conn.db || 'no db'})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}
