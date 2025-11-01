'use client'

import React, { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { SubscriptionDetailModal } from '@/components/admin/SubscriptionDetailModal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Download, ChevronLeft, ChevronRight, DollarSign, TrendingUp, Users, XCircle, CreditCard } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

interface Subscription {
  id: string
  user_id: string
  plan: string
  status: string
  amount: number
  currency: string
  billing_date?: string
  next_billing_date?: string
  started_at: string
  payfast_token?: string
  user?: {
    id: string
    email: string
    name?: string
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface Stats {
  active: number
  canceled: number
  past_due: number
  mrr: string
}

export default function PaymentsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0
  })
  const [stats, setStats] = useState<Stats>({
    active: 0,
    canceled: 0,
    past_due: 0,
    mrr: '0.00'
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null)

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(planFilter !== 'all' && { plan: planFilter })
      })

      const response = await fetch(`${API_URL}/api/admin/payments/subscriptions?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSubscriptions(data.subscriptions || [])
        setPagination(data.pagination)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscriptions()
  }, [pagination.page, statusFilter, planFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchSubscriptions()
  }

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'active': return 'default'
      case 'canceled': return 'destructive'
      case 'past_due': return 'secondary'
      case 'trialing': return 'default'
      case 'pending': return 'outline'
      default: return 'outline'
    }
  }

  const getPlanBadgeVariant = (plan: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (plan) {
      case 'enterprise': return 'default'
      case 'pro': return 'default'
      case 'starter': return 'secondary'
      default: return 'outline'
    }
  }

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(planFilter !== 'all' && { plan: planFilter })
      })

      const response = await fetch(`${API_URL}/api/admin/payments/subscriptions/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `subscriptions_export_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        alert('Failed to export subscriptions')
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export subscriptions')
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Payment & Subscription Management</h1>
          <p className="text-muted-foreground">Manage all subscriptions, payments, and billing</p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleExportCSV}>
          <Download size={16} />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="glass-strong border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Users size={20} className="text-green-400" />
              </div>
              <span className="text-muted-foreground text-sm">Active Subscriptions</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.active}</p>
          </CardContent>
        </Card>

        <Card className="glass-strong border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/20 rounded-lg">
                <DollarSign size={20} className="text-primary" />
              </div>
              <span className="text-muted-foreground text-sm">MRR (USD)</span>
            </div>
            <p className="text-2xl font-bold text-foreground">${stats.mrr}</p>
          </CardContent>
        </Card>

        <Card className="glass-strong border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <TrendingUp size={20} className="text-yellow-400" />
              </div>
              <span className="text-muted-foreground text-sm">Past Due</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.past_due}</p>
          </CardContent>
        </Card>

        <Card className="glass-strong border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <XCircle size={20} className="text-red-400" />
              </div>
              <span className="text-muted-foreground text-sm">Canceled</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.canceled}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-strong border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Subscriptions
          </CardTitle>
          <CardDescription>Search and filter all active and past subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                  type="text"
                  placeholder="Search by email, subscription ID, or PayFast token..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <Button type="submit" size="default">Search</Button>
            </form>

            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="canceled">Canceled</option>
                <option value="past_due">Past Due</option>
                <option value="trialing">Trialing</option>
                <option value="pending">Pending</option>
              </select>

              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
              >
                <option value="all">All Plans</option>
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>

          {/* Subscriptions Table */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading subscriptions...</div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No subscriptions found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 text-sm font-medium text-muted-foreground">User</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Plan</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Next Billing</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Started</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b border-border hover:bg-muted/50 transition">
                      <td className="py-4">
                        <div>
                          <div className="text-foreground">{sub.user?.email}</div>
                          {sub.user?.name && (
                            <div className="text-sm text-muted-foreground">{sub.user.name}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-4">
                        <Badge variant={getPlanBadgeVariant(sub.plan)}>
                          {sub.plan}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <Badge variant={getStatusBadgeVariant(sub.status)}>
                          {sub.status}
                        </Badge>
                      </td>
                      <td className="py-4 text-foreground">
                        ${parseFloat(sub.amount.toString()).toFixed(2)} {sub.currency}
                      </td>
                      <td className="py-4 text-muted-foreground text-sm">
                        {formatDate(sub.next_billing_date)}
                      </td>
                      <td className="py-4 text-muted-foreground text-sm">
                        {formatDate(sub.started_at)}
                      </td>
                      <td className="py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSubscriptionId(sub.id)}
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
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} subscriptions
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

      {/* Subscription Detail Modal */}
      {selectedSubscriptionId && (
        <SubscriptionDetailModal
          subscriptionId={selectedSubscriptionId}
          isOpen={!!selectedSubscriptionId}
          onClose={() => setSelectedSubscriptionId(null)}
          onSubscriptionUpdated={fetchSubscriptions}
        />
      )}
    </AdminLayout>
  )
}
