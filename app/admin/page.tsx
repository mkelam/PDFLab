'use client'

import React, { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { QueueHealthWidget } from '@/components/admin/QueueHealthWidget'
import { Users, FileText, DollarSign, TrendingUp, AlertTriangle, Activity, Shield } from 'lucide-react'
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
    <div className="glass p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-primary/20 rounded-lg text-primary">
          {icon}
        </div>
        {change && (
          <span className={`text-sm ${change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{change}</span>
        )}
      </div>
      <h3 className="text-muted-foreground text-sm font-medium mb-1">{label}</h3>
      <p className="text-2xl font-bold text-foreground">
        {loading ? (
          <span className="animate-pulse">Loading...</span>
        ) : (
          value
        )}
      </p>
    </div>
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400'
      case 'warning': return 'text-yellow-400'
      case 'critical': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'warning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
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
          <div className="glass p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <DollarSign size={20} />
                Revenue Overview
              </h2>
              <Link href="/admin/payments" className="text-sm text-primary hover:text-primary/80">
                View All →
              </Link>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-black/30 rounded-lg">
                <span className="text-muted-foreground">MRR</span>
                <span className="text-xl font-bold text-green-400">
                  ${dashboardData?.revenue.mrr.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-black/30 rounded-lg">
                <span className="text-muted-foreground">ARR</span>
                <span className="text-lg font-semibold text-foreground">
                  ${dashboardData?.revenue.arr.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-black/30 rounded-lg">
                <span className="text-muted-foreground">Active Subscriptions</span>
                <span className="text-lg font-semibold text-foreground">
                  {dashboardData?.revenue.active_subscriptions || 0}
                </span>
              </div>
            </div>
          </div>

          {/* System Health */}
          <div className="glass p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Activity size={20} />
                System Health
              </h2>
              <Link href="/admin/system" className="text-sm text-primary hover:text-primary/80">
                View Details →
              </Link>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                <span className="text-muted-foreground">Overall Status</span>
                <span className={`font-semibold capitalize ${getStatusColor(dashboardData?.system.overall_status || 'healthy')}`}>
                  {dashboardData?.system.overall_status || 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                <span className="text-muted-foreground">CloudConvert</span>
                <span className={`font-semibold capitalize ${getStatusColor(dashboardData?.system.cloudconvert?.status || 'unknown')}`}>
                  {dashboardData?.system.cloudconvert?.status || 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                <span className="text-muted-foreground">Database</span>
                <span className={`font-semibold capitalize ${getStatusColor(dashboardData?.system.database?.status || 'unknown')}`}>
                  {dashboardData?.system.database?.status || 'Unknown'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Queue Health Widget */}
        <div className="mb-8">
          <QueueHealthWidget />
        </div>

        {/* Security & Recent Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Security Events */}
          <div className="glass p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Shield size={20} />
                Security Events
              </h2>
              <Link href="/admin/audit-logs" className="text-sm text-primary hover:text-primary/80">
                View All →
              </Link>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-4 bg-black/30 rounded-lg">
                <div>
                  <p className="text-muted-foreground text-sm">Security Events (24h)</p>
                  <p className="text-2xl font-bold text-orange-400 mt-1">
                    {dashboardData?.audit.security_events || 0}
                  </p>
                </div>
                <AlertTriangle size={32} className="text-orange-400" />
              </div>
              <div className="flex justify-between items-center p-4 bg-black/30 rounded-lg">
                <div>
                  <p className="text-muted-foreground text-sm">Total Audit Logs</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {dashboardData?.audit.total_logs || 0}
                  </p>
                </div>
                <FileText size={32} className="text-blue-400" />
              </div>
            </div>
          </div>

          {/* Recent Admin Activity */}
          <div className="glass p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground">Recent Admin Activity</h2>
              <Link href="/admin/audit-logs" className="text-sm text-primary hover:text-primary/80">
                View All →
              </Link>
            </div>
            <div className="space-y-2">
              {dashboardData?.audit.recent_actions && dashboardData.audit.recent_actions.length > 0 ? (
                dashboardData.audit.recent_actions.map((action) => (
                  <div key={action.id} className="flex items-start justify-between p-3 bg-black/30 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{action.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">{action.admin_email}</p>
                    </div>
                    <div className="ml-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityBadge(action.severity)}`}>
                        {action.severity}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No recent activity</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="glass p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Admin Tools (All Epics)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/admin/users"
              className="p-4 bg-black/30 rounded-lg hover:bg-black/40 transition border border-white/10"
            >
              <h3 className="font-semibold text-foreground mb-1">Epic 2: User Management</h3>
              <p className="text-sm text-muted-foreground">Manage users & roles</p>
            </Link>
            <Link
              href="/admin/jobs"
              className="p-4 bg-black/30 rounded-lg hover:bg-black/40 transition border border-white/10"
            >
              <h3 className="font-semibold text-foreground mb-1">Epic 3: Conversion Jobs</h3>
              <p className="text-sm text-muted-foreground">Monitor jobs & queue</p>
            </Link>
            <Link
              href="/admin/payments"
              className="p-4 bg-black/30 rounded-lg hover:bg-black/40 transition border border-white/10"
            >
              <h3 className="font-semibold text-foreground mb-1">Epic 4: Payments</h3>
              <p className="text-sm text-muted-foreground">Subscriptions & revenue</p>
            </Link>
            <Link
              href="/admin/system"
              className="p-4 bg-black/30 rounded-lg hover:bg-black/40 transition border border-white/10"
            >
              <h3 className="font-semibold text-foreground mb-1">Epic 5: System Health</h3>
              <p className="text-sm text-muted-foreground">Monitor infrastructure</p>
            </Link>
            <Link
              href="/admin/analytics"
              className="p-4 bg-black/30 rounded-lg hover:bg-black/40 transition border border-white/10"
            >
              <h3 className="font-semibold text-foreground mb-1">Epic 6: Analytics</h3>
              <p className="text-sm text-muted-foreground">Business insights</p>
            </Link>
            <Link
              href="/admin/audit-logs"
              className="p-4 bg-black/30 rounded-lg hover:bg-black/40 transition border border-white/10"
            >
              <h3 className="font-semibold text-foreground mb-1">Epic 7: Audit Logs</h3>
              <p className="text-sm text-muted-foreground">Compliance & security</p>
            </Link>
            <Link
              href="/admin/payments/transactions"
              className="p-4 bg-black/30 rounded-lg hover:bg-black/40 transition border border-white/10"
            >
              <h3 className="font-semibold text-foreground mb-1">Transactions</h3>
              <p className="text-sm text-muted-foreground">Payment history</p>
            </Link>
            <button
              onClick={fetchDashboardData}
              className="p-4 bg-primary/20 hover:bg-primary/30 rounded-lg transition text-left border border-primary/30"
            >
              <h3 className="font-semibold text-foreground mb-1">Refresh Data</h3>
              <p className="text-sm text-muted-foreground">Update all metrics</p>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
