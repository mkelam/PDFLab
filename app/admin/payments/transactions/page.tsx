'use client'

import React, { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminCard } from '@/components/admin/AdminCard'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { AdminButton } from '@/components/admin/AdminButton'
import { AdminEmptyState } from '@/components/admin/AdminEmptyState'
import { TransactionDetailModal } from '@/components/admin/TransactionDetailModal'
import { Search, Download, ChevronLeft, ChevronRight, DollarSign, CheckCircle, XCircle } from 'lucide-react'

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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'complete': return 'success'
      case 'failed': return 'error'
      case 'pending': return 'warning'
      case 'cancelled': return 'default'
      default: return 'default'
    }
  }

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'subscription': return 'info'
      case 'subscription_payment': return 'success'
      case 'refund': return 'error'
      default: return 'default'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Payment Transactions"
        description="View all payment transactions and ITN logs"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[oklch(0.18_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle size={20} className="text-green-400" />
            </div>
            <span className="text-[oklch(0.60_0.01_250)] text-sm">Completed Today</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.complete_today}</p>
        </div>

        <div className="bg-[oklch(0.18_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <XCircle size={20} className="text-red-400" />
            </div>
            <span className="text-[oklch(0.60_0.01_250)] text-sm">Failed Today</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.failed_today}</p>
        </div>

        <div className="bg-[oklch(0.18_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[oklch(0.65_0.20_270)]/20 rounded-lg">
              <DollarSign size={20} className="text-[oklch(0.65_0.20_270)]" />
            </div>
            <span className="text-[oklch(0.60_0.01_250)] text-sm">Total Revenue (USD)</span>
          </div>
          <p className="text-2xl font-bold text-white">${stats.total_revenue}</p>
        </div>
      </div>

      <AdminCard>
        {/* Search and Filters */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[oklch(0.60_0.01_250)]" size={20} />
              <input
                type="text"
                placeholder="Search by transaction ID, email, or PayFast ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg text-white placeholder-[oklch(0.60_0.01_250)] focus:outline-none focus:border-[oklch(0.65_0.20_270)]"
              />
            </div>
            <AdminButton type="submit" size="md">Search</AdminButton>
          </form>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg text-white focus:outline-none focus:border-[oklch(0.65_0.20_270)]"
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
              className="px-4 py-2 bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg text-white focus:outline-none focus:border-[oklch(0.65_0.20_270)]"
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
          <div className="text-center py-12 text-[oklch(0.60_0.01_250)]">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <AdminEmptyState
            title="No transactions found"
            description="Try adjusting your search or filters"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[oklch(0.25_0.01_250)] text-left">
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Date</th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Transaction ID</th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">User</th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Type</th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Amount</th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Status</th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-[oklch(0.25_0.01_250)] hover:bg-[oklch(0.20_0.01_250)] transition">
                      <td className="py-4 text-sm text-[oklch(0.90_0.01_250)]">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 text-sm text-[oklch(0.90_0.01_250)] font-mono">
                        {transaction.transaction_id.substring(0, 16)}...
                      </td>
                      <td className="py-4 text-white">{transaction.email_address}</td>
                      <td className="py-4">
                        <AdminBadge variant={getTypeBadgeVariant(transaction.payment_type)} size="sm">
                          {transaction.payment_type.replace('_', ' ')}
                        </AdminBadge>
                      </td>
                      <td className="py-4 text-[oklch(0.90_0.01_250)]">
                        ${parseFloat(transaction.amount_net.toString()).toFixed(2)} {transaction.currency}
                      </td>
                      <td className="py-4">
                        <AdminBadge variant={getStatusBadgeVariant(transaction.status)}>
                          {transaction.status}
                        </AdminBadge>
                      </td>
                      <td className="py-4">
                        <AdminButton
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTransactionId(transaction.id)}
                        >
                          View Details
                        </AdminButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-[oklch(0.60_0.01_250)]">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} transactions
              </div>
              <div className="flex items-center gap-2">
                <AdminButton
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  <ChevronLeft size={16} />
                  Previous
                </AdminButton>
                <span className="text-sm text-white px-4">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <AdminButton
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                  <ChevronRight size={16} />
                </AdminButton>
              </div>
            </div>
          </>
        )}
      </AdminCard>

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
