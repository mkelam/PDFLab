'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, Check, TrendingUp, Users, DollarSign, Zap, Award, ExternalLink, Calendar, Filter, Target, Calculator } from 'lucide-react'
import { Slider } from '@/components/ui/slider'

interface PartnerDashboardData {
  partner: {
    id: string
    name: string
    slug: string
    platform: string
    follower_count: number
    commission_tier: 'bronze' | 'silver' | 'gold' | 'platinum'
    commission_rate: number
    status: 'active' | 'paused' | 'inactive'
    referral_link: string
    free_licenses: {
      allocated: number
      used: number
      remaining: number
    }
  }
  stats: {
    all_time: {
      signups: number
      conversions: number
      conversion_rate: string
      revenue_generated: string
      commission_earned: string
      commission_paid: string
      commission_pending: string
    }
    current_month: {
      signups: number
      conversions: number
      conversion_rate: string
    }
  }
  promo_codes: Array<{
    id: string
    code: string
    discount_type: string
    discount_value: number
    uses: number
    max_uses: number
    is_active: boolean
    expires_at: string | null
  }>
  recent_referrals: Array<{
    id: string
    user_email: string
    user_name: string
    user_plan: string
    attribution_method: string
    signup_date: string
    converted: boolean
    conversion_date: string | null
    commission_due: string
    commission_paid: boolean
  }>
}

interface ReferralUser {
  id: string
  user: {
    email: string
    name: string | null
    plan: string
    signup_date: string
  }
  attribution_method: string
  promo_code: string | null
  utm_source: string | null
  utm_campaign: string | null
  signup_date: string
  converted: boolean
  conversion_date: string | null
  first_payment: string
  commission_due: string
  commission_paid: boolean
}

interface ReferralsData {
  referrals: ReferralUser[]
  pagination: {
    total: number
    page: number
    limit: number
    total_pages: number
  }
}

export default function PartnerDashboardPage() {
  const params = useParams()
  const slug = params?.slug as string

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PartnerDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Referrals state
  const [referralsData, setReferralsData] = useState<ReferralsData | null>(null)
  const [referralsLoading, setReferralsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'all' | 'converted' | 'pending'>('all')

  // Earning potential calculator state
  const [conversionRate, setConversionRate] = useState<number>(5) // Start at 5%
  const [customFollowerCount, setCustomFollowerCount] = useState<number | null>(null) // null = use actual count

  useEffect(() => {
    fetchDashboardData()
  }, [slug])

  useEffect(() => {
    if (slug) {
      fetchReferrals()
    }
  }, [slug, currentPage, statusFilter])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/partners/${slug}/dashboard`)

      if (!response.ok) {
        if (response.status === 404) {
          setError('Partner not found. Please check your link.')
        } else {
          setError('Failed to load dashboard data.')
        }
        return
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('[Partner Dashboard] Error:', err)
      setError('Unable to connect to server. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, type: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'link') {
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2000)
      } else {
        setCopiedCode(text)
        setTimeout(() => setCopiedCode(null), 2000)
      }
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const fetchReferrals = async () => {
    try {
      setReferralsLoading(true)

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      })

      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/partners/${slug}/referrals?${params}`
      )

      if (!response.ok) {
        console.error('Failed to load referrals')
        return
      }

      const result = await response.json()
      setReferralsData(result)
    } catch (err) {
      console.error('[Referrals] Error:', err)
    } finally {
      setReferralsLoading(false)
    }
  }

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'platinum':
        return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
      case 'gold':
        return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
      case 'silver':
        return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
      case 'bronze':
        return 'bg-gradient-to-r from-orange-700 to-amber-700 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-600 border-green-500/30'
      case 'paused':
        return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30'
      case 'inactive':
        return 'bg-red-500/20 text-red-600 border-red-500/30'
      default:
        return 'bg-gray-500/20 text-gray-600 border-gray-500/30'
    }
  }

  // Tier thresholds and commission rates
  const tierInfo = {
    bronze: { threshold: 200, rate: 30, nextTier: 'silver' },
    silver: { threshold: 500, rate: 40, nextTier: 'gold' },
    gold: { threshold: 1000, rate: 50, nextTier: 'platinum' },
    platinum: { threshold: Infinity, rate: 50, nextTier: null }
  }

  const getTierProgress = () => {
    const currentTier = partner.commission_tier
    const conversions = stats.all_time.conversions
    const tierData = tierInfo[currentTier]

    if (!tierData.nextTier) {
      return { progress: 100, needed: 0, nextTier: null, nextRate: tierData.rate }
    }

    const progress = (conversions / tierData.threshold) * 100
    const needed = Math.max(0, tierData.threshold - conversions)
    const nextTierData = tierInfo[tierData.nextTier as keyof typeof tierInfo]

    return {
      progress: Math.min(progress, 100),
      needed,
      nextTier: tierData.nextTier,
      nextRate: nextTierData.rate
    }
  }

  const calculateEarnings = () => {
    const followers = customFollowerCount ?? partner.follower_count
    const rate = conversionRate / 100
    const conversions = Math.floor(followers * rate)
    const starterPrice = 9.99
    const revenue = conversions * starterPrice
    const commission = revenue * (partner.commission_rate / 100)

    return {
      conversions,
      revenue,
      commission
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="glass-strong w-full max-w-md">
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="glass-strong w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
            <CardDescription>{error || 'Unable to load dashboard'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchDashboardData} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { partner, stats, promo_codes } = data

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-strong rounded-2xl p-6 border border-border/50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Welcome back, {partner.name}!
              </h1>
              <p className="text-muted-foreground mt-1">
                {partner.platform} • {partner.follower_count.toLocaleString()} followers
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className={getTierBadgeColor(partner.commission_tier)}>
                <Award className="w-3 h-3 mr-1" />
                {partner.commission_tier.toUpperCase()} ({partner.commission_rate}%)
              </Badge>
              <Badge variant="outline" className={getStatusBadgeColor(partner.status)}>
                {partner.status.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Signups */}
          <Card className="glass-strong border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Signups</CardTitle>
                <Users className="w-4 h-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.all_time.signups}</div>
              <p className="text-xs text-muted-foreground mt-1">
                +{stats.current_month.signups} this month
              </p>
            </CardContent>
          </Card>

          {/* Total Conversions */}
          <Card className="glass-strong border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Conversions</CardTitle>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{stats.all_time.conversions}</div>
              <p className="text-xs text-muted-foreground mt-1">
                +{stats.current_month.conversions} this month ({stats.current_month.conversion_rate})
              </p>
            </CardContent>
          </Card>

          {/* Total Revenue Generated */}
          <Card className="glass-strong border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Revenue Generated</CardTitle>
                <DollarSign className="w-4 h-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-500">
                ${parseFloat(stats.all_time.revenue_generated || '0').toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Lifetime revenue from your referrals
              </p>
            </CardContent>
          </Card>

          {/* Your Earnings */}
          <Card className="glass-strong border-border/50 bg-gradient-to-br from-primary/5 to-purple-500/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Your Earnings</CardTitle>
                <Zap className="w-4 h-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">
                ${parseFloat(stats.all_time.commission_earned || '0').toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total commission earned ({stats.all_time.conversion_rate} conversion)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tier Progress & Earning Calculator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Tier Progress */}
          <Card className="glass-strong border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Commission Tier Progress
              </CardTitle>
              <CardDescription>Track your path to higher commission rates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const tierProgress = getTierProgress()
                return (
                  <>
                    {/* Current Tier Display */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Current Tier</p>
                        <p className="text-2xl font-bold capitalize">{partner.commission_tier}</p>
                      </div>
                      <Badge className={getTierBadgeColor(partner.commission_tier)}>
                        {partner.commission_rate}% Commission
                      </Badge>
                    </div>

                    {/* Progress Bar */}
                    {tierProgress.nextTier && (
                      <>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress to {tierProgress.nextTier}</span>
                            <span className="font-medium">{tierProgress.progress.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-purple-600 transition-all duration-500"
                              style={{ width: `${tierProgress.progress}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Next Tier Info */}
                        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                          <div className="flex items-start gap-3">
                            <Award className="w-5 h-5 text-primary mt-0.5" />
                            <div>
                              <p className="font-semibold text-sm">Next Milestone: {tierProgress.nextTier.toUpperCase()}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {tierProgress.needed} more conversions needed to unlock {tierProgress.nextRate}% commission rate
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* All Tiers Overview */}
                    <div className="pt-4 border-t border-border/50">
                      <p className="text-sm font-medium mb-3">Tier Breakdown</p>
                      <div className="space-y-2">
                        {Object.entries(tierInfo).map(([tier, info]) => {
                          const isCurrent = tier === partner.commission_tier
                          return (
                            <div
                              key={tier}
                              className={`flex items-center justify-between p-2 rounded ${
                                isCurrent ? 'bg-primary/10 border border-primary/20' : 'bg-background/50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`text-sm capitalize ${isCurrent ? 'font-semibold' : ''}`}>
                                  {tier}
                                </span>
                                {isCurrent && <Badge variant="outline" className="text-xs">Current</Badge>}
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">{info.rate}% Commission</p>
                                <p className="text-xs text-muted-foreground">
                                  {info.threshold === Infinity ? '1000+' : `0-${info.threshold}`} conversions
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )
              })()}
            </CardContent>
          </Card>

          {/* Card 2: Earning Potential Calculator */}
          <Card className="glass-strong border-border/50 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Earning Potential Calculator
              </CardTitle>
              <CardDescription>Estimate your earnings based on audience size</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Audience Size Input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Audience Size</label>
                  {customFollowerCount !== null && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCustomFollowerCount(null)}
                      className="text-xs h-auto py-1 px-2"
                    >
                      Reset to actual ({partner.follower_count.toLocaleString()})
                    </Button>
                  )}
                </div>
                <input
                  type="number"
                  value={customFollowerCount ?? partner.follower_count}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0
                    setCustomFollowerCount(value > 0 ? value : null)
                  }}
                  className="w-full px-4 py-3 bg-white/80 border border-border/50 rounded-lg text-2xl font-bold text-gray-900 dark:bg-gray-800 dark:text-gray-100 text-center"
                  placeholder="Enter follower count"
                  min="0"
                />
                <p className="text-xs text-muted-foreground text-center">
                  {customFollowerCount !== null ? (
                    <>
                      <span className="text-primary font-medium">Custom scenario</span> - Modeling with {customFollowerCount.toLocaleString()} followers
                    </>
                  ) : (
                    <>Using your actual audience size of {partner.follower_count.toLocaleString()} followers</>
                  )}
                </p>
              </div>

              {/* Conversion Rate Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Conversion Rate</label>
                  <span className="text-2xl font-bold text-primary">{conversionRate}%</span>
                </div>
                <Slider
                  value={[conversionRate]}
                  onValueChange={(value) => setConversionRate(value[0])}
                  min={1}
                  max={20}
                  step={0.5}
                  className="w-full"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>1% (Conservative)</span>
                  <span>20% (Optimistic)</span>
                </div>
              </div>

              {/* Earnings Calculation */}
              {(() => {
                const earnings = calculateEarnings()
                return (
                  <>
                    <div className="space-y-3 pt-4 border-t border-border/50">
                      {/* Estimated Conversions */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Estimated Conversions (Starter Plan)</span>
                        <span className="text-lg font-semibold">{earnings.conversions.toLocaleString()}</span>
                      </div>

                      {/* Your Commission */}
                      <div className="p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Your Commission ({partner.commission_rate}%)</p>
                            <p className="text-xs text-muted-foreground mt-1">Monthly recurring earnings</p>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold text-green-600">
                              ${earnings.commission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-muted-foreground">/month</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConversionRate(1)}
                        className={conversionRate === 1 ? 'bg-primary/10' : ''}
                      >
                        1%
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConversionRate(5)}
                        className={conversionRate === 5 ? 'bg-primary/10' : ''}
                      >
                        5%
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConversionRate(10)}
                        className={conversionRate === 10 ? 'bg-primary/10' : ''}
                      >
                        10%
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConversionRate(15)}
                        className={conversionRate === 15 ? 'bg-primary/10' : ''}
                      >
                        15%
                      </Button>
                    </div>
                  </>
                )
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Referral Tools */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Referral Link */}
          <Card className="glass-strong border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5" />
                Your Referral Link
              </CardTitle>
              <CardDescription>Share this link to earn commissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={partner.referral_link}
                  className="flex-1 px-4 py-2 bg-white/80 border border-border/50 rounded-lg text-sm font-mono text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                />
                <Button
                  onClick={() => copyToClipboard(partner.referral_link, 'link')}
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                >
                  {copiedLink ? (
                    <>
                      <Check size={16} className="mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={16} className="mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-600 font-medium mb-2">💡 Pro Tip</p>
                <p className="text-xs text-muted-foreground">
                  Add this link to your bio, video descriptions, and social media posts. Every signup
                  through your link earns you {partner.commission_rate}% commission!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Promo Codes */}
          <Card className="glass-strong border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Your Promo Codes
              </CardTitle>
              <CardDescription>
                {promo_codes.length > 0
                  ? 'Share these codes with your audience'
                  : 'No promo codes yet'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {promo_codes.length > 0 ? (
                <div className="space-y-2">
                  {promo_codes.map((promoCode) => (
                    <div
                      key={promoCode.id}
                      className="flex items-center justify-between p-3 bg-background/50 border border-border/50 rounded-lg"
                    >
                      <div>
                        <span className="font-mono font-semibold text-lg">{promoCode.code}</span>
                        <p className="text-xs text-muted-foreground mt-1">
                          {promoCode.discount_type === 'percentage' ? `${promoCode.discount_value}% off` : `$${promoCode.discount_value} off`}
                          {' '}• Used {promoCode.uses}/{promoCode.max_uses || '∞'}
                        </p>
                      </div>
                      <Button
                        onClick={() => copyToClipboard(promoCode.code, 'code')}
                        variant="ghost"
                        size="sm"
                      >
                        {copiedCode === promoCode.code ? (
                          <>
                            <Check size={16} className="mr-1" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={16} className="mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Contact support to request promo codes</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pending Commission */}
        {parseFloat(stats.all_time.commission_pending || '0') > 0 && (
          <Card className="glass-strong border-border/50 border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-orange-500" />
                Pending Payout
              </CardTitle>
              <CardDescription>Commission ready for payment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-orange-500">
                ${parseFloat(stats.all_time.commission_pending || '0').toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Payouts are processed monthly. You'll receive an email when your payment is sent.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Total paid: ${parseFloat(stats.all_time.commission_paid || '0').toFixed(2)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Referrals Table */}
        <Card className="glass-strong border-border/50">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Your Referrals
                </CardTitle>
                <CardDescription>
                  {referralsData ? `${referralsData.pagination.total} total referrals` : 'Loading referrals...'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all')
                    setCurrentPage(1)
                  }}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'converted' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStatusFilter('converted')
                    setCurrentPage(1)
                  }}
                >
                  Converted
                </Button>
                <Button
                  variant={statusFilter === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStatusFilter('pending')
                    setCurrentPage(1)
                  }}
                >
                  Pending
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {referralsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : referralsData && referralsData.referrals.length > 0 ? (
              <div className="space-y-4">
                {/* Table for desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Plan</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Signup Date</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Method</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Commission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referralsData.referrals.map((referral) => (
                        <tr key={referral.id} className="border-b border-border/30 hover:bg-background/50 transition-colors">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-sm">{referral.user.name || 'Anonymous'}</p>
                              <p className="text-xs text-muted-foreground">{referral.user.email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="capitalize">
                              {referral.user.plan}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {new Date(referral.signup_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              {referral.promo_code && (
                                <Badge variant="secondary" className="text-xs">
                                  {referral.promo_code}
                                </Badge>
                              )}
                              {referral.utm_source && (
                                <span className="text-xs text-muted-foreground">
                                  {referral.utm_source}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {referral.converted ? (
                              <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                                Converted
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-600">
                                Pending
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div>
                              <p className="font-semibold text-sm">
                                ${parseFloat(referral.commission_due || '0').toFixed(2)}
                              </p>
                              {referral.commission_paid && (
                                <p className="text-xs text-green-600">Paid</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cards for mobile */}
                <div className="md:hidden space-y-3">
                  {referralsData.referrals.map((referral) => (
                    <div key={referral.id} className="p-4 bg-background/50 border border-border/50 rounded-lg space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{referral.user.name || 'Anonymous'}</p>
                          <p className="text-xs text-muted-foreground">{referral.user.email}</p>
                        </div>
                        {referral.converted ? (
                          <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                            Converted
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-600">
                            Pending
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(referral.signup_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border/30">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize text-xs">
                            {referral.user.plan}
                          </Badge>
                          {referral.promo_code && (
                            <Badge variant="secondary" className="text-xs">
                              {referral.promo_code}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">
                            ${parseFloat(referral.commission_due || '0').toFixed(2)}
                          </p>
                          {referral.commission_paid && (
                            <p className="text-xs text-green-600">Paid</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {referralsData.pagination.total_pages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * 10) + 1} - {Math.min(currentPage * 10, referralsData.pagination.total)} of {referralsData.pagination.total}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, referralsData.pagination.total_pages) }, (_, i) => {
                          const pageNum = i + 1
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="w-8 h-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          )
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(referralsData.pagination.total_pages, currentPage + 1))}
                        disabled={currentPage === referralsData.pagination.total_pages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No referrals yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Start sharing your referral link and promo codes to see your referrals here!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
