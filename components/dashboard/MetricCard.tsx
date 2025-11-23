/**
 * Metric Card Component
 *
 * Displays a single metric value with trend indicator
 */

'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'

export interface MetricCardProps {
  title: string
  value: number | string
  unit?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: number
  status?: 'success' | 'warning' | 'error' | 'info'
  description?: string
  loading?: boolean
  onClick?: () => void
}

export function MetricCard({
  title,
  value,
  unit = '',
  trend,
  trendValue,
  status = 'info',
  description,
  loading = false,
  onClick
}: MetricCardProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return null
  }

  const statusColors = {
    success: 'bg-green-50 border-green-200 text-green-900',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    error: 'bg-red-50 border-red-200 text-red-900',
    info: 'bg-blue-50 border-blue-200 text-blue-900'
  }

  const statusIconColors = {
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
    info: 'text-blue-600'
  }

  const trendIcons = {
    up: <TrendingUp className="w-4 h-4" />,
    down: <TrendingDown className="w-4 h-4" />,
    neutral: <Minus className="w-4 h-4" />
  }

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600'
  }

  return (
    <div
      className={`
        rounded-lg border-2 p-6 transition-all
        ${statusColors[status]}
        ${onClick ? 'cursor-pointer hover:shadow-lg' : ''}
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium opacity-75">{title}</h3>
        {status === 'error' && (
          <AlertCircle className={`w-5 h-5 ${statusIconColors[status]}`} />
        )}
      </div>

      {/* Value */}
      <div className="space-y-2">
        {loading ? (
          <div className="h-10 bg-gray-200 animate-pulse rounded"></div>
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            {unit && (
              <span className="text-sm font-medium opacity-75">{unit}</span>
            )}
          </div>
        )}

        {/* Trend */}
        {trend && trendValue !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${trendColors[trend]}`}>
            {trendIcons[trend]}
            <span>{Math.abs(trendValue).toFixed(1)}%</span>
            <span className="opacity-75">vs last period</span>
          </div>
        )}

        {/* Description */}
        {description && (
          <p className="text-xs opacity-75 mt-2">{description}</p>
        )}
      </div>
    </div>
  )
}
