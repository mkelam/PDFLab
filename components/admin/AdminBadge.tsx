import React from 'react'

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default'

interface AdminBadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  default: 'bg-[oklch(0.25_0.01_250)] text-[oklch(0.60_0.01_250)] border-[oklch(0.30_0.01_250)]'
}

export function AdminBadge({ children, variant = 'default', className = '' }: AdminBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  )
}
