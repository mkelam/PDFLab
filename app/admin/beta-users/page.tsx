'use client'

import React, { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserDetailModal } from '@/components/admin/UserDetailModal'
import { Search, Download, ChevronLeft, ChevronRight, RefreshCw, Users as UsersIcon, CheckCircle, Circle, Sparkles } from 'lucide-react'

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
  is_beta_user?: boolean
  beta_expires_at?: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function BetaUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search })
      })

      const response = await fetch(`${API_URL}/api/admin/beta-users?${params}`, {
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
      console.error('Failed to fetch beta users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [pagination.page])

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
    if (!confirm(`Reset quota for ${userIds.length} selected beta users?`)) return

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
        alert(`Successfully reset quota for ${userIds.length} beta users`)
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

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-primary" />
              Beta Users Management
            </h1>
            <p className="text-muted-foreground">Manage beta program users and their access</p>
          </div>
          <div className="flex items-center gap-2">
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
            <Sparkles className="w-5 h-5 text-primary" />
            Beta Users List
          </CardTitle>
          <CardDescription>Browse and manage all beta program users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <form onSubmit={handleSearch} className="flex gap-2">
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
              <Button type="button" variant="outline" onClick={fetchUsers}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </form>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading beta users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No beta users found</h3>
              <p className="text-muted-foreground">Try adjusting your search</p>
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
                      <th className="pb-3 text-sm font-medium text-muted-foreground">Beta Expires</th>
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
                          {user.beta_expires_at ? new Date(user.beta_expires_at).toLocaleDateString() : 'Never'}
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
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} beta users
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
