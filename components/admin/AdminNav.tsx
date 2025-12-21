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
  Sparkles,
  MessageSquare,
  UsersRound,
  UserPlus,
  LogOut,
  Search
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
          ? 'bg-primary text-white'
          : 'text-muted-foreground hover:bg-white/10 hover:text-foreground'
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
    { href: '/admin/partners', icon: <UsersRound size={20} />, label: 'Partners' },
    { href: '/admin/partner-applications', icon: <UserPlus size={20} />, label: 'Partner Applications' },
    { href: '/admin/beta-users', icon: <Sparkles size={20} />, label: 'Beta Users' },
    { href: '/admin/beta', icon: <Sparkles size={20} />, label: 'Beta Applications' },
    { href: '/admin/feedback', icon: <MessageSquare size={20} />, label: 'Feedback' },
    { href: '/admin/conversions', icon: <FileText size={20} />, label: 'Conversions' },
    { href: '/admin/payments', icon: <CreditCard size={20} />, label: 'Payments' },
    { href: '/admin/system', icon: <Activity size={20} />, label: 'System Health' },
    { href: '/admin/analytics', icon: <BarChart3 size={20} />, label: 'Analytics' },
    { href: '/admin/audit-logs', icon: <Shield size={20} />, label: 'Audit Logs' },
    { href: '/admin/pdf-tracker', icon: <Search size={20} />, label: 'PDF Tracker' }
  ]

  return (
    <>
      {/* Top Bar with glassmorphism */}
      <div className="fixed top-0 left-0 right-0 h-16 glass-nav backdrop-blur-xl z-50">
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">PL</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">PDFLab Admin</h1>
              <p className="text-xs text-muted-foreground">Administration Panel</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{user?.name || user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar with glassmorphism */}
      <div className="fixed left-0 top-16 bottom-0 w-64 glass backdrop-blur-xl border-r border-white/15 overflow-y-auto">
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
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/15 bg-black/30">
          <p className="text-xs text-muted-foreground text-center">
            PDFLab Admin v1.0.0
          </p>
        </div>
      </div>
    </>
  )
}
