"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload } from "lucide-react"
import { Navigation } from "@/components/Navigation"
import { PDFUpload } from "@/components/PDFUpload"
import { UnifiedConversionInterface } from "@/components/UnifiedConversionInterface"
import { TestimonialsCarousel } from "@/components/TestimonialsCarousel"

export default function pdflabPro() {
  const [uploadResult, setUploadResult] = useState(null)
  const [uploadError, setUploadError] = useState("")

  const handleUploadSuccess = (result) => {
    setUploadResult(result)
    setUploadError("")
  }

  const handleUploadError = (error) => {
    setUploadError(error)
    setUploadResult(null)
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <section className="pt-24 pb-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="font-bold text-3xl md:text-4xl mb-3 leading-tight">
            Convert PDFs to Office Files in Seconds
          </h1>

          {/* Trust info - minimal */}
          <div className="mb-12">
            <p className="text-base text-primary">
              Files deleted after 1 hour • Bank-grade encryption
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

      <footer className="border-t border-border/30 py-6 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-sm text-muted-foreground">© 2024 PDFLab.Pro. All rights reserved.</div>
        </div>
      </footer>

    </div>
  )
}
