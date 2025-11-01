'use client'

import React, { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminCard } from '@/components/admin/AdminCard'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { AdminButton } from '@/components/admin/AdminButton'
import { Users, TrendingUp, FileText, DollarSign, RefreshCw } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

interface Analytics {
  metrics: {
    total_users: { value: number; change_percent: string }
    active_users: { value: number; change_percent: string }
    total_conversions: { value: number; change_percent: string }
    mrr: { value: string; change_percent: string }
  }
  charts: {
    user_growth: Array<{ date: string; signups: number }>
    conversion_volume: Array<{ date: string; conversions: number }>
  }
  conversion_types: Array<{ type: string; count: number; percentage: string }>
}

interface UserAnalytics {
  distribution_by_plan: Array<{ plan: string; count: number }>
  churn_rate_trend: Array<{ month: string; churn_rate: string }>
}

interface ConversionAnalytics {
  success_rate_trend: Array<{ date: string; success_rate: string; total: number; successful: number }>
  file_size_distribution: Array<{ size_range: string; count: number }>
  failed_reasons: Array<{ error_type: string; count: number }>
}

interface RevenueAnalytics {
  mrr_trend: Array<{ month: string; mrr: string }>
  revenue_by_plan: Array<{ plan: string; revenue: string; count: number }>
  subscription_trend: Array<{ month: string; new_subscriptions: number; cancellations: number }>
}

interface FeatureAnalytics {
  usage: Array<{ type: string; count: number }>
  power_users: Array<{ id: string; email: string; name: string; plan: string; conversion_count: number; last_active: string }>
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [overview, setOverview] = useState<Analytics | null>(null)
  const [users, setUsers] = useState<UserAnalytics | null>(null)
  const [conversions, setConversions] = useState<ConversionAnalytics | null>(null)
  const [revenue, setRevenue] = useState<RevenueAnalytics | null>(null)
  const [features, setFeatures] = useState<FeatureAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')

      // Fetch all analytics data
      const [overviewRes, usersRes, conversionsRes, revenueRes, featuresRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/analytics/overview`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/admin/analytics/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/admin/analytics/conversions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/admin/analytics/revenue`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/admin/analytics/features`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (overviewRes.ok) {
        const data = await overviewRes.json()
        setOverview(data.analytics)
      }

      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsers(data.users)
      }

      if (conversionsRes.ok) {
        const data = await conversionsRes.json()
        setConversions(data.conversions)
      }

      if (revenueRes.ok) {
        const data = await revenueRes.json()
        setRevenue(data.revenue)
      }

      if (featuresRes.ok) {
        const data = await featuresRes.json()
        setFeatures(data.features)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  const getChangeColor = (change: string) => {
    const val = parseFloat(change)
    if (val > 0) return 'text-green-400'
    if (val < 0) return 'text-red-400'
    return 'text-[oklch(0.60_0.01_250)]'
  }

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Analytics Dashboard"
        description="Business intelligence and usage insights"
        actions={
          <AdminButton variant="secondary" size="sm" onClick={fetchAnalytics}>
            <RefreshCw size={16} />
            Refresh
          </AdminButton>
        }
      />

      {/* Tab Navigation */}
      <div className="mb-8 flex gap-2 border-b border-[oklch(0.25_0.01_250)]">
        {['overview', 'users', 'conversions', 'revenue', 'features'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition ${
              activeTab === tab
                ? 'border-b-2 border-[oklch(0.65_0.20_270)] text-white'
                : 'text-[oklch(0.60_0.01_250)] hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[oklch(0.60_0.01_250)]">Loading analytics...</div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && overview && (
            <div className="space-y-8">
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <AdminCard>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-[oklch(0.65_0.20_270)]/20 rounded-lg">
                      <Users size={20} className="text-[oklch(0.65_0.20_270)]" />
                    </div>
                    <span className="text-sm text-[oklch(0.60_0.01_250)]">Total Users</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{formatNumber(overview.metrics.total_users.value)}</p>
                  <p className={`text-sm ${getChangeColor(overview.metrics.total_users.change_percent)}`}>
                    {overview.metrics.total_users.change_percent}% vs previous period
                  </p>
                </AdminCard>

                <AdminCard>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <TrendingUp size={20} className="text-green-400" />
                    </div>
                    <span className="text-sm text-[oklch(0.60_0.01_250)]">Active Users</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{formatNumber(overview.metrics.active_users.value)}</p>
                  <p className="text-sm text-[oklch(0.60_0.01_250)]">Last 30 days</p>
                </AdminCard>

                <AdminCard>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <FileText size={20} className="text-blue-400" />
                    </div>
                    <span className="text-sm text-[oklch(0.60_0.01_250)]">Total Conversions</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{formatNumber(overview.metrics.total_conversions.value)}</p>
                  <p className={`text-sm ${getChangeColor(overview.metrics.total_conversions.change_percent)}`}>
                    {overview.metrics.total_conversions.change_percent}% vs previous period
                  </p>
                </AdminCard>

                <AdminCard>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <DollarSign size={20} className="text-green-400" />
                    </div>
                    <span className="text-sm text-[oklch(0.60_0.01_250)]">MRR (USD)</span>
                  </div>
                  <p className="text-2xl font-bold text-white">${overview.metrics.mrr.value}</p>
                  <p className="text-sm text-[oklch(0.60_0.01_250)]">Monthly Recurring Revenue</p>
                </AdminCard>
              </div>

              {/* Conversion Types Distribution */}
              <AdminCard>
                <h3 className="text-lg font-semibold text-white mb-4">Conversion Types Distribution</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {overview.conversion_types.map((type) => (
                    <div key={type.type} className="bg-[oklch(0.15_0.01_250)] p-4 rounded-lg">
                      <p className="text-sm text-[oklch(0.60_0.01_250)] mb-1">
                        {type.type.replace('_', ' ').replace('pdf-to-', 'PDF→').toUpperCase()}
                      </p>
                      <p className="text-xl font-bold text-white">{formatNumber(type.count)}</p>
                      <p className="text-sm text-[oklch(0.60_0.01_250)]">{type.percentage}%</p>
                    </div>
                  ))}
                </div>
              </AdminCard>

              {/* User Growth */}
              {overview.charts.user_growth.length > 0 && (
                <AdminCard>
                  <h3 className="text-lg font-semibold text-white mb-4">User Growth</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {overview.charts.user_growth.map((day: any) => (
                      <div key={day.date} className="flex justify-between items-center text-sm">
                        <span className="text-[oklch(0.60_0.01_250)]">{day.date}</span>
                        <span className="text-white">{day.signups} signups</span>
                      </div>
                    ))}
                  </div>
                </AdminCard>
              )}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && users && (
            <div className="space-y-8">
              <AdminCard>
                <h3 className="text-lg font-semibold text-white mb-4">User Distribution by Plan</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {users.distribution_by_plan.map((item: any) => (
                    <div key={item.plan} className="bg-[oklch(0.15_0.01_250)] p-4 rounded-lg">
                      <p className="text-sm text-[oklch(0.60_0.01_250)] mb-1">{item.plan}</p>
                      <p className="text-2xl font-bold text-white">{formatNumber(item.count)}</p>
                    </div>
                  ))}
                </div>
              </AdminCard>

              <AdminCard>
                <h3 className="text-lg font-semibold text-white mb-4">Churn Rate Trend (Last 12 Months)</h3>
                <div className="space-y-2">
                  {users.churn_rate_trend.map((month: any) => (
                    <div key={month.month} className="flex justify-between items-center text-sm">
                      <span className="text-[oklch(0.60_0.01_250)]">{month.month}</span>
                      <span className="text-white">{month.churn_rate}%</span>
                    </div>
                  ))}
                </div>
              </AdminCard>
            </div>
          )}

          {/* Conversions Tab */}
          {activeTab === 'conversions' && conversions && (
            <div className="space-y-8">
              <AdminCard>
                <h3 className="text-lg font-semibold text-white mb-4">Success Rate Trend (Last 7 Days)</h3>
                <div className="space-y-2">
                  {conversions.success_rate_trend.map((day: any) => (
                    <div key={day.date} className="flex justify-between items-center text-sm">
                      <span className="text-[oklch(0.60_0.01_250)]">{day.date}</span>
                      <span className="text-white">
                        {day.success_rate}% ({day.successful}/{day.total})
                      </span>
                    </div>
                  ))}
                </div>
              </AdminCard>

              <AdminCard>
                <h3 className="text-lg font-semibold text-white mb-4">File Size Distribution</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {conversions.file_size_distribution.map((item: any) => (
                    <div key={item.size_range} className="bg-[oklch(0.15_0.01_250)] p-4 rounded-lg">
                      <p className="text-sm text-[oklch(0.60_0.01_250)] mb-1">{item.size_range}</p>
                      <p className="text-xl font-bold text-white">{formatNumber(item.count)}</p>
                    </div>
                  ))}
                </div>
              </AdminCard>

              {conversions.failed_reasons.length > 0 && (
                <AdminCard>
                  <h3 className="text-lg font-semibold text-white mb-4">Top Failed Conversion Reasons</h3>
                  <div className="space-y-2">
                    {conversions.failed_reasons.map((item: any) => (
                      <div key={item.error_type} className="flex justify-between items-center text-sm">
                        <span className="text-[oklch(0.60_0.01_250)]">{item.error_type}</span>
                        <span className="text-white">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </AdminCard>
              )}
            </div>
          )}

          {/* Revenue Tab */}
          {activeTab === 'revenue' && revenue && (
            <div className="space-y-8">
              <AdminCard>
                <h3 className="text-lg font-semibold text-white mb-4">MRR Trend (Last 12 Months)</h3>
                <div className="space-y-2">
                  {revenue.mrr_trend.map((month: any) => (
                    <div key={month.month} className="flex justify-between items-center text-sm">
                      <span className="text-[oklch(0.60_0.01_250)]">{month.month}</span>
                      <span className="text-white">${month.mrr}</span>
                    </div>
                  ))}
                </div>
              </AdminCard>

              <AdminCard>
                <h3 className="text-lg font-semibold text-white mb-4">Revenue by Plan</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {revenue.revenue_by_plan.map((item: any) => (
                    <div key={item.plan} className="bg-[oklch(0.15_0.01_250)] p-4 rounded-lg">
                      <p className="text-sm text-[oklch(0.60_0.01_250)] mb-1">{item.plan}</p>
                      <p className="text-xl font-bold text-white">${item.revenue}</p>
                      <p className="text-sm text-[oklch(0.60_0.01_250)]">{item.count} subscriptions</p>
                    </div>
                  ))}
                </div>
              </AdminCard>

              <AdminCard>
                <h3 className="text-lg font-semibold text-white mb-4">Subscription Trend (Last 12 Months)</h3>
                <div className="space-y-2">
                  {revenue.subscription_trend.map((month: any) => (
                    <div key={month.month} className="flex justify-between items-center text-sm">
                      <span className="text-[oklch(0.60_0.01_250)]">{month.month}</span>
                      <span className="text-white">
                        +{month.new_subscriptions} / -{month.cancellations}
                      </span>
                    </div>
                  ))}
                </div>
              </AdminCard>
            </div>
          )}

          {/* Features Tab */}
          {activeTab === 'features' && features && (
            <div className="space-y-8">
              <AdminCard>
                <h3 className="text-lg font-semibold text-white mb-4">Feature Usage</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {features.usage.map((item: any) => (
                    <div key={item.type} className="bg-[oklch(0.15_0.01_250)] p-4 rounded-lg">
                      <p className="text-sm text-[oklch(0.60_0.01_250)] mb-1">
                        {item.type.replace('_', ' ').replace('pdf-to-', 'PDF→').toUpperCase()}
                      </p>
                      <p className="text-2xl font-bold text-white">{formatNumber(item.count)}</p>
                    </div>
                  ))}
                </div>
              </AdminCard>

              <AdminCard>
                <h3 className="text-lg font-semibold text-white mb-4">Power Users (Top 10)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[oklch(0.25_0.01_250)] text-left">
                        <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Email</th>
                        <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Plan</th>
                        <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Conversions</th>
                        <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Last Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {features.power_users.map((user: any) => (
                        <tr key={user.id} className="border-b border-[oklch(0.25_0.01_250)]">
                          <td className="py-3 text-white">{user.email}</td>
                          <td className="py-3"><AdminBadge variant="info" size="sm">{user.plan}</AdminBadge></td>
                          <td className="py-3 text-white">{formatNumber(user.conversion_count)}</td>
                          <td className="py-3 text-[oklch(0.60_0.01_250)] text-sm">
                            {new Date(user.last_active).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AdminCard>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  )
}
