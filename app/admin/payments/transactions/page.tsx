'use client'

import React, { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { TransactionDetailModal } from '@/components/admin/TransactionDetailModal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Download, ChevronLeft, ChevronRight, DollarSign, CheckCircle, XCircle, Receipt } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

interface Transaction {
  id: string
  transaction_id: string
  payfast_payment_id?: string
  status: string
  payment_type: string
  amount_gross: number
  amount_net: number
  currency: string
  email_address: string
  created_at: string
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
  complete_today: number
  failed_today: number
  total_revenue: string
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0
  })
  const [stats, setStats] = useState<Stats>({
    complete_today: 0,
    failed_today: 0,
    total_revenue: '0.00'
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(typeFilter !== 'all' && { type: typeFilter })
      })

      const response = await fetch(`${API_URL}/api/admin/payments/transactions?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions || [])
        setPagination(data.pagination)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [pagination.page, statusFilter, typeFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchTransactions()
  }

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'complete': return 'default'
      case 'failed': return 'destructive'
      case 'pending': return 'secondary'
      case 'cancelled': return 'outline'
      default: return 'outline'
    }
  }

  const getTypeBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'subscription': return 'default'
      case 'subscription_payment': return 'default'
      case 'refund': return 'destructive'
      default: return 'outline'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Payment Transactions</h1>
        <p className="text-muted-foreground">View all payment transactions and ITN logs</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="glass-strong border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle size={20} className="text-green-400" />
              </div>
              <span className="text-muted-foreground text-sm">Completed Today</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.complete_today}</p>
          </CardContent>
        </Card>

        <Card className="glass-strong border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <XCircle size={20} className="text-red-400" />
              </div>
              <span className="text-muted-foreground text-sm">Failed Today</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.failed_today}</p>
          </CardContent>
        </Card>

        <Card className="glass-strong border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/20 rounded-lg">
                <DollarSign size={20} className="text-primary" />
              </div>
              <span className="text-muted-foreground text-sm">Total Revenue (USD)</span>
            </div>
            <p className="text-2xl font-bold text-foreground">${stats.total_revenue}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-strong border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Transactions
          </CardTitle>
          <CardDescription>View all payment transactions and PayFast ITN logs</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                  type="text"
                  placeholder="Search by transaction ID, email, or PayFast ID..."
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
                <option value="complete">Complete</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
              >
                <option value="all">All Types</option>
                <option value="subscription">Subscription</option>
                <option value="subscription_payment">Subscription Payment</option>
                <option value="one_time">One-Time</option>
                <option value="refund">Refund</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No transactions found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Transaction ID</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">User</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-border hover:bg-muted/50 transition">
                      <td className="py-4 text-sm text-foreground">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 text-sm text-foreground font-mono">
                        {transaction.transaction_id.substring(0, 16)}...
                      </td>
                      <td className="py-4 text-foreground">{transaction.email_address}</td>
                      <td className="py-4">
                        <Badge variant={getTypeBadgeVariant(transaction.payment_type)}>
                          {transaction.payment_type.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-4 text-foreground">
                        ${parseFloat(transaction.amount_net.toString()).toFixed(2)} {transaction.currency}
                      </td>
                      <td className="py-4">
                        <Badge variant={getStatusBadgeVariant(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTransactionId(transaction.id)}
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
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} transactions
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

      {/* Transaction Detail Modal */}
      {selectedTransactionId && (
        <TransactionDetailModal
          transactionId={selectedTransactionId}
          isOpen={!!selectedTransactionId}
          onClose={() => setSelectedTransactionId(null)}
          onTransactionUpdated={fetchTransactions}
        />
      )}
    </AdminLayout>
  )
}
