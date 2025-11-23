/**
 * Queue Monitor Component
 *
 * Real-time queue depth and health monitoring
 */

'use client'

import { useEffect, useState } from 'react'
import { getQueueDepth } from '@/lib/prometheus-client'
import { Clock, AlertTriangle, CheckCircle, Loader } from 'lucide-react'

interface QueueData {
  waiting: number
  active: number
  delayed: number
  failed: number
  total: number
}

export function QueueMonitor() {
  const [queueData, setQueueData] = useState<QueueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    loadData()
    const interval = setInterval(() => {
      loadData()
      setLastUpdate(new Date())
    }, 10000) // Refresh every 10s

    return () => clearInterval(interval)
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const data = await getQueueDepth()
      setQueueData(data)
    } catch (error) {
      console.error('Failed to load queue data:', error)
    } finally {
      setLoading(false)
    }
  }

  function getHealthStatus(): 'healthy' | 'warning' | 'critical' {
    if (!queueData) return 'healthy'

    if (queueData.waiting > 500 || queueData.failed > 50) return 'critical'
    if (queueData.waiting > 100 || queueData.failed > 10) return 'warning'
    return 'healthy'
  }

  const healthStatus = getHealthStatus()

  const statusConfig = {
    healthy: {
      color: 'bg-green-50 border-green-200',
      icon: <CheckCircle className="w-6 h-6 text-green-600" />,
      text: 'Healthy',
      textColor: 'text-green-900'
    },
    warning: {
      color: 'bg-yellow-50 border-yellow-200',
      icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
      text: 'Warning',
      textColor: 'text-yellow-900'
    },
    critical: {
      color: 'bg-red-50 border-red-200',
      icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
      text: 'Critical',
      textColor: 'text-red-900'
    }
  }

  const config = statusConfig[healthStatus]

  return (
    <div className={`rounded-lg border-2 p-6 ${config.color}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900">Queue Monitor</h2>
          <div className="flex items-center gap-2">
            {config.icon}
            <span className={`text-sm font-semibold ${config.textColor}`}>
              {config.text}
            </span>
          </div>
        </div>

        <div className="text-xs text-gray-600 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>Updated {lastUpdate.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Queue Stats */}
      {loading && !queueData ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white/50 animate-pulse rounded-lg"></div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Waiting */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-sm font-medium text-gray-600 mb-2">Waiting</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">
                  {queueData?.waiting || 0}
                </span>
                <Loader className="w-4 h-4 text-blue-500 animate-spin" />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {queueData && queueData.total > 0
                  ? `${((queueData.waiting / queueData.total) * 100).toFixed(0)}% of total`
                  : 'No jobs'}
              </div>
            </div>

            {/* Active */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-sm font-medium text-gray-600 mb-2">Active</div>
              <div className="text-3xl font-bold text-green-600">
                {queueData?.active || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">Processing now</div>
            </div>

            {/* Delayed */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-sm font-medium text-gray-600 mb-2">Delayed</div>
              <div className="text-3xl font-bold text-yellow-600">
                {queueData?.delayed || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">Scheduled later</div>
            </div>

            {/* Failed */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-sm font-medium text-gray-600 mb-2">Failed</div>
              <div className="text-3xl font-bold text-red-600">
                {queueData?.failed || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">Need attention</div>
            </div>
          </div>

          {/* Total Queue Depth */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Queue Depth</span>
              <span className="text-2xl font-bold text-gray-900">
                {queueData?.total || 0}
              </span>
            </div>

            {/* Visual Progress */}
            <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
              {queueData && queueData.total > 0 && (
                <>
                  <div
                    className="absolute h-full bg-blue-500"
                    style={{
                      width: `${(queueData.waiting / queueData.total) * 100}%`,
                      left: 0
                    }}
                  />
                  <div
                    className="absolute h-full bg-green-500"
                    style={{
                      width: `${(queueData.active / queueData.total) * 100}%`,
                      left: `${(queueData.waiting / queueData.total) * 100}%`
                    }}
                  />
                  <div
                    className="absolute h-full bg-yellow-500"
                    style={{
                      width: `${(queueData.delayed / queueData.total) * 100}%`,
                      left: `${((queueData.waiting + queueData.active) / queueData.total) * 100}%`
                    }}
                  />
                </>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Waiting</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Active</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span>Delayed</span>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {healthStatus !== 'healthy' && (
            <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                  healthStatus === 'critical' ? 'text-red-600' : 'text-yellow-600'
                }`} />
                <div>
                  <div className="font-semibold text-gray-900">
                    {healthStatus === 'critical' ? 'Critical Queue Backup' : 'Queue Warning'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {queueData && queueData.waiting > 100 && (
                      <div>• {queueData.waiting} jobs waiting (threshold: 100)</div>
                    )}
                    {queueData && queueData.failed > 10 && (
                      <div>• {queueData.failed} failed jobs (threshold: 10)</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
