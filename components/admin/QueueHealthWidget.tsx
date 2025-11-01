'use client'

import React, { useState, useEffect } from 'react'
import { Activity, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { AdminButton } from './AdminButton'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

interface QueueStatus {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: boolean
  processing_rate: number
  health_status: 'healthy' | 'warning' | 'critical'
}

export function QueueHealthWidget() {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    fetchQueueStatus()
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchQueueStatus, 10000) // Refresh every 10s
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const fetchQueueStatus = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/queue/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setQueueStatus(data.queue)
      }
    } catch (error) {
      console.error('Failed to fetch queue status:', error)
    } finally {
      setLoading(false)
    }
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400'
      case 'warning':
        return 'text-yellow-400'
      case 'critical':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle size={20} className="text-green-400" />
      case 'warning':
        return <AlertCircle size={20} className="text-yellow-400" />
      case 'critical':
        return <XCircle size={20} className="text-red-400" />
      default:
        return <Activity size={20} className="text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="bg-[oklch(0.18_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Queue Health</h2>
        <p className="text-[oklch(0.60_0.01_250)]">Loading queue status...</p>
      </div>
    )
  }

  if (!queueStatus) {
    return null
  }

  return (
    <div className="bg-[oklch(0.18_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">Queue Health</h2>
          <div className="flex items-center gap-2">
            {getHealthStatusIcon(queueStatus.health_status)}
            <span className={`text-sm font-semibold ${getHealthStatusColor(queueStatus.health_status)}`}>
              {queueStatus.health_status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-[oklch(0.60_0.01_250)]">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded border-[oklch(0.25_0.01_250)] bg-[oklch(0.15_0.01_250)] text-[oklch(0.65_0.20_270)] focus:ring-2 focus:ring-[oklch(0.65_0.20_270)]"
            />
            Auto-refresh
          </label>
          <AdminButton variant="ghost" size="sm" onClick={fetchQueueStatus}>
            <RefreshCw size={16} />
          </AdminButton>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Waiting */}
        <div className="p-4 bg-[oklch(0.15_0.01_250)] rounded-lg border border-[oklch(0.25_0.01_250)]">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} className="text-yellow-400" />
            <p className="text-sm text-[oklch(0.60_0.01_250)]">Waiting</p>
          </div>
          <p className="text-2xl font-bold text-white">{queueStatus.waiting}</p>
        </div>

        {/* Active */}
        <div className="p-4 bg-[oklch(0.15_0.01_250)] rounded-lg border border-[oklch(0.25_0.01_250)]">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={18} className="text-blue-400" />
            <p className="text-sm text-[oklch(0.60_0.01_250)]">Active</p>
          </div>
          <p className="text-2xl font-bold text-white">{queueStatus.active}</p>
        </div>

        {/* Completed */}
        <div className="p-4 bg-[oklch(0.15_0.01_250)] rounded-lg border border-[oklch(0.25_0.01_250)]">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-green-400" />
            <p className="text-sm text-[oklch(0.60_0.01_250)]">Completed</p>
          </div>
          <p className="text-2xl font-bold text-white">{queueStatus.completed}</p>
        </div>

        {/* Failed */}
        <div className="p-4 bg-[oklch(0.15_0.01_250)] rounded-lg border border-[oklch(0.25_0.01_250)]">
          <div className="flex items-center gap-2 mb-2">
            <XCircle size={18} className="text-red-400" />
            <p className="text-sm text-[oklch(0.60_0.01_250)]">Failed</p>
          </div>
          <p className="text-2xl font-bold text-white">{queueStatus.failed}</p>
        </div>

        {/* Delayed */}
        <div className="p-4 bg-[oklch(0.15_0.01_250)] rounded-lg border border-[oklch(0.25_0.01_250)]">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={18} className="text-orange-400" />
            <p className="text-sm text-[oklch(0.60_0.01_250)]">Delayed</p>
          </div>
          <p className="text-2xl font-bold text-white">{queueStatus.delayed}</p>
        </div>

        {/* Processing Rate */}
        <div className="p-4 bg-[oklch(0.15_0.01_250)] rounded-lg border border-[oklch(0.25_0.01_250)]">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw size={18} className="text-purple-400" />
            <p className="text-sm text-[oklch(0.60_0.01_250)]">Rate/min</p>
          </div>
          <p className="text-2xl font-bold text-white">{queueStatus.processing_rate.toFixed(1)}</p>
        </div>
      </div>

      {queueStatus.paused && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
          <p className="text-yellow-400 text-sm font-medium">⚠️ Queue is currently paused</p>
        </div>
      )}
    </div>
  )
}
