'use client'

import React, { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { QueueHealthWidget } from '@/components/admin/QueueHealthWidget'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, FileText, DollarSign, TrendingUp, AlertTriangle, Activity, Shield, BarChart3, CreditCard, RefreshCw } from 'lucide-react'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

interface DashboardData {
  revenue: {
    mrr: number
    arr: number
    active_subscriptions: number
  }
  system: {
    overall_status: 'healthy' | 'warning' | 'critical'
    cloudconvert: { status: string }
    redis: { status: string }
    database: { status: string }
  }
  analytics: {
    total_users: number
    active_users: number
    total_conversions: number
    mrr: number
    change_percent?: number
  }
  audit: {
    total_logs: number
    security_events: number
    recent_actions: Array<{
      id: string
      action: string
      admin_email: string
      severity: string
      created_at: string
    }>
  }
}

function StatCard({ icon, label, value, change, loading }: {
  icon: React.ReactNode
  label: string
  value: string
  change?: string
  loading?: boolean
}) {
  return (
    <Card className="glass-strong border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            {icon}
          </div>
          {change && (
            <Badge variant={change.startsWith('+') ? 'default' : 'destructive'} className="text-xs">
              {change}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <CardTitle className="text-sm font-medium text-muted-foreground mb-1">{label}</CardTitle>
        <p className="text-2xl font-bold text-foreground">
          {loading ? (
            <span className="animate-pulse">Loading...</span>
          ) : (
            value
          )}
        </p>
      </CardContent>
    </Card>
  )
}

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('authToken')

      if (!token) {
        setError('No authentication token found')
        return
      }

      // Fetch data from all endpoints in parallel
      const [revenueRes, systemRes, analyticsRes, auditLogsRes, securityRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/payments/analytics`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/admin/system/health`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/admin/analytics/overview`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/admin/audit-logs?page=1&limit=5`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/admin/audit-logs/security-events`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const revenue = await revenueRes.json()
      const system = await systemRes.json()
      const analytics = await analyticsRes.json()
      const auditLogs = await auditLogsRes.json()
      const security = await securityRes.json()

      setDashboardData({
        revenue: {
          mrr: parseFloat(revenue.analytics?.mrr || 0),
          arr: parseFloat(revenue.analytics?.arr || 0),
          active_subscriptions: parseInt(revenue.analytics?.active_subscriptions || 0)
        },
        system: system.health || {
          overall_status: 'healthy',
          cloudconvert: { status: 'unknown' },
          redis: { status: 'unknown' },
          database: { status: 'unknown' }
        },
        analytics: {
          total_users: parseInt(analytics.analytics?.metrics?.total_users?.value || 0),
          active_users: parseInt(analytics.analytics?.metrics?.active_users?.value || 0),
          total_conversions: parseInt(analytics.analytics?.metrics?.total_conversions?.value || 0),
          mrr: parseFloat(analytics.analytics?.metrics?.mrr?.value || 0),
          change_percent: parseFloat(analytics.analytics?.metrics?.total_users?.change_percent || 0)
        },
        audit: {
          total_logs: auditLogs.pagination?.total || 0,
          security_events: security.events?.length || 0,
          recent_actions: (auditLogs.logs || []).slice(0, 5).map((log: any) => ({
            id: log.id,
            action: log.action,
            admin_email: log.adminUser?.email || 'Unknown',
            severity: log.severity,
            created_at: log.created_at
          }))
        }
      })
    } catch (err: any) {
      console.error('Dashboard fetch error:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AdminLayout>
      <div>
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Unified Admin Dashboard</h1>
          <p className="text-muted-foreground">Consolidated overview of all admin features (Epics 1-7)</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Users size={24} />}
            label="Total Users"
            value={dashboardData?.analytics.total_users.toString() || '0'}
            change={dashboardData?.analytics.change_percent ? `${dashboardData.analytics.change_percent > 0 ? '+' : ''}${dashboardData.analytics.change_percent.toFixed(1)}%` : undefined}
            loading={isLoading}
          />
          <StatCard
            icon={<TrendingUp size={24} />}
            label="Active Users"
            value={dashboardData?.analytics.active_users.toString() || '0'}
            loading={isLoading}
          />
          <StatCard
            icon={<FileText size={24} />}
            label="Total Conversions"
            value={dashboardData?.analytics.total_conversions.toString() || '0'}
            loading={isLoading}
          />
          <StatCard
            icon={<DollarSign size={24} />}
            label="MRR (USD)"
            value={dashboardData?.revenue.mrr ? `$${dashboardData.revenue.mrr.toFixed(2)}` : '$0.00'}
            loading={isLoading}
          />
        </div>

        {/* Revenue & System Health Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Revenue Overview */}
          <Card className="glass-strong border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Revenue Overview
              </CardTitle>
              <Link href="/admin/payments" className="text-sm text-primary hover:text-primary/80">
                View All →
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-lg border border-border/50">
                  <span className="text-sm text-muted-foreground">MRR</span>
                  <span className="text-xl font-bold text-green-500">
                    ${dashboardData?.revenue.mrr.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg border border-border/50">
                  <span className="text-sm text-muted-foreground">ARR</span>
                  <span className="text-lg font-semibold text-foreground">
                    ${dashboardData?.revenue.arr.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg border border-border/50">
                  <span className="text-sm text-muted-foreground">Active Subscriptions</span>
                  <span className="text-lg font-semibold text-foreground">
                    {dashboardData?.revenue.active_subscriptions || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Health */}
          <Card className="glass-strong border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                System Health
              </CardTitle>
              <Link href="/admin/system" className="text-sm text-primary hover:text-primary/80">
                View Details →
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                  <span className="text-sm text-muted-foreground">Overall Status</span>
                  <Badge variant={dashboardData?.system.overall_status === 'healthy' ? 'default' : 'destructive'} className="capitalize">
                    {dashboardData?.system.overall_status || 'Unknown'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                  <span className="text-sm text-muted-foreground">CloudConvert</span>
                  <Badge variant="outline" className="capitalize">
                    {dashboardData?.system.cloudconvert?.status || 'Unknown'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                  <span className="text-sm text-muted-foreground">Database</span>
                  <Badge variant="outline" className="capitalize">
                    {dashboardData?.system.database?.status || 'Unknown'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Queue Health Widget */}
        <div className="mb-8">
          <QueueHealthWidget />
        </div>

        {/* Security & Recent Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Security Events */}
          <Card className="glass-strong border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Security Events
              </CardTitle>
              <Link href="/admin/audit-logs" className="text-sm text-primary hover:text-primary/80">
                View All →
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 rounded-lg border border-border/50">
                  <div>
                    <p className="text-xs text-muted-foreground">Security Events (24h)</p>
                    <p className="text-2xl font-bold text-orange-500 mt-1">
                      {dashboardData?.audit.security_events || 0}
                    </p>
                  </div>
                  <AlertTriangle size={28} className="text-orange-500" />
                </div>
                <div className="flex justify-between items-center p-4 rounded-lg border border-border/50">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Audit Logs</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {dashboardData?.audit.total_logs || 0}
                    </p>
                  </div>
                  <FileText size={28} className="text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Admin Activity */}
          <Card className="glass-strong border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Recent Admin Activity</CardTitle>
              <Link href="/admin/audit-logs" className="text-sm text-primary hover:text-primary/80">
                View All →
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashboardData?.audit.recent_actions && dashboardData.audit.recent_actions.length > 0 ? (
                  dashboardData.audit.recent_actions.map((action) => (
                    <div key={action.id} className="flex items-start justify-between p-3 rounded-lg border border-border/50 hover:border-border transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{action.action}</p>
                        <p className="text-xs text-muted-foreground mt-1">{action.admin_email}</p>
                      </div>
                      <Badge variant={action.severity === 'critical' ? 'destructive' : action.severity === 'warning' ? 'secondary' : 'default'} className="ml-3 capitalize text-xs">
                        {action.severity}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Grid */}
        <Card className="glass-strong border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Admin Tools
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchDashboardData} className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/admin/users">
                <Card className="glass-subtle border-border/40 hover:border-border transition-all hover:scale-105 cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">User Management</CardTitle>
                    <CardDescription className="text-xs">Manage users & roles</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
              <Link href="/admin/conversions">
                <Card className="glass-subtle border-border/40 hover:border-border transition-all hover:scale-105 cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Conversion Jobs</CardTitle>
                    <CardDescription className="text-xs">Monitor jobs & queue</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
              <Link href="/admin/payments">
                <Card className="glass-subtle border-border/40 hover:border-border transition-all hover:scale-105 cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Payments</CardTitle>
                    <CardDescription className="text-xs">Subscriptions & revenue</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
              <Link href="/admin/system">
                <Card className="glass-subtle border-border/40 hover:border-border transition-all hover:scale-105 cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">System Health</CardTitle>
                    <CardDescription className="text-xs">Monitor infrastructure</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
              <Link href="/admin/analytics">
                <Card className="glass-subtle border-border/40 hover:border-border transition-all hover:scale-105 cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Analytics</CardTitle>
                    <CardDescription className="text-xs">Business insights</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
              <Link href="/admin/audit-logs">
                <Card className="glass-subtle border-border/40 hover:border-border transition-all hover:scale-105 cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Audit Logs</CardTitle>
                    <CardDescription className="text-xs">Compliance & security</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
              <Link href="/admin/payments/transactions">
                <Card className="glass-subtle border-border/40 hover:border-border transition-all hover:scale-105 cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Transactions</CardTitle>
                    <CardDescription className="text-xs">Payment history</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
