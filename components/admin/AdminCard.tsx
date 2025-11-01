import React from 'react'

interface AdminCardProps {
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
  actions?: React.ReactNode
}

export function AdminCard({ children, className = '', title, description, actions }: AdminCardProps) {
  return (
    <div className={`bg-[oklch(0.18_0.01_250)] border border-[oklch(0.25_0.01_250)] rounded-lg ${className}`}>
      {(title || description || actions) && (
        <div className="flex items-center justify-between p-6 border-b border-[oklch(0.25_0.01_250)]">
          <div>
            {title && <h2 className="text-xl font-bold text-white mb-1">{title}</h2>}
            {description && <p className="text-sm text-[oklch(0.60_0.01_250)]">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}
