'use client'

import React, { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserDetailModal } from '@/components/admin/UserDetailModal'
import { Search, Download, UserPlus, ChevronLeft, ChevronRight, RefreshCw, Users as UsersIcon, CheckCircle, Circle } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

interface User {
  id: string
  email: string
  name?: string
  role: string
  plan: string
  conversions_used: number
  conversions_limit: number
  email_verified: boolean
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

  const getPlanBadgeVariant = (plan: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (plan) {
      case 'enterprise': return 'default'
      case 'pro': return 'default'
      case 'starter': return 'secondary'
      default: return 'outline'
    }
  }

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case 'super_admin': return 'destructive'
      case 'admin': return 'default'
      case 'finance': return 'secondary'
      case 'support': return 'secondary'
      default: return 'outline'
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
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">User Management</h1>
            <p className="text-muted-foreground">Manage all users, subscriptions, and permissions</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            {selectedUserIds.size > 0 && (
              <Button variant="outline" size="sm" onClick={handleBulkQuotaReset} className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Reset Quota ({selectedUserIds.size})
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card className="glass-strong border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-primary" />
            Users List
          </CardTitle>
          <CardDescription>Browse and manage all registered users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
                <Input
                  type="text"
                  placeholder="Search by email or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">Search</Button>
            </form>

            <div className="flex gap-2">
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No users found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 w-12">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.size === users.length && users.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-2 focus:ring-ring"
                        />
                      </th>
                      <th className="pb-3 text-sm font-medium text-muted-foreground">Email</th>
                      <th className="pb-3 text-sm font-medium text-muted-foreground">Name</th>
                      <th className="pb-3 text-sm font-medium text-muted-foreground">Role</th>
                      <th className="pb-3 text-sm font-medium text-muted-foreground">Plan</th>
                      <th className="pb-3 text-sm font-medium text-muted-foreground">Verified</th>
                      <th className="pb-3 text-sm font-medium text-muted-foreground">Usage</th>
                      <th className="pb-3 text-sm font-medium text-muted-foreground">Last Login</th>
                      <th className="pb-3 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-border hover:bg-muted/50 transition">
                        <td className="py-4">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.has(user.id)}
                            onChange={() => handleSelectUser(user.id)}
                            className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-2 focus:ring-ring"
                          />
                        </td>
                        <td className="py-4 text-foreground">{user.email}</td>
                        <td className="py-4 text-foreground">{user.name || '-'}</td>
                        <td className="py-4">
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {user.role.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-4">
                          <Badge variant={getPlanBadgeVariant(user.plan)}>
                            {user.plan}
                          </Badge>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            {user.email_verified ? (
                              <>
                                <CheckCircle size={16} className="text-green-500" />
                                <span className="text-sm text-green-500 font-medium">Yes</span>
                              </>
                            ) : (
                              <>
                                <Circle size={16} className="text-yellow-500" />
                                <span className="text-sm text-yellow-500 font-medium">No</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-4 text-foreground">
                          {user.conversions_used} / {user.conversions_limit === -1 ? '∞' : user.conversions_limit}
                        </td>
                        <td className="py-4 text-muted-foreground text-sm">
                          {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="py-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedUserId(user.id)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
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
