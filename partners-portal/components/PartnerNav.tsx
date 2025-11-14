'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, TrendingUp, Home, LogOut, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePartnerAuth } from '@/contexts/PartnerAuthContext'

export default function PartnerNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { partner, logout } = usePartnerAuth()

  return (
    <nav className="glass-nav sticky top-0 z-50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <TrendingUp className="w-8 h-8 text-primary" />
            <div>
              <span className="text-xl font-bold text-gradient-primary">PDFLab</span>
              <span className="text-sm text-muted-foreground ml-2">Partners</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-foreground hover:text-primary transition-colors flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
            {!partner && (
              <Link
                href="/apply"
                className="text-foreground hover:text-primary transition-colors font-semibold"
              >
                Apply Now
              </Link>
            )}
            {partner && (
              <Link
                href={`/${partner.slug}`}
                className="text-foreground hover:text-primary transition-colors font-semibold"
              >
                Dashboard
              </Link>
            )}
            <Link
              href="https://pdflab.pro"
              target="_blank"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Main Site
            </Link>
            <Link
              href="https://pdflab.pro/pricing"
              target="_blank"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            {partner ? (
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            ) : (
              <Link href="/login">
                <Button
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Partner Login
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-4 border-t border-border/50">
            <Link
              href="/"
              className="block text-foreground hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            {!partner && (
              <Link
                href="/apply"
                className="block text-foreground hover:text-primary transition-colors font-semibold"
                onClick={() => setMobileMenuOpen(false)}
              >
                Apply Now
              </Link>
            )}
            {partner && (
              <Link
                href={`/${partner.slug}`}
                className="block text-foreground hover:text-primary transition-colors font-semibold"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
            )}
            <Link
              href="https://pdflab.pro"
              target="_blank"
              className="block text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Main Site
            </Link>
            <Link
              href="https://pdflab.pro/pricing"
              target="_blank"
              className="block text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            {partner ? (
              <Button
                onClick={() => {
                  logout()
                  setMobileMenuOpen(false)
                }}
                variant="outline"
                size="sm"
                className="w-full flex items-center gap-2 justify-center"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            ) : (
              <Link href="/login" className="block" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full flex items-center gap-2 justify-center"
                >
                  <LogIn className="w-4 h-4" />
                  Partner Login
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
