'use client'

import React, { useState, useEffect } from 'react'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import Link from 'next/link'
import {
  UsersRound,
  TrendingUp,
  DollarSign,
  Users,
  Copy,
  ExternalLink,
  Plus,
  Sparkles,
  BarChart3
} from 'lucide-react'

interface Partner {
  id: string
  name: string
  email: string
  slug: string
  platform: string
  follower_count: number
  commission_tier: string
  commission_rate: number
  status: string
  referral_link: string
  total_signups: number
  total_conversions: number
  conversion_rate: string
  total_revenue: number
  total_commission_earned: number
  pending_commission: number
  free_licenses_remaining: number
  promo_codes: string[]
}

interface AttributionStats {
  total_signups: number
  partner_signups: number
  organic_signups: number
  partner_percentage: string
  total_conversions: number
  conversion_rate: string
  total_revenue: string
  total_commission: string
}

function StatCard({ icon, label, value, sublabel, loading }: {
  icon: React.ReactNode
  label: string
  value: string
  sublabel?: string
  loading?: boolean
}) {
  return (
    <Card className="glass-strong border-border/50">
      <CardHeader className="pb-3">
        <div className="p-2 bg-primary/10 rounded-lg text-primary w-fit">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <CardTitle className="text-sm font-medium text-muted-foreground mb-1">{label}</CardTitle>
        <p className="text-2xl font-bold text-foreground">
          {loading ? (
            <span className="animate-pulse">Loading...</span>
          ) : (
            value
          )}
        </p>
        {sublabel && (
          <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
        )}
      </CardContent>
    </Card>
  )
}

export default function AdminPartnersPage() {
  useRequireAuth({ requiredRole: 'admin' })

  const [partners, setPartners] = useState<Partner[]>([])
  const [stats, setStats] = useState<AttributionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    slug: '',
    platform: 'youtube',
    follower_count: '',
    commission_tier: 'bronze'
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch partners
      console.log('[Partners] Fetching from /partners/admin/all')
      const response = await api.get('/partners/admin/all')
      console.log('[Partners] Response:', response)

      // api.get() returns the data directly, not wrapped in {data: ...}
      if (response?.partners) {
        console.log('[Partners] Found', response.partners.length, 'partners')
        setPartners(response.partners)
      } else {
        console.warn('[Partners] No partners in response')
        setPartners([])
      }

      // TODO: Fetch attribution stats when endpoint is implemented
      // const statsResponse = await api.get('/partners/admin/attribution/stats')
      // setStats(statsResponse.data.stats)
    } catch (error: any) {
      console.error('[Partners] Error fetching data:', error)
      console.error('[Partners] Error response:', error?.response)
      console.error('[Partners] Error data:', error?.response?.data)
      setPartners([]) // Ensure partners is always an array
    } finally {
      setLoading(false)
    }
  }

  const getTierBadgeVariant = (tier: string): 'default' | 'secondary' | 'outline' => {
    switch (tier.toLowerCase()) {
      case 'gold':
        return 'default'
      case 'silver':
        return 'secondary'
      case 'bronze':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getTierColor = (tier: string): string => {
    switch (tier.toLowerCase()) {
      case 'gold':
        return 'text-yellow-500'
      case 'silver':
        return 'text-gray-400'
      case 'bronze':
        return 'text-orange-500'
      default:
        return 'text-muted-foreground'
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // In production, you'd use a toast notification here
      alert('Copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setCreating(true)

      await api.post('/partners/admin/create', {
        name: formData.name,
        email: formData.email,
        slug: formData.slug,
        platform: formData.platform,
        follower_count: parseInt(formData.follower_count),
        commission_tier: formData.commission_tier
      })

      // Reset form
      setFormData({
        name: '',
        email: '',
        slug: '',
        platform: 'youtube',
        follower_count: '',
        commission_tier: 'bronze'
      })

      setShowCreateModal(false)

      // Refresh data
      await fetchData()

      alert('Partner created successfully!')
    } catch (error: any) {
      console.error('Failed to create partner:', error)
      alert(error.response?.data?.error || 'Failed to create partner')
    } finally {
      setCreating(false)
    }
  }

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name)
    })
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading partner data...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div>
        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Partner Management</h1>
            <p className="text-muted-foreground">Influencer attribution tracking & commission management</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
            <Plus size={18} />
            Add Partner
          </Button>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={<UsersRound size={24} />}
              label="Total Partners"
              value={partners.length.toString()}
              loading={loading}
            />
            <StatCard
              icon={<Users size={24} />}
              label="Partner Signups"
              value={stats.partner_signups.toString()}
              sublabel={`${stats.partner_percentage} of total`}
              loading={loading}
            />
            <StatCard
              icon={<DollarSign size={24} />}
              label="Total Revenue"
              value={`$${stats.total_revenue}`}
              sublabel="From partner referrals"
              loading={loading}
            />
            <StatCard
              icon={<TrendingUp size={24} />}
              label="Commission Owed"
              value={`$${stats.total_commission}`}
              sublabel="Pending payment"
              loading={loading}
            />
          </div>
        )}

        {/* Partner List */}
        <Card className="glass-strong border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              All Partners
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {partners.length} Active
            </Badge>
          </CardHeader>
          <CardContent>
            {partners.length === 0 ? (
              <div className="text-center py-12">
                <UsersRound className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No partners yet</h3>
                <p className="text-muted-foreground mb-6">
                  Add your first influencer partner to start tracking referrals
                </p>
                <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
                  <Plus size={18} />
                  Add First Partner
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {partners.map((partner, index) => (
                  <Card key={partner.id} className="glass-subtle border-border/40 hover:border-border transition-all">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        {/* Partner Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="text-2xl">
                              {index === 0 && '🥇'}
                              {index === 1 && '🥈'}
                              {index === 2 && '🥉'}
                              {index > 2 && '👤'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-semibold text-foreground">{partner.name}</h3>
                                <Badge variant={getTierBadgeVariant(partner.commission_tier)} className={getTierColor(partner.commission_tier)}>
                                  {partner.commission_tier} {partner.commission_rate}%
                                </Badge>
                                <Badge variant={partner.status === 'active' ? 'default' : 'secondary'}>
                                  {partner.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {partner.platform} • {partner.follower_count.toLocaleString()} followers
                              </p>
                            </div>
                          </div>

                          {/* Referral Link */}
                          <div className="mb-4">
                            <div className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-background/50">
                              <code className="text-sm text-foreground flex-1 truncate">
                                {partner.referral_link}
                              </code>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(partner.referral_link)}
                                className="flex items-center gap-1"
                              >
                                <Copy size={14} />
                                Copy
                              </Button>
                            </div>
                            {partner.promo_codes.length > 0 && (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Promo codes:</span>
                                {partner.promo_codes.map((code) => (
                                  <Badge key={code} variant="outline" className="text-xs font-mono">
                                    {code}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="p-3 rounded-lg border border-border/50 bg-background/30">
                              <p className="text-xs text-muted-foreground mb-1">Signups</p>
                              <p className="text-lg font-semibold text-foreground">{partner.total_signups || 0}</p>
                            </div>
                            <div className="p-3 rounded-lg border border-border/50 bg-background/30">
                              <p className="text-xs text-muted-foreground mb-1">Conversions</p>
                              <p className="text-lg font-semibold text-green-500">
                                {partner.total_conversions || 0}
                                <span className="text-xs text-muted-foreground ml-1">({partner.conversion_rate || '0%'})</span>
                              </p>
                            </div>
                            <div className="p-3 rounded-lg border border-border/50 bg-background/30">
                              <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                              <p className="text-lg font-semibold text-blue-500">${(partner.total_revenue || 0).toFixed(2)}</p>
                            </div>
                            <div className="p-3 rounded-lg border border-border/50 bg-background/30">
                              <p className="text-xs text-muted-foreground mb-1">Commission</p>
                              <p className="text-lg font-semibold text-orange-500">${(partner.total_commission_earned || 0).toFixed(2)}</p>
                            </div>
                            <div className="p-3 rounded-lg border border-border/50 bg-background/30">
                              <p className="text-xs text-muted-foreground mb-1">Pending</p>
                              <p className="text-lg font-semibold text-red-500">${(partner.pending_commission || 0).toFixed(2)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 ml-6">
                          <Button
                            size="sm"
                            variant="default"
                            className="flex items-center gap-2"
                            onClick={() => window.open(`/api/partners/${partner.slug}/dashboard`, '_blank')}
                          >
                            <BarChart3 size={16} />
                            Dashboard
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-2"
                            onClick={() => window.open(`/api/partners/${partner.slug}/referrals`, '_blank')}
                          >
                            <ExternalLink size={16} />
                            Referrals
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Partner Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="glass-strong border-border/50 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-xl">Add New Partner</CardTitle>
              <CardDescription>Create a new influencer partner</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePartner} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Partner Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Jeff Su"
                    className="w-full px-3 py-2 rounded-lg border border-border/50 bg-gray-900/90 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jeff@example.com"
                    className="w-full px-3 py-2 rounded-lg border border-border/50 bg-gray-900/90 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Slug (auto-generated) */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    URL Slug *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="jeff-su"
                    className="w-full px-3 py-2 rounded-lg border border-border/50 bg-gray-900/90 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Referral link: pdflab.pro/partner/{formData.slug || 'slug'}
                  </p>
                </div>

                {/* Platform */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Platform *
                  </label>
                  <select
                    required
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border/50 bg-gray-900/90 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="youtube">YouTube</option>
                    <option value="instagram">Instagram</option>
                    <option value="twitter">Twitter</option>
                    <option value="tiktok">TikTok</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="podcast">Podcast</option>
                    <option value="blog">Blog</option>
                  </select>
                </div>

                {/* Follower Count */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Follower Count *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.follower_count}
                    onChange={(e) => setFormData({ ...formData, follower_count: e.target.value })}
                    placeholder="200000"
                    min="0"
                    className="w-full px-3 py-2 rounded-lg border border-border/50 bg-gray-900/90 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Commission Tier */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Commission Tier *
                  </label>
                  <select
                    required
                    value={formData.commission_tier}
                    onChange={(e) => setFormData({ ...formData, commission_tier: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border/50 bg-gray-900/90 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="bronze">Bronze (30%)</option>
                    <option value="silver">Silver (40%)</option>
                    <option value="gold">Gold (50%)</option>
                  </select>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false)
                      setFormData({
                        name: '',
                        email: '',
                        slug: '',
                        platform: 'youtube',
                        follower_count: '',
                        commission_tier: 'bronze'
                      })
                    }}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating}
                    className="flex items-center gap-2"
                  >
                    {creating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        Create Partner
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminLayout>
  )
}
