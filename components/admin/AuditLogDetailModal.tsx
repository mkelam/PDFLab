'use client'

import React, { useState, useEffect } from 'react'
import { X, Shield, AlertTriangle } from 'lucide-react'
import { AdminButton } from './AdminButton'
import { AdminBadge } from './AdminBadge'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

interface AuditLogDetailModalProps {
  logId: string
  isOpen: boolean
  onClose: () => void
}

interface AuditLogDetail {
  id: string
  admin_user_id: string
  action: string
  entity_type: string
  entity_id?: string
  changes?: any
  ip_address?: string
  user_agent?: string
  severity: string
  checksum?: string
  created_at: string
  adminUser?: {
    id: string
    email: string
    name?: string
    role: string
  }
}

export function AuditLogDetailModal({
  logId,
  isOpen,
  onClose
}: AuditLogDetailModalProps) {
  const [log, setLog] = useState<AuditLogDetail | null>(null)
  const [relatedLogs, setRelatedLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && logId) {
      fetchLogDetails()
    }
  }, [isOpen, logId])

  const fetchLogDetails = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_URL}/api/admin/audit-logs/${logId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setLog(data.log)
        setRelatedLogs(data.relatedLogs || [])
      }
    } catch (error) {
      console.error('Failed to fetch log details:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error'
      case 'warning': return 'warning'
      case 'info': return 'info'
      default: return 'default'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const exportLog = () => {
    if (!log) return

    const dataStr = JSON.stringify(log, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit_log_${log.id}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[oklch(0.18_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[oklch(0.25_0.01_250)]">
          <h2 className="text-2xl font-bold text-white">Audit Log Details</h2>
          <button
            onClick={onClose}
            className="text-[oklch(0.60_0.01_250)] hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-[oklch(0.60_0.01_250)]">
              Loading log details...
            </div>
          ) : !log ? (
            <div className="text-center py-12 text-[oklch(0.60_0.01_250)]">
              Log not found
            </div>
          ) : (
            <div className="space-y-6">
              {/* Log Information */}
              <div className="bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Log Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Timestamp</div>
                    <div className="text-white">{formatDate(log.created_at)}</div>
                  </div>

                  <div>
                    <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Severity</div>
                    <AdminBadge variant={getSeverityBadgeVariant(log.severity)}>
                      {log.severity}
                    </AdminBadge>
                  </div>

                  <div>
                    <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Admin User</div>
                    <div className="text-white">{log.adminUser?.email}</div>
                    <div className="text-sm text-[oklch(0.60_0.01_250)]">{log.adminUser?.role}</div>
                  </div>

                  <div>
                    <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Action</div>
                    <div className="text-white">{log.action}</div>
                  </div>

                  <div>
                    <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Entity Type</div>
                    <div className="text-white">{log.entity_type}</div>
                  </div>

                  {log.entity_id && (
                    <div>
                      <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">Entity ID</div>
                      <div className="text-white font-mono text-sm">{log.entity_id}</div>
                    </div>
                  )}

                  {log.ip_address && (
                    <div>
                      <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">IP Address</div>
                      <div className="text-white font-mono text-sm">{log.ip_address}</div>
                    </div>
                  )}

                  {log.user_agent && (
                    <div className="col-span-2">
                      <div className="text-sm text-[oklch(0.60_0.01_250)] mb-1">User Agent</div>
                      <div className="text-white text-sm break-all">{log.user_agent}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Changes */}
              {log.changes && (
                <div className="bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Changes Made</h3>
                  <pre className="bg-[oklch(0.12_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded p-4 overflow-x-auto">
                    <code className="text-sm text-[oklch(0.90_0.01_250)]">
                      {JSON.stringify(log.changes, null, 2)}
                    </code>
                  </pre>
                </div>
              )}

              {/* Related Logs */}
              {relatedLogs.length > 0 && (
                <div className="bg-[oklch(0.15_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Related Logs (Same Entity, Within 1 Hour)</h3>
                  <div className="space-y-2">
                    {relatedLogs.map((relatedLog) => (
                      <div key={relatedLog.id} className="flex justify-between items-center text-sm p-3 bg-[oklch(0.12_0.01_250)] rounded">
                        <div className="flex-1">
                          <span className="text-white">{relatedLog.action}</span>
                          <span className="text-[oklch(0.60_0.01_250)] ml-2">by {relatedLog.adminUser?.email}</span>
                        </div>
                        <span className="text-[oklch(0.60_0.01_250)] text-xs">
                          {formatDate(relatedLog.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security Flags */}
              {log.severity === 'critical' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={24} className="text-red-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold text-red-400 mb-2">Security Alert</h3>
                      <p className="text-sm text-white">
                        This log entry has been flagged as critical. It may indicate a security concern or important system event that requires attention.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-[oklch(0.25_0.01_250)]">
          <AdminButton variant="secondary" onClick={exportLog} disabled={!log}>
            Export as JSON
          </AdminButton>
          <AdminButton variant="secondary" onClick={onClose}>
            Close
          </AdminButton>
        </div>
      </div>
    </div>
  )
}
