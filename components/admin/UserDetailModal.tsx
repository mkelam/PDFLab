'use client'

import React, { useState, useEffect } from 'react'
import { X, User, CreditCard, FileText, Activity, Save, RefreshCw, Trash2, Key, UserCog, Mail, CheckCircle, Circle } from 'lucide-react'
import { AdminButton } from './AdminButton'
import { AdminBadge } from './AdminBadge'
import { UserConversionsTab } from './UserConversionsTab'
import { UserActivityTab } from './UserActivityTab'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

interface UserDetail {
  id: string
  email: string
  name?: string
  role: string
  plan: string
  conversions_used: number
  conversions_limit: number
  subscription_status?: string
  subscription_end_date?: string
  email_verified: boolean
  email_verified_at?: string
  created_at: string
  last_login?: string
}

interface UserDetailModalProps {
  userId: string
  isOpen: boolean
  onClose: () => void
  onUserUpdated: () => void
}

type TabType = 'profile' | 'subscriptions' | 'conversions' | 'activity'

export function UserDetailModal({ userId, isOpen, onClose, onUserUpdated }: UserDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string>('user')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [verifying, setVerifying] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    plan: '',
    role: ''
  })

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails()
      fetchCurrentUserRole()
    }
  }, [isOpen, userId])

  const fetchCurrentUserRole = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentUserRole(data.user.role)
      }
    } catch (err) {
      console.error('Failed to fetch current user role:', err)
    }
  }

  const fetchUserDetails = async () => {
    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem('authToken')

      const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setFormData({
          name: data.user.name || '',
          email: data.user.email,
          plan: data.user.plan,
          role: data.user.role
        })
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to fetch user details')
      }
    } catch (err) {
      console.error('Failed to fetch user:', err)
      setError('Failed to load user details')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      const token = localStorage.getItem('authToken')

      const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await fetchUserDetails()
        setIsEditing(false)
        onUserUpdated()
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to update user')
      }
    } catch (err) {
      console.error('Failed to update user:', err)
      setError('Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const handleResetQuota = async () => {
    if (!confirm('Reset this user\'s conversion quota to 0?')) return

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/quota`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        await fetchUserDetails()
        onUserUpdated()
      } else {
        const errorData = await response.json()
        alert(errorData.message || 'Failed to reset quota')
      }
    } catch (err) {
      console.error('Failed to reset quota:', err)
      alert('Failed to reset quota')
    }
  }

  const handleResetPassword = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Copy reset link to clipboard
        navigator.clipboard.writeText(data.resetLink)
        alert('Password reset link copied to clipboard!')
      } else {
        const errorData = await response.json()
        alert(errorData.message || 'Failed to generate reset link')
      }
    } catch (err) {
      console.error('Failed to reset password:', err)
      alert('Failed to generate reset link')
    }
  }

  const handleImpersonate = async () => {
    if (!confirm(`Impersonate ${user?.email}? You will be logged in as this user for 30 minutes.`)) return

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/impersonate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Store the impersonation token and original token
        localStorage.setItem('originalAuthToken', localStorage.getItem('authToken') || '')
        localStorage.setItem('authToken', data.token)
        localStorage.setItem('impersonating', 'true')
        localStorage.setItem('impersonatedUserEmail', user?.email || '')

        // Redirect to main app
        window.location.href = '/'
      } else {
        const errorData = await response.json()
        alert(errorData.message || 'Failed to impersonate user')
      }
    } catch (err) {
      console.error('Failed to impersonate user:', err)
      alert('Failed to impersonate user')
    }
  }

  const handleDeleteUser = async () => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        onUserUpdated()
        onClose()
      } else {
        const errorData = await response.json()
        alert(errorData.message || 'Failed to delete user')
      }
    } catch (err) {
      console.error('Failed to delete user:', err)
      alert('Failed to delete user')
    }
  }

  const handleSendVerificationEmail = async () => {
    if (!confirm(`Send verification email to ${user?.email}?`)) return

    try {
      setSendingEmail(true)
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/resend-verification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message || 'Verification email sent successfully!')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to send verification email')
      }
    } catch (err) {
      console.error('Failed to send verification email:', err)
      alert('Failed to send verification email')
    } finally {
      setSendingEmail(false)
    }
  }

  const handleVerifyEmail = async () => {
    if (!confirm(`Manually verify email for ${user?.email}? This will mark their email as verified immediately.`)) return

    try {
      setVerifying(true)
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/verify-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message || 'Email verified successfully!')
        await fetchUserDetails()
        onUserUpdated()
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to verify email')
      }
    } catch (err) {
      console.error('Failed to verify email:', err)
      alert('Failed to verify email')
    } finally {
      setVerifying(false)
    }
  }

  if (!isOpen) return null

  const tabs = [
    { id: 'profile' as TabType, label: 'Profile', icon: User },
    { id: 'subscriptions' as TabType, label: 'Subscriptions', icon: CreditCard },
    { id: 'conversions' as TabType, label: 'Conversions', icon: FileText },
    { id: 'activity' as TabType, label: 'Activity', icon: Activity }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[oklch(0.25_0.01_250)]">
          <div>
            <h2 className="text-2xl font-bold text-white">User Details</h2>
            {user && (
              <p className="text-sm text-[oklch(0.60_0.01_250)] mt-1">{user.email}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-[oklch(0.60_0.01_250)] hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[oklch(0.25_0.01_250)] px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-[oklch(0.65_0.20_270)] text-white'
                    : 'border-transparent text-[oklch(0.60_0.01_250)] hover:text-white'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-[oklch(0.60_0.01_250)]">
              Loading user details...
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-400">
              {error}
            </div>
          ) : user ? (
            <>
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  {/* Error Message */}
                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
                      {error}
                    </div>
                  )}

                  {/* Profile Info */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[oklch(0.60_0.01_250)] mb-2">
                        Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-2 bg-[oklch(0.20_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg text-white focus:outline-none focus:border-[oklch(0.65_0.20_270)]"
                        />
                      ) : (
                        <p className="text-white">{user.name || '-'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[oklch(0.60_0.01_250)] mb-2">
                        Email
                      </label>
                      {isEditing ? (
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-2 bg-[oklch(0.20_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg text-white focus:outline-none focus:border-[oklch(0.65_0.20_270)]"
                        />
                      ) : (
                        <p className="text-white">{user.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[oklch(0.60_0.01_250)] mb-2">
                        Plan
                      </label>
                      {isEditing ? (
                        <select
                          value={formData.plan}
                          onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                          className="w-full px-4 py-2 bg-[oklch(0.20_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg text-white focus:outline-none focus:border-[oklch(0.65_0.20_270)]"
                        >
                          <option value="free">Free</option>
                          <option value="starter">Starter</option>
                          <option value="pro">Pro</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                      ) : (
                        <AdminBadge variant={
                          user.plan === 'enterprise' ? 'success' :
                          user.plan === 'pro' ? 'info' :
                          user.plan === 'starter' ? 'warning' : 'default'
                        }>
                          {user.plan}
                        </AdminBadge>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[oklch(0.60_0.01_250)] mb-2">
                        Role
                      </label>
                      {isEditing ? (
                        <select
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          className="w-full px-4 py-2 bg-[oklch(0.20_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg text-white focus:outline-none focus:border-[oklch(0.65_0.20_270)]"
                        >
                          <option value="user">User</option>
                          <option value="support">Support</option>
                          <option value="finance">Finance</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      ) : (
                        <AdminBadge variant={
                          user.role === 'super_admin' ? 'error' :
                          user.role === 'admin' ? 'warning' :
                          user.role === 'finance' || user.role === 'support' ? 'info' : 'default'
                        }>
                          {user.role.replace('_', ' ')}
                        </AdminBadge>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[oklch(0.60_0.01_250)] mb-2">
                        Conversions Used
                      </label>
                      <p className="text-white">
                        {user.conversions_used} / {user.conversions_limit === -1 ? '∞' : user.conversions_limit}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[oklch(0.60_0.01_250)] mb-2">
                        Last Login
                      </label>
                      <p className="text-white">
                        {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[oklch(0.60_0.01_250)] mb-2">
                        Member Since
                      </label>
                      <p className="text-white">
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[oklch(0.60_0.01_250)] mb-2">
                        Email Verification
                      </label>
                      <div className="flex items-center gap-2">
                        {user.email_verified ? (
                          <>
                            <CheckCircle size={18} className="text-green-400" />
                            <span className="text-green-400">
                              Verified
                            </span>
                            {user.email_verified_at && (
                              <span className="text-[oklch(0.60_0.01_250)] text-sm ml-2">
                                ({new Date(user.email_verified_at).toLocaleDateString()})
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <Circle size={18} className="text-yellow-400" />
                            <span className="text-yellow-400">
                              Not Verified
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-6 border-t border-[oklch(0.25_0.01_250)]">
                    {isEditing ? (
                      <>
                        <AdminButton
                          onClick={handleSave}
                          disabled={saving}
                        >
                          <Save size={16} />
                          {saving ? 'Saving...' : 'Save Changes'}
                        </AdminButton>
                        <AdminButton
                          variant="secondary"
                          onClick={() => {
                            setIsEditing(false)
                            setFormData({
                              name: user.name || '',
                              email: user.email,
                              plan: user.plan,
                              role: user.role
                            })
                            setError('')
                          }}
                        >
                          Cancel
                        </AdminButton>
                      </>
                    ) : (
                      <>
                        <AdminButton onClick={() => setIsEditing(true)}>
                          Edit Profile
                        </AdminButton>
                        {!user.email_verified && (
                          <>
                            <AdminButton
                              variant="secondary"
                              onClick={handleSendVerificationEmail}
                              disabled={sendingEmail}
                            >
                              <Mail size={16} />
                              {sendingEmail ? 'Sending...' : 'Send Verification Email'}
                            </AdminButton>
                            <AdminButton
                              variant="success"
                              onClick={handleVerifyEmail}
                              disabled={verifying}
                            >
                              <CheckCircle size={16} />
                              {verifying ? 'Verifying...' : 'Verify Email'}
                            </AdminButton>
                          </>
                        )}
                        <AdminButton
                          variant="secondary"
                          onClick={handleResetPassword}
                        >
                          <Key size={16} />
                          Reset Password
                        </AdminButton>
                        <AdminButton
                          variant="secondary"
                          onClick={handleResetQuota}
                        >
                          <RefreshCw size={16} />
                          Reset Quota
                        </AdminButton>
                        {currentUserRole === 'super_admin' && (
                          <AdminButton
                            variant="secondary"
                            onClick={handleImpersonate}
                          >
                            <UserCog size={16} />
                            Impersonate
                          </AdminButton>
                        )}
                        <AdminButton
                          variant="danger"
                          onClick={handleDeleteUser}
                        >
                          <Trash2 size={16} />
                          Delete User
                        </AdminButton>
                      </>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'subscriptions' && (
                <div className="text-center py-12 text-[oklch(0.60_0.01_250)]">
                  <CreditCard size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Subscription history coming soon...</p>
                </div>
              )}

              {activeTab === 'conversions' && (
                <UserConversionsTab userId={userId} />
              )}

              {activeTab === 'activity' && (
                <UserActivityTab userId={userId} />
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
