import React from 'react'
import { Inbox } from 'lucide-react'

interface AdminEmptyStateProps {
  title?: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
}

export function AdminEmptyState({
  title = 'No data found',
  description = 'There is no data to display at the moment.',
  icon,
  action
}: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-[oklch(0.25_0.01_250)] flex items-center justify-center mb-4 text-[oklch(0.60_0.01_250)]">
        {icon || <Inbox size={32} />}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-[oklch(0.60_0.01_250)] mb-6 max-w-sm">{description}</p>
      {action && <div>{action}</div>}
    </div>
  )
}
