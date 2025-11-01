'use client'

import React, { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, TrendingUp, FileText, DollarSign, RefreshCw, BarChart3 } from 'lucide-react'

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
    return 'text-muted-foreground'
  }

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Business intelligence and usage insights</p>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchAnalytics}>
            <RefreshCw size={16} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8 flex gap-2 border-b border-border">
        {['overview', 'users', 'conversions', 'revenue', 'features'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition ${
              activeTab === tab
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && overview && (
            <div className="space-y-8">
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="glass-strong border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Users size={20} className="text-primary" />
                      </div>
                      <span className="text-sm text-muted-foreground">Total Users</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{formatNumber(overview.metrics.total_users.value)}</p>
                    <p className={`text-sm ${getChangeColor(overview.metrics.total_users.change_percent)}`}>
                      {overview.metrics.total_users.change_percent}% vs previous period
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-strong border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <TrendingUp size={20} className="text-green-400" />
                      </div>
                      <span className="text-sm text-muted-foreground">Active Users</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{formatNumber(overview.metrics.active_users.value)}</p>
                    <p className="text-sm text-muted-foreground">Last 30 days</p>
                  </CardContent>
                </Card>

                <Card className="glass-strong border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <FileText size={20} className="text-blue-400" />
                      </div>
                      <span className="text-sm text-muted-foreground">Total Conversions</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{formatNumber(overview.metrics.total_conversions.value)}</p>
                    <p className={`text-sm ${getChangeColor(overview.metrics.total_conversions.change_percent)}`}>
                      {overview.metrics.total_conversions.change_percent}% vs previous period
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-strong border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <DollarSign size={20} className="text-green-400" />
                      </div>
                      <span className="text-sm text-muted-foreground">MRR (USD)</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">${overview.metrics.mrr.value}</p>
                    <p className="text-sm text-muted-foreground">Monthly Recurring Revenue</p>
                  </CardContent>
                </Card>
              </div>

              {/* Conversion Types Distribution */}
              <Card className="glass-strong border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Conversion Types Distribution
                  </CardTitle>
                  <CardDescription>Breakdown of conversion types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {overview.conversion_types.map((type) => (
                      <div key={type.type} className="bg-input p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">
                          {type.type.replace('_', ' ').replace('pdf-to-', 'PDF→').toUpperCase()}
                        </p>
                        <p className="text-xl font-bold text-foreground">{formatNumber(type.count)}</p>
                        <p className="text-sm text-muted-foreground">{type.percentage}%</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* User Growth */}
              {overview.charts.user_growth.length > 0 && (
                <Card className="glass-strong border-border/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      User Growth
                    </CardTitle>
                    <CardDescription>Daily signup trend</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {overview.charts.user_growth.map((day: any) => (
                        <div key={day.date} className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">{day.date}</span>
                          <span className="text-foreground">{day.signups} signups</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && users && (
            <div className="space-y-8">
              <Card className="glass-strong border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    User Distribution by Plan
                  </CardTitle>
                  <CardDescription>Active users across subscription tiers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {users.distribution_by_plan.map((item: any) => (
                      <div key={item.plan} className="bg-input p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">{item.plan}</p>
                        <p className="text-2xl font-bold text-foreground">{formatNumber(item.count)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-strong border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Churn Rate Trend (Last 12 Months)
                  </CardTitle>
                  <CardDescription>Monthly subscription cancellations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {users.churn_rate_trend.map((month: any) => (
                      <div key={month.month} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{month.month}</span>
                        <span className="text-foreground">{month.churn_rate}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Conversions Tab */}
          {activeTab === 'conversions' && conversions && (
            <div className="space-y-8">
              <Card className="glass-strong border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Success Rate Trend (Last 7 Days)
                  </CardTitle>
                  <CardDescription>Daily conversion success metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {conversions.success_rate_trend.map((day: any) => (
                      <div key={day.date} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{day.date}</span>
                        <span className="text-foreground">
                          {day.success_rate}% ({day.successful}/{day.total})
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-strong border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    File Size Distribution
                  </CardTitle>
                  <CardDescription>Conversions by file size range</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {conversions.file_size_distribution.map((item: any) => (
                      <div key={item.size_range} className="bg-input p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">{item.size_range}</p>
                        <p className="text-xl font-bold text-foreground">{formatNumber(item.count)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {conversions.failed_reasons.length > 0 && (
                <Card className="glass-strong border-border/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Top Failed Conversion Reasons
                    </CardTitle>
                    <CardDescription>Common error types</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {conversions.failed_reasons.map((item: any) => (
                        <div key={item.error_type} className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">{item.error_type}</span>
                          <span className="text-foreground">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Revenue Tab */}
          {activeTab === 'revenue' && revenue && (
            <div className="space-y-8">
              <Card className="glass-strong border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    MRR Trend (Last 12 Months)
                  </CardTitle>
                  <CardDescription>Monthly recurring revenue over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {revenue.mrr_trend.map((month: any) => (
                      <div key={month.month} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{month.month}</span>
                        <span className="text-foreground">${month.mrr}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-strong border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Revenue by Plan
                  </CardTitle>
                  <CardDescription>Revenue breakdown by subscription tier</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {revenue.revenue_by_plan.map((item: any) => (
                      <div key={item.plan} className="bg-input p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">{item.plan}</p>
                        <p className="text-xl font-bold text-foreground">${item.revenue}</p>
                        <p className="text-sm text-muted-foreground">{item.count} subscriptions</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-strong border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Subscription Trend (Last 12 Months)
                  </CardTitle>
                  <CardDescription>New subscriptions vs cancellations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {revenue.subscription_trend.map((month: any) => (
                      <div key={month.month} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{month.month}</span>
                        <span className="text-foreground">
                          +{month.new_subscriptions} / -{month.cancellations}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Features Tab */}
          {activeTab === 'features' && features && (
            <div className="space-y-8">
              <Card className="glass-strong border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Feature Usage
                  </CardTitle>
                  <CardDescription>Most popular conversion types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {features.usage.map((item: any) => (
                      <div key={item.type} className="bg-input p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">
                          {item.type.replace('_', ' ').replace('pdf-to-', 'PDF→').toUpperCase()}
                        </p>
                        <p className="text-2xl font-bold text-foreground">{formatNumber(item.count)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-strong border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Power Users (Top 10)
                  </CardTitle>
                  <CardDescription>Highest conversion activity users</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="pb-3 text-sm font-medium text-muted-foreground">Email</th>
                          <th className="pb-3 text-sm font-medium text-muted-foreground">Plan</th>
                          <th className="pb-3 text-sm font-medium text-muted-foreground">Conversions</th>
                          <th className="pb-3 text-sm font-medium text-muted-foreground">Last Active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {features.power_users.map((user: any) => (
                          <tr key={user.id} className="border-b border-border">
                            <td className="py-3 text-foreground">{user.email}</td>
                            <td className="py-3"><Badge variant="default">{user.plan}</Badge></td>
                            <td className="py-3 text-foreground">{formatNumber(user.conversion_count)}</td>
                            <td className="py-3 text-muted-foreground text-sm">
                              {new Date(user.last_active).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  )
}
