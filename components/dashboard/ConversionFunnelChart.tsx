/**
 * Conversion Funnel Chart Component
 *
 * Visualizes conversion funnel with drop-off rates
 */

'use client'

import { useEffect, useState } from 'react'
import { getConversionFunnel } from '@/lib/prometheus-client'

interface FunnelStage {
  stage: string
  value: number
  dropoff?: number
}

export function ConversionFunnelChart() {
  const [data, setData] = useState<FunnelStage[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h')

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [timeRange])

  async function loadData() {
    try {
      setLoading(true)
      const funnelData = await getConversionFunnel(timeRange)

      // Calculate drop-off percentages
      const withDropoff = funnelData.map((stage, index) => {
        if (index === 0) return { ...stage, dropoff: 0 }

        const prevValue = funnelData[index - 1].value
        const dropoff = prevValue > 0
          ? ((prevValue - stage.value) / prevValue) * 100
          : 0

        return { ...stage, dropoff }
      })

      setData(withDropoff)
    } catch (error) {
      console.error('Failed to load funnel data:', error)
    } finally {
      setLoading(false)
    }
  }

  const stageLabels: Record<string, string> = {
    upload_initiated: 'Upload Started',
    file_validated: 'File Validated',
    job_queued: 'Job Queued',
    processing_started: 'Processing',
    processing_completed: 'Completed',
    download_initiated: 'Download Started',
    download_completed: 'Downloaded'
  }

  const maxValue = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Conversion Funnel</h2>

        <div className="flex gap-2">
          {(['1h', '24h', '7d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`
                px-3 py-1 text-sm font-medium rounded-md transition-colors
                ${timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
              `}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Funnel Visualization */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 animate-pulse rounded"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((stage, index) => {
            const width = (stage.value / maxValue) * 100
            const isHighDropoff = (stage.dropoff || 0) > 10

            return (
              <div key={stage.stage} className="relative">
                {/* Stage Bar */}
                <div className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium text-gray-700">
                    {stageLabels[stage.stage] || stage.stage}
                  </div>

                  <div className="flex-1">
                    <div className="relative h-12 bg-gray-100 rounded-lg overflow-hidden">
                      <div
                        className={`
                          h-full transition-all duration-500 flex items-center px-4
                          ${isHighDropoff ? 'bg-red-500' : 'bg-blue-500'}
                        `}
                        style={{ width: `${width}%` }}
                      >
                        <span className="text-white font-semibold text-sm">
                          {stage.value.toFixed(1)}/s
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="w-20 text-right">
                    {index > 0 && stage.dropoff !== undefined && (
                      <span className={`
                        text-sm font-medium
                        ${isHighDropoff ? 'text-red-600' : 'text-gray-600'}
                      `}>
                        -{stage.dropoff.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex items-center gap-6 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>Normal flow</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>High drop-off (&gt;10%)</span>
        </div>
      </div>
    </div>
  )
}
