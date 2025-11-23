/**
 * SLO Dashboard Component
 *
 * Displays Service Level Objective compliance and error budgets
 */

'use client'

import { useEffect, useState } from 'react'
import { getSLOCompliance, getErrorBudget } from '@/lib/prometheus-client'
import { AlertCircle, CheckCircle, TrendingDown } from 'lucide-react'

interface SLOData {
  sloType: string
  compliance: number
  errorBudget?: number
  burnRate?: number
}

export function SLODashboard() {
  const [sloData, setSlOData] = useState<SLOData[]>([])
  const [loading, setLoading] = useState(true)
  const [timeWindow, setTimeWindow] = useState<'24h' | '7d' | '30d'>('30d')

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 60000) // Refresh every 60s
    return () => clearInterval(interval)
  }, [timeWindow])

  async function loadData() {
    try {
      setLoading(true)
      const compliance = await getSLOCompliance(timeWindow)

      // Load error budget for each SLO
      const withBudgets = await Promise.all(
        compliance.map(async slo => {
          const budget = await getErrorBudget(slo.sloType, timeWindow)
          return {
            ...slo,
            errorBudget: budget.remaining,
            burnRate: budget.burnRate
          }
        })
      )

      setSlOData(withBudgets)
    } catch (error) {
      console.error('Failed to load SLO data:', error)
    } finally {
      setLoading(false)
    }
  }

  const sloLabels: Record<string, { name: string; target: number }> = {
    uptime: { name: 'Uptime', target: 99.9 },
    response_time: { name: 'Response Time', target: 99.0 },
    error_rate: { name: 'Error Rate', target: 99.9 },
    conversion_time: { name: 'Conversion Time', target: 95.0 },
    api_availability: { name: 'API Availability', target: 99.95 }
  }

  function getStatus(compliance: number, target: number): 'success' | 'warning' | 'error' {
    if (compliance >= target) return 'success'
    if (compliance >= target - 1) return 'warning'
    return 'error'
  }

  function getErrorBudgetStatus(budget: number): 'success' | 'warning' | 'error' {
    if (budget >= 50) return 'success'
    if (budget >= 25) return 'warning'
    return 'error'
  }

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">SLO Compliance</h2>

        <div className="flex gap-2">
          {(['24h', '7d', '30d'] as const).map(window => (
            <button
              key={window}
              onClick={() => setTimeWindow(window)}
              className={`
                px-3 py-1 text-sm font-medium rounded-md transition-colors
                ${timeWindow === window
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
              `}
            >
              {window}
            </button>
          ))}
        </div>
      </div>

      {/* SLO Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-lg"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Compliance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sloData.map(slo => {
              const config = sloLabels[slo.sloType]
              if (!config) return null

              const status = getStatus(slo.compliance, config.target)
              const statusColors = {
                success: 'bg-green-50 border-green-200',
                warning: 'bg-yellow-50 border-yellow-200',
                error: 'bg-red-50 border-red-200'
              }

              const statusIcons = {
                success: <CheckCircle className="w-5 h-5 text-green-600" />,
                warning: <AlertCircle className="w-5 h-5 text-yellow-600" />,
                error: <AlertCircle className="w-5 h-5 text-red-600" />
              }

              return (
                <div
                  key={slo.sloType}
                  className={`rounded-lg border-2 p-4 ${statusColors[status]}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">{config.name}</h3>
                    {statusIcons[status]}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {slo.compliance.toFixed(2)}%
                      </div>
                      <div className="text-xs text-gray-600">
                        Target: {config.target}%
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          status === 'success' ? 'bg-green-500' :
                          status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(slo.compliance, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Error Budget Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Error Budget</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sloData.map(slo => {
                const config = sloLabels[slo.sloType]
                if (!config || slo.errorBudget === undefined) return null

                const budgetStatus = getErrorBudgetStatus(slo.errorBudget)
                const statusColors = {
                  success: 'border-green-200',
                  warning: 'border-yellow-200',
                  error: 'border-red-200'
                }

                const isBurning = (slo.burnRate || 0) > 1

                return (
                  <div
                    key={slo.sloType}
                    className={`rounded-lg border-2 bg-white p-4 ${statusColors[budgetStatus]}`}
                  >
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      {config.name}
                    </div>

                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-2xl font-bold text-gray-900">
                        {slo.errorBudget.toFixed(1)}%
                      </span>
                      <span className="text-sm text-gray-600">remaining</span>
                    </div>

                    {isBurning && (
                      <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
                        <TrendingDown className="w-3 h-3" />
                        <span>Burning {slo.burnRate?.toFixed(1)}x faster</span>
                      </div>
                    )}

                    {/* Budget Bar */}
                    <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full transition-all ${
                          budgetStatus === 'success' ? 'bg-green-500' :
                          budgetStatus === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.max(slo.errorBudget, 0)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
