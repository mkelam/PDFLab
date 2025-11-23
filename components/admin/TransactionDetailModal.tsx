'use client'

import React, { useState, useEffect } from 'react'
import { X, DollarSign, AlertCircle, RefreshCw } from 'lucide-react'
import { AdminButton } from './AdminButton'
import { AdminBadge } from './AdminBadge'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

interface TransactionDetailModalProps {
  transactionId: string
  isOpen: boolean
  onClose: () => void
  onTransactionUpdated: () => void
}

interface TransactionDetail {
  id: string
  transaction_id: string
  payfast_payment_id?: string
  payment_type: string
  status: string
  amount_gross: number
  amount_fee: number
  amount_net: number
  currency: string
  plan: string
  payment_method?: string
  name_first: string
  name_last?: string
  email_address: string
  item_name: string
  item_description?: string
  custom_data?: any
  itn_data?: any
  error_message?: string
  processed_at?: string
  created_at: string
  user?: {
    id: string
    email: string
    name?: string
    plan: string
  }
  subscription?: {
    id: string
    plan: string
    status: string
    amount: number
  }
}

export function TransactionDetailModal({
  transactionId,
  isOpen,
  onClose,
  onTransactionUpdated
}: TransactionDetailModalProps) {
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showRefundForm, setShowRefundForm] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')

  useEffect(() => {
    if (isOpen && transactionId) {
      fetchTransactionDetails()
    }
  }, [isOpen, transactionId])

  const fetchTransactionDetails = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/payments/transactions/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTransaction(data.transaction)
        setRefundAmount(data.transaction.amount_gross.toString())
      }
    } catch (error) {
      console.error('Failed to fetch transaction details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefund = async () => {
    if (!transaction) return

    if (!refundReason.trim()) {
      alert('Please provide a refund reason')
      return
    }

    const amount = parseFloat(refundAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid refund amount')
      return
    }

    const maxAmount = parseFloat(transaction.amount_gross.toString())
    if (amount > maxAmount) {
      alert(`Refund amount cannot exceed original amount of $${maxAmount.toFixed(2)}`)
      return
    }

    const refundType = amount === maxAmount ? 'full' : 'partial'
    if (!confirm(`Process ${refundType} refund of $${amount.toFixed(2)}?\n\nReason: ${refundReason}\n\nThis action cannot be undone.`)) {
      return
    }

    try {
      setActionLoading(true)
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/payments/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transaction_id: transactionId,
          amount,
          reason: refundReason
        })
      })

      if (response.ok) {
        alert('Refund processed successfully')
        setShowRefundForm(false)
        setRefundAmount('')
        setRefundReason('')
        fetchTransactionDetails()
        onTransactionUpdated()
      } else {
        const errorData = await response.json()
        alert(errorData.message || 'Failed to process refund')
      }
    } catch (error) {
      console.error('Refund error:', error)
      alert('Failed to process refund')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRetryPayment = async () => {
    if (!transaction) return

    if (!confirm('Retry this failed payment? This will mark it for manual processing.')) return

    try {
      setActionLoading(true)
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/payments/retry-failed`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transaction_id: transactionId
        })
      })

      if (response.ok) {
        alert('Payment marked for retry')
        fetchTransactionDetails()
        onTransactionUpdated()
      } else {
        const errorData = await response.json()
        alert(errorData.message || 'Failed to retry payment')
      }
    } catch (error) {
      console.error('Retry payment error:', error)
      alert('Failed to retry payment')
    } finally {
      setActionLoading(false)
    }
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[oklch(0.18_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[oklch(0.25_0.01_250)]">
          <h2 className="text-2xl font-bold text-white">Transaction Details</h2>
          <button
            onClick={onClose}
            className="text-[oklch(0.60_0.01_250)] hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-[oklch(0.60_0.01_250)]">
              Loading transaction details...
            </div>
          ) : !transaction ? (
            <div className="text-center py-12 text-[oklch(0.60_0.01_250)]">
              Transaction not found
            </div>
          ) : (
            <div className="space-y-6">
              {/* Transaction Info */}
              <div className="bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Transaction Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Transaction ID</div>
                    <div className="text-white font-mono text-sm">{transaction.transaction_id}</div>
                  </div>

                  {transaction.payfast_payment_id && (
                    <div>
                      <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">PayFast Payment ID</div>
                      <div className="text-white font-mono text-sm">{transaction.payfast_payment_id}</div>
                    </div>
                  )}

                  <div>
                    <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Payment Type</div>
                    <div className="text-white">{transaction.payment_type.replace('_', ' ')}</div>
                  </div>

                  <div>
                    <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Status</div>
                    <AdminBadge variant={getStatusBadgeVariant(transaction.status)}>
                      {transaction.status}
                    </AdminBadge>
                  </div>

                  <div>
                    <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Gross Amount</div>
                    <div className="text-white">${parseFloat(transaction.amount_gross.toString()).toFixed(2)} {transaction.currency}</div>
                  </div>

                  <div>
                    <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Processing Fee</div>
                    <div className="text-white">${parseFloat(transaction.amount_fee.toString()).toFixed(2)} {transaction.currency}</div>
                  </div>

                  <div>
                    <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Net Amount</div>
                    <div className="text-white font-semibold">${parseFloat(transaction.amount_net.toString()).toFixed(2)} {transaction.currency}</div>
                  </div>

                  <div>
                    <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Plan</div>
                    <div className="text-white">{transaction.plan}</div>
                  </div>

                  {transaction.payment_method && (
                    <div>
                      <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Payment Method</div>
                      <div className="text-white">{transaction.payment_method}</div>
                    </div>
                  )}

                  <div>
                    <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Created</div>
                    <div className="text-white">{formatDate(transaction.created_at)}</div>
                  </div>

                  {transaction.processed_at && (
                    <div>
                      <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Processed</div>
                      <div className="text-white">{formatDate(transaction.processed_at)}</div>
                    </div>
                  )}
                </div>

                {transaction.error_message && (
                  <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-red-400 mb-1">Error Message</div>
                        <div className="text-sm text-white">{transaction.error_message}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Info */}
              <div className="bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Name</div>
                    <div className="text-white">{transaction.name_first} {transaction.name_last || ''}</div>
                  </div>

                  <div>
                    <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Email</div>
                    <div className="text-white">{transaction.email_address}</div>
                  </div>

                  <div className="col-span-2">
                    <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Item Name</div>
                    <div className="text-white">{transaction.item_name}</div>
                  </div>

                  {transaction.item_description && (
                    <div className="col-span-2">
                      <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Item Description</div>
                      <div className="text-white">{transaction.item_description}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* ITN Data */}
              {transaction.itn_data && (
                <div className="bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">ITN Webhook Data</h3>
                  <pre className="bg-[oklch(0.12_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded p-4 overflow-x-auto">
                    <code className="text-sm text-[oklch(0.90_0.01_250)]">
                      {JSON.stringify(transaction.itn_data, null, 2)}
                    </code>
                  </pre>
                </div>
              )}

              {/* Refund Form */}
              {showRefundForm && transaction.status === 'complete' && (
                <div className="bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Process Refund</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-[oklch(0.60_0.01_250)] mb-2">
                        Refund Amount (USD)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={parseFloat(transaction.amount_gross.toString())}
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        className="w-full px-4 py-2 bg-[oklch(0.12_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg text-white focus:outline-none focus:border-[oklch(0.65_0.20_270)]"
                      />
                      <div className="text-sm text-[oklch(0.60_0.01_250)] mt-1">
                        Max: ${parseFloat(transaction.amount_gross.toString()).toFixed(2)}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-[oklch(0.60_0.01_250)] mb-2">
                        Refund Reason (Required)
                      </label>
                      <textarea
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 bg-[oklch(0.12_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg text-white focus:outline-none focus:border-[oklch(0.65_0.20_270)]"
                        placeholder="Enter reason for refund..."
                      />
                    </div>

                    <div className="flex gap-3">
                      <AdminButton
                        variant="danger"
                        onClick={handleRefund}
                        disabled={actionLoading}
                      >
                        <DollarSign size={16} />
                        Process Refund
                      </AdminButton>
                      <AdminButton
                        variant="secondary"
                        onClick={() => {
                          setShowRefundForm(false)
                          setRefundReason('')
                          setRefundAmount(transaction.amount_gross.toString())
                        }}
                        disabled={actionLoading}
                      >
                        Cancel
                      </AdminButton>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              {!showRefundForm && (
                <div className="bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Admin Actions</h3>
                  <div className="flex flex-wrap gap-3">
                    {transaction.status === 'complete' && (
                      <AdminButton
                        variant="danger"
                        size="sm"
                        onClick={() => setShowRefundForm(true)}
                        disabled={actionLoading}
                      >
                        <DollarSign size={16} />
                        Refund Payment
                      </AdminButton>
                    )}

                    {transaction.status === 'failed' && (
                      <AdminButton
                        variant="secondary"
                        size="sm"
                        onClick={handleRetryPayment}
                        disabled={actionLoading}
                      >
                        <RefreshCw size={16} />
                        Retry Payment
                      </AdminButton>
                    )}

                    {transaction.status !== 'complete' && transaction.status !== 'failed' && (
                      <div className="text-[oklch(0.60_0.01_250)] text-sm">
                        No actions available for {transaction.status} transactions.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[oklch(0.25_0.01_250)]">
          <AdminButton variant="secondary" onClick={onClose}>
            Close
          </AdminButton>
        </div>
      </div>
    </div>
  )
}
