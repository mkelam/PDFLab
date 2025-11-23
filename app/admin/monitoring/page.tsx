/**
 * Admin Monitoring Dashboard
 *
 * Custom monitoring solution using Prometheus metrics and Sentry
 */

'use client'

import { useEffect, useState } from 'react'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { ConversionFunnelChart } from '@/components/dashboard/ConversionFunnelChart'
import { SLODashboard } from '@/components/dashboard/SLODashboard'
import { QueueMonitor } from '@/components/dashboard/QueueMonitor'
import {
  prometheusClient,
  getErrorRateByEndpoint,
  getResponseTimePercentiles
} from '@/lib/prometheus-client'
import { Activity, TrendingUp, AlertCircle, Clock } from 'lucide-react'

export default function MonitoringDashboard() {
  const [metrics, setMetrics] = useState({
    totalConversions: 0,
    errorRate: 0,
    avgResponseTime: 0,
    queueDepth: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMetrics()
    const interval = setInterval(loadMetrics, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  async function loadMetrics() {
    try {
      setLoading(true)

      // Load key metrics in parallel
      const [conversions, errorRate, responseTime, queueDepth] = await Promise.all([
        prometheusClient.getRate('pdflab_conversion_success_total', '5m'),
        prometheusClient.getCurrentValue('pdflab_error_rate_slo_percentage', { time_window: '1h' }),
        prometheusClient.getQuantile('pdflab_response_time_percentile', 0.95, '5m'),
        prometheusClient.getCurrentValue('pdflab_queue_depth', { queue_name: 'conversion', state: 'waiting' })
      ])

      setMetrics({
        totalConversions: conversions || 0,
        errorRate: errorRate || 0,
        avgResponseTime: responseTime || 0,
        queueDepth: queueDepth || 0
      })
    } catch (error) {
      console.error('Failed to load metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">System Monitoring</h1>
        <p className="text-gray-600">
          Real-time monitoring dashboard powered by Prometheus and Sentry
        </p>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Conversions (5m rate)"
          value={metrics.totalConversions.toFixed(2)}
          unit="/sec"
          status="success"
          loading={loading}
          description="Current conversion throughput"
        />

        <MetricCard
          title="Error Rate (1h)"
          value={metrics.errorRate.toFixed(3)}
          unit="%"
          status={metrics.errorRate > 0.1 ? 'error' : metrics.errorRate > 0.05 ? 'warning' : 'success'}
          loading={loading}
          description="Target: < 0.1%"
        />

        <MetricCard
          title="Response Time (p95)"
          value={metrics.avgResponseTime.toFixed(0)}
          unit="ms"
          status={metrics.avgResponseTime > 200 ? 'warning' : 'success'}
          loading={loading}
          description="95th percentile response time"
        />

        <MetricCard
          title="Queue Depth"
          value={metrics.queueDepth}
          unit="jobs"
          status={
            metrics.queueDepth > 500 ? 'error' :
            metrics.queueDepth > 100 ? 'warning' : 'success'
          }
          loading={loading}
          description="Jobs waiting in queue"
        />
      </div>

      {/* Queue Monitor */}
      <div className="mb-8">
        <QueueMonitor />
      </div>

      {/* SLO Dashboard */}
      <div className="mb-8">
        <SLODashboard />
      </div>

      {/* Conversion Funnel */}
      <div className="mb-8">
        <ConversionFunnelChart />
      </div>

      {/* Error Rate by Endpoint */}
      <ErrorRateTable />

      {/* Links to External Tools */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Prometheus</h3>
          <p className="text-sm text-gray-600 mb-4">
            Query and explore raw metrics data
          </p>
          <a
            href={process.env.NEXT_PUBLIC_PROMETHEUS_URL || 'http://localhost:9090'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
          >
            <Activity className="w-4 h-4" />
            Open Prometheus
          </a>
        </div>

        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Sentry</h3>
          <p className="text-sm text-gray-600 mb-4">
            View error tracking and performance monitoring
          </p>
          <a
            href={process.env.NEXT_PUBLIC_SENTRY_DSN ? 'https://sentry.io' : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <AlertCircle className="w-4 h-4" />
            Open Sentry
          </a>
        </div>
      </div>
    </div>
  )
}

/**
 * Error Rate Table Component
 */
function ErrorRateTable() {
  const [errorData, setErrorData] = useState<Array<{ label: string; value: number }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 60000) // Refresh every 60s
    return () => clearInterval(interval)
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const data = await getErrorRateByEndpoint()
      // Sort by value descending and take top 10
      const sorted = data.sort((a, b) => b.value - a.value).slice(0, 10)
      setErrorData(sorted)
    } catch (error) {
      console.error('Failed to load error data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Error Rate by Endpoint</h2>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 animate-pulse rounded"></div>
          ))}
        </div>
      ) : errorData.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No errors detected - system healthy!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Endpoint
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  Error Count
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {errorData.map((row, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-mono text-gray-900">
                    {row.label}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-900">
                    {row.value.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      row.value > 10 ? 'bg-red-100 text-red-800' :
                      row.value > 5 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {row.value > 10 ? 'Critical' : row.value > 5 ? 'Warning' : 'Normal'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
