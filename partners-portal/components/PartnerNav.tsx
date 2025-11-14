'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, TrendingUp, Home, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PartnerNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
            <Link
              href="/apply"
              className="text-foreground hover:text-primary transition-colors font-semibold"
            >
              Apply Now
            </Link>
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
            <Link
              href="/apply"
              className="block text-foreground hover:text-primary transition-colors font-semibold"
              onClick={() => setMobileMenuOpen(false)}
            >
              Apply Now
            </Link>
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
          </div>
        )}
      </div>
    </nav>
  )
}
