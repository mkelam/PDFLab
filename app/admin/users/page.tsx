'use client'

import React, { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminCard } from '@/components/admin/AdminCard'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { AdminButton } from '@/components/admin/AdminButton'
import { AdminEmptyState } from '@/components/admin/AdminEmptyState'
import { UserDetailModal } from '@/components/admin/UserDetailModal'
import { Search, Download, UserPlus, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

interface User {
  id: string
  email: string
  name?: string
  role: string
  plan: string
  conversions_used: number
  conversions_limit: number
  created_at: string
  last_login?: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(planFilter !== 'all' && { plan: planFilter }),
        ...(roleFilter !== 'all' && { role: roleFilter })
      })

      const response = await fetch(`${API_URL}/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [pagination.page, planFilter, roleFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchUsers()
  }

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'success'
      case 'pro': return 'info'
      case 'starter': return 'warning'
      default: return 'default'
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'error'
      case 'admin': return 'warning'
      case 'finance': return 'info'
      case 'support': return 'info'
      default: return 'default'
    }
  }

  const handleSelectAll = () => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set())
    } else {
      setSelectedUserIds(new Set(users.map(u => u.id)))
    }
  }

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUserIds)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUserIds(newSelected)
  }

  const handleBulkQuotaReset = async () => {
    const userIds = Array.from(selectedUserIds)
    if (!confirm(`Reset quota for ${userIds.length} selected users?`)) return

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/users/bulk-quota-reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userIds })
      })

      if (response.ok) {
        alert(`Successfully reset quota for ${userIds.length} users`)
        setSelectedUserIds(new Set())
        fetchUsers()
      } else {
        const errorData = await response.json()
        alert(errorData.message || 'Failed to reset quotas')
      }
    } catch (error) {
      console.error('Bulk quota reset error:', error)
      alert('Failed to reset quotas')
    }
  }

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(planFilter !== 'all' && { plan: planFilter }),
        ...(roleFilter !== 'all' && { role: roleFilter })
      })

      const response = await fetch(`${API_URL}/api/admin/users/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        alert('Failed to export users')
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export users')
    }
  }

  return (
    <AdminLayout>
      <AdminPageHeader
        title="User Management"
        description="Manage all users, subscriptions, and permissions"
        actions={
          <>
            <AdminButton variant="secondary" size="sm" onClick={handleExportCSV}>
              <Download size={16} />
              Export CSV
            </AdminButton>
            {selectedUserIds.size > 0 && (
              <AdminButton variant="secondary" size="sm" onClick={handleBulkQuotaReset}>
                <RefreshCw size={16} />
                Reset Quota ({selectedUserIds.size})
              </AdminButton>
            )}
          </>
        }
      />

      <AdminCard>
        {/* Search and Filters */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[oklch(0.60_0.01_250)]" size={20} />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg text-white placeholder-[oklch(0.60_0.01_250)] focus:outline-none focus:border-[oklch(0.65_0.20_270)]"
              />
            </div>
            <AdminButton type="submit" size="md">Search</AdminButton>
          </form>

          <div className="flex gap-2">
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="px-4 py-2 bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg text-white focus:outline-none focus:border-[oklch(0.65_0.20_270)]"
            >
              <option value="all">All Plans</option>
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg text-white focus:outline-none focus:border-[oklch(0.65_0.20_270)]"
            >
              <option value="all">All Roles</option>
              <option value="user">User</option>
              <option value="support">Support</option>
              <option value="finance">Finance</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="text-center py-12 text-[oklch(0.60_0.01_250)]">Loading users...</div>
        ) : users.length === 0 ? (
          <AdminEmptyState
            title="No users found"
            description="Try adjusting your search or filters"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[oklch(0.25_0.01_250)] text-left">
                    <th className="pb-3 w-12">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.size === users.length && users.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-[oklch(0.25_0.01_250)] bg-[oklch(0.15_0.01_250)] text-[oklch(0.65_0.20_270)] focus:ring-2 focus:ring-[oklch(0.65_0.20_270)]"
                      />
                    </th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Email</th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Name</th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Role</th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Plan</th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Usage</th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Last Login</th>
                    <th className="pb-3 text-sm font-medium text-[oklch(0.60_0.01_250)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-[oklch(0.25_0.01_250)] hover:bg-[oklch(0.20_0.01_250)] transition">
                      <td className="py-4">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                          className="w-4 h-4 rounded border-[oklch(0.25_0.01_250)] bg-[oklch(0.15_0.01_250)] text-[oklch(0.65_0.20_270)] focus:ring-2 focus:ring-[oklch(0.65_0.20_270)]"
                        />
                      </td>
                      <td className="py-4 text-white">{user.email}</td>
                      <td className="py-4 text-[oklch(0.90_0.01_250)]">{user.name || '-'}</td>
                      <td className="py-4">
                        <AdminBadge variant={getRoleBadgeVariant(user.role)}>
                          {user.role.replace('_', ' ')}
                        </AdminBadge>
                      </td>
                      <td className="py-4">
                        <AdminBadge variant={getPlanBadgeVariant(user.plan)}>
                          {user.plan}
                        </AdminBadge>
                      </td>
                      <td className="py-4 text-[oklch(0.90_0.01_250)]">
                        {user.conversions_used} / {user.conversions_limit === -1 ? '' : user.conversions_limit}
                      </td>
                      <td className="py-4 text-[oklch(0.60_0.01_250)] text-sm">
                        {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-4">
                        <AdminButton
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUserId(user.id)}
                        >
                          View
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
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
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

      {/* User Detail Modal */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          isOpen={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onUserUpdated={fetchUsers}
        />
      )}
    </AdminLayout>
  )
}
