'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  Activity,
  BarChart3,
  Shield,
  LogOut
} from 'lucide-react'

interface NavItemProps {
  href: string
  icon: React.ReactNode
  label: string
  active?: boolean
}

function NavItem({ href, icon, label, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
        ${active
          ? 'bg-[oklch(0.65_0.20_270)] text-white'
          : 'text-[oklch(0.60_0.01_250)] hover:bg-[oklch(0.18_0.01_250)] hover:text-white'
        }
      `}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  )
}

export function AdminNav() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const navItems = [
    { href: '/admin', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { href: '/admin/users', icon: <Users size={20} />, label: 'Users' },
    { href: '/admin/conversions', icon: <FileText size={20} />, label: 'Conversions' },
    { href: '/admin/payments', icon: <CreditCard size={20} />, label: 'Payments' },
    { href: '/admin/system', icon: <Activity size={20} />, label: 'System Health' },
    { href: '/admin/analytics', icon: <BarChart3 size={20} />, label: 'Analytics' },
    { href: '/admin/audit-logs', icon: <Shield size={20} />, label: 'Audit Logs' }
  ]

  return (
    <>
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-[oklch(0.18_0.01_250)] border-b border-[oklch(0.25_0.01_250)] z-50">
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[oklch(0.65_0.20_270)] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">PL</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">PDFLab Admin</h1>
              <p className="text-xs text-[oklch(0.60_0.01_250)]">Administration Panel</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user?.name || user?.email}</p>
              <p className="text-xs text-[oklch(0.60_0.01_250)] capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-[oklch(0.25_0.01_250)] text-[oklch(0.60_0.01_250)] hover:text-white transition"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="fixed left-0 top-16 bottom-0 w-64 bg-[oklch(0.18_0.01_250)] border-r border-[oklch(0.25_0.01_250)] overflow-y-auto">
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[oklch(0.25_0.01_250)] bg-[oklch(0.15_0.01_250)]">
          <p className="text-xs text-[oklch(0.60_0.01_250)] text-center">
            PDFLab Admin v1.0.0
          </p>
        </div>
      </div>
    </>
  )
}
