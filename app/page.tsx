"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, Sparkles } from "lucide-react"
import { Navigation } from "@/components/Navigation"
import { PDFUpload } from "@/components/PDFUpload"
import { UnifiedConversionInterface } from "@/components/UnifiedConversionInterface"
import { TestimonialsCarousel } from "@/components/TestimonialsCarousel"
import ProductTour from "@/components/onboarding/ProductTour"
import { useOnboarding } from "@/contexts/OnboardingContext"

export default function pdflabPro() {
  const [uploadResult, setUploadResult] = useState(null)
  const [uploadError, setUploadError] = useState("")
  const { shouldShowOnboarding } = useOnboarding()

  const handleUploadSuccess = (result: any) => {
    setUploadResult(result)
    setUploadError("")
  }

  const handleUploadError = (error: string) => {
    setUploadError(error)
    setUploadResult(null)
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Product Tour for New Users */}
      {shouldShowOnboarding() && <ProductTour />}

      {/* Founders 100 Banner */}
      <div className="pt-20 pb-1 px-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/beta">
            <Card className="glass-strong border border-primary/50 hover:border-primary transition-all duration-300 hover:scale-[1.01] cursor-pointer">
              <CardContent className="py-2 px-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                    <span className="font-semibold text-sm">🚀 Founders 100 - Join Our Exclusive Early Adopter Program!</span>
                  </div>
                  <Button size="sm" className="h-7 px-3 text-xs">
                    Apply →
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      <section className="pt-8 pb-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="font-bold text-3xl md:text-4xl mb-3 leading-tight">
            Convert PDFs to Office Files in Seconds
          </h1>

          {/* Trust info - minimal */}
          <div className="mb-12">
            <p className="text-base text-primary">
              🔒 Bank-grade security • Files auto-deleted in 24 hours • Zero data retention (storage is expensive guys)
            </p>
          </div>

          {/* Unified Conversion Interface */}
          <div className="mb-16">
            <UnifiedConversionInterface
              onSuccess={handleUploadSuccess}
              onError={handleUploadError}
            />
          </div>

          {/* Client Testimonials Carousel */}
          <div className="w-full">
            <TestimonialsCarousel />
          </div>

        </div>
      </section>

      <footer className="border-t border-border/30 py-8 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-6 mb-6">
            <Link
              href="/security"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Bank-Grade Security
            </Link>
            <Link
              href="/privacy"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              GDPR Compliant
            </Link>
            <Link
              href="/security"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Files Deleted in 24hrs
            </Link>
            <Link
              href="/security"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Zero Data Retention (storage is expensive guys)
            </Link>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-4 mb-4 text-sm">
            <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <Link href="/security" className="text-muted-foreground hover:text-primary transition-colors">
              Security
            </Link>
            <Link href="/features" className="text-muted-foreground hover:text-primary transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-primary transition-colors">
              Pricing
            </Link>
          </div>

          {/* Copyright */}
          <div className="text-center">
            <div className="text-sm text-muted-foreground">© 2024 PDFLab.Pro. All rights reserved.</div>
          </div>
        </div>
      </footer>

    </div>
  )
}
