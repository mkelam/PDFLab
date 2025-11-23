'use client'

import React, { useState, useEffect } from 'react'
import { X, Calendar, DollarSign, CreditCard, AlertTriangle, RefreshCw, XCircle, Play, Pause } from 'lucide-react'
import { AdminButton } from './AdminButton'
import { AdminBadge } from './AdminBadge'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

interface SubscriptionDetailModalProps {
  subscriptionId: string
  isOpen: boolean
  onClose: () => void
  onSubscriptionUpdated: () => void
}

interface SubscriptionDetail {
  id: string
  user_id: string
  plan: string
  status: string
  amount: number
  currency: string
  billing_date?: string
  next_billing_date?: string
  cancel_at?: string
  canceled_at?: string
  started_at: string
  ended_at?: string
  payfast_token?: string
  payfast_subscription_id?: string
  user?: {
    id: string
    email: string
    name?: string
    plan: string
    conversions_used: number
    conversions_limit: number
  }
}

interface PaymentHistory {
  id: string
  transaction_id: string
  payfast_payment_id?: string
  status: string
  amount_gross: number
  amount_net: number
  currency: string
  payment_type: string
  created_at: string
}

export function SubscriptionDetailModal({
  subscriptionId,
  isOpen,
  onClose,
  onSubscriptionUpdated
}: SubscriptionDetailModalProps) {
  const [subscription, setSubscription] = useState<SubscriptionDetail | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (isOpen && subscriptionId) {
      fetchSubscriptionDetails()
    }
  }, [isOpen, subscriptionId])

  const fetchSubscriptionDetails = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/payments/subscriptions/${subscriptionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSubscription(data.subscription)
        setPaymentHistory(data.paymentHistory || [])
      }
    } catch (error) {
      console.error('Failed to fetch subscription details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!subscription) return

    const immediately = confirm(
      'Cancel immediately?\n\n' +
      'Click OK to cancel immediately (user loses access now)\n' +
      'Click Cancel to schedule cancellation at end of billing cycle'
    )

    if (!confirm(`Are you sure you want to cancel this subscription${immediately ? ' immediately' : ' at end of cycle'}?`)) {
      return
    }

    try {
      setActionLoading(true)
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/payments/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ immediately })
      })

      if (response.ok) {
        alert('Subscription canceled successfully')
        fetchSubscriptionDetails()
        onSubscriptionUpdated()
      } else {
        const errorData = await response.json()
        alert(errorData.message || 'Failed to cancel subscription')
      }
    } catch (error) {
      console.error('Cancel subscription error:', error)
      alert('Failed to cancel subscription')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePauseSubscription = async () => {
    if (!confirm('Pause this subscription? Billing will be paused until resumed.')) return

    try {
      setActionLoading(true)
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/payments/subscriptions/${subscriptionId}/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        alert('Subscription paused successfully')
        fetchSubscriptionDetails()
        onSubscriptionUpdated()
      } else {
        const errorData = await response.json()
        alert(errorData.message || 'Failed to pause subscription')
      }
    } catch (error) {
      console.error('Pause subscription error:', error)
      alert('Failed to pause subscription')
    } finally {
      setActionLoading(false)
    }
  }

  const handleResumeSubscription = async () => {
    if (!confirm('Resume this subscription? Billing will restart.')) return

    try {
      setActionLoading(true)
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/payments/subscriptions/${subscriptionId}/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        alert('Subscription resumed successfully')
        fetchSubscriptionDetails()
        onSubscriptionUpdated()
      } else {
        const errorData = await response.json()
        alert(errorData.message || 'Failed to resume subscription')
      }
    } catch (error) {
      console.error('Resume subscription error:', error)
      alert('Failed to resume subscription')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success'
      case 'canceled': return 'error'
      case 'past_due': return 'warning'
      case 'complete': return 'success'
      case 'failed': return 'error'
      case 'pending': return 'warning'
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
          <h2 className="text-2xl font-bold text-white">Subscription Details</h2>
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
              Loading subscription details...
            </div>
          ) : !subscription ? (
            <div className="text-center py-12 text-[oklch(0.60_0.01_250)]">
              Subscription not found
            </div>
          ) : (
            <div className="space-y-6">
              {/* Subscription Info */}
              <div className="bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Subscription Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">User</div>
                    <div className="text-white">{subscription.user?.email}</div>
                    {subscription.user?.name && (
                      <div className="text-sm text-[oklch(0.60_0.01_250)]">{subscription.user.name}</div>
                    )}
                  </div>

                  <div>
                    <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Plan</div>
                    <AdminBadge variant={getStatusBadgeVariant(subscription.plan)}>
                      {subscription.plan}
                    </AdminBadge>
                  </div>

                  <div>
                    <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Status</div>
                    <AdminBadge variant={getStatusBadgeVariant(subscription.status)}>
                      {subscription.status}
                    </AdminBadge>
                  </div>

                  <div>
                    <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Amount</div>
                    <div className="text-white">${parseFloat(subscription.amount.toString()).toFixed(2)} {subscription.currency}/month</div>
                  </div>

                  <div>
                    <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Next Billing Date</div>
                    <div className="text-white">{formatDate(subscription.next_billing_date)}</div>
                  </div>

                  <div>
                    <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Started</div>
                    <div className="text-white">{formatDate(subscription.started_at)}</div>
                  </div>

                  {subscription.canceled_at && (
                    <div>
                      <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Canceled At</div>
                      <div className="text-white">{formatDate(subscription.canceled_at)}</div>
                    </div>
                  )}

                  {subscription.ended_at && (
                    <div>
                      <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Ended At</div>
                      <div className="text-white">{formatDate(subscription.ended_at)}</div>
                    </div>
                  )}

                  {subscription.payfast_token && (
                    <div className="col-span-2">
                      <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">PayFast Token</div>
                      <div className="text-white font-mono text-sm">{subscription.payfast_token}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* User Usage Info */}
              {subscription.user && (
                <div className="bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">User Usage</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Current Plan</div>
                      <div className="text-white">{subscription.user.plan}</div>
                    </div>
                    <div>
                      <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Conversions Used</div>
                      <div className="text-white">
                        {subscription.user.conversions_used} / {subscription.user.conversions_limit === -1 ? '∞' : subscription.user.conversions_limit}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment History */}
              <div className="bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Payment History</h3>
                {paymentHistory.length === 0 ? (
                  <div className="text-center py-6 text-[oklch(0.60_0.01_250)]">
                    No payment history available
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[oklch(0.25_0.01_250)] text-left">
                          <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Date</th>
                          <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Transaction ID</th>
                          <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Type</th>
                          <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Amount</th>
                          <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentHistory.map((payment) => (
                          <tr key={payment.id} className="border-b border-[oklch(0.25_0.01_250)]">
                            <td className="py-3 text-sm text-[oklch(0.90_0.01_250)]">
                              {new Date(payment.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 text-sm text-[oklch(0.90_0.01_250)] font-mono">
                              {payment.transaction_id.substring(0, 16)}...
                            </td>
                            <td className="py-3 text-sm text-[oklch(0.90_0.01_250)]">
                              {payment.payment_type.replace('_', ' ')}
                            </td>
                            <td className="py-3 text-sm text-[oklch(0.90_0.01_250)]">
                              ${parseFloat(payment.amount_net.toString()).toFixed(2)} {payment.currency}
                            </td>
                            <td className="py-3">
                              <AdminBadge variant={getStatusBadgeVariant(payment.status)}>
                                {payment.status}
                              </AdminBadge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Admin Actions</h3>
                <div className="flex flex-wrap gap-3">
                  {subscription.status === 'active' && (
                    <>
                      <AdminButton
                        variant="secondary"
                        size="sm"
                        onClick={handlePauseSubscription}
                        disabled={actionLoading}
                      >
                        <Pause size={16} />
                        Pause Subscription
                      </AdminButton>
                      <AdminButton
                        variant="danger"
                        size="sm"
                        onClick={handleCancelSubscription}
                        disabled={actionLoading}
                      >
                        <XCircle size={16} />
                        Cancel Subscription
                      </AdminButton>
                    </>
                  )}

                  {subscription.status === 'pending' && (
                    <>
                      <AdminButton
                        variant="primary"
                        size="sm"
                        onClick={handleResumeSubscription}
                        disabled={actionLoading}
                      >
                        <Play size={16} />
                        Resume Subscription
                      </AdminButton>
                      <AdminButton
                        variant="danger"
                        size="sm"
                        onClick={handleCancelSubscription}
                        disabled={actionLoading}
                      >
                        <XCircle size={16} />
                        Cancel Subscription
                      </AdminButton>
                    </>
                  )}

                  {subscription.status === 'past_due' && (
                    <div className="flex items-center gap-2 text-yellow-400">
                      <AlertTriangle size={16} />
                      <span className="text-sm">Payment past due - contact user or cancel subscription</span>
                    </div>
                  )}

                  {subscription.status === 'canceled' && (
                    <div className="text-[oklch(0.60_0.01_250)] text-sm">
                      This subscription has been canceled.
                    </div>
                  )}
                </div>
              </div>
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
