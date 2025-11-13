'use client'

import React, { useState, useEffect } from 'react'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useRouter } from 'next/navigation'
import { FileText, Download, TrendingUp, Sparkles } from 'lucide-react'

/**
 * SampleTemplates Component
 *
 * Displays 3 sample PDF templates for users to try
 * Allows one-click conversion with recommended format
 * Tracks usage in onboarding progress
 */

const SampleTemplates: React.FC = () => {
  const { templates, convertTemplate, fetchTemplates } = useOnboarding()
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [conversionSuccess, setConversionSuccess] = useState<string | null>(null)
  const router = useRouter()

  // Fetch templates on mount
  useEffect(() => {
    if (templates.length === 0) {
      fetchTemplates()
    }
  }, [])

  // Handle template conversion
  const handleConvert = async (templateId: string, format: string, templateName: string) => {
    setConvertingId(templateId)
    setConversionSuccess(null)

    try {
      const { job_id } = await convertTemplate(templateId, format)

      // Show success message
      setConversionSuccess(templateId)

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push(`/dashboard?highlight=${job_id}`)
      }, 2000)
    } catch (error) {
      console.error('Failed to convert template:', error)
      alert(error instanceof Error ? error.message : 'Failed to convert template')
    } finally {
      setConvertingId(null)
    }
  }

  // Get icon for category
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'invoice':
        return '📄'
      case 'report':
        return '📊'
      case 'presentation':
        return '📽️'
      default:
        return '📁'
    }
  }

  // Get format display name
  const getFormatDisplay = (format: string) => {
    const formats: Record<string, string> = {
      pptx: 'PowerPoint',
      docx: 'Word',
      xlsx: 'Excel',
      png: 'Image',
    }
    return formats[format] || format.toUpperCase()
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading sample templates...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">Try a Sample Template</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">See PDFLab in Action</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Choose a sample template below and convert it instantly. No upload needed!
        </p>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {templates.map((template) => {
          const isConverting = convertingId === template.id
          const isSuccess = conversionSuccess === template.id

          return (
            <div
              key={template.id}
              className={`glass-strong p-6 rounded-xl border transition-all duration-300 ${
                isSuccess
                  ? 'border-green-500 bg-green-50/50'
                  : 'border-border hover:border-primary/50 hover:shadow-lg'
              }`}
            >
              {/* Category Icon */}
              <div className="text-4xl mb-4">{getCategoryIcon(template.category)}</div>

              {/* Template Name */}
              <h3 className="text-lg font-semibold mb-2">{template.name}</h3>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{template.description}</p>

              {/* Metadata */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  <span>{template.formatted_file_size}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>{template.usage_count} uses</span>
                </div>
              </div>

              {/* Recommended Format Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                ⭐ Recommended: {getFormatDisplay(template.recommended_format)}
              </div>

              {/* Convert Button */}
              {isSuccess ? (
                <div className="bg-green-500 text-white py-3 px-4 rounded-lg text-center font-medium">
                  ✓ Converting! Redirecting to dashboard...
                </div>
              ) : (
                <button
                  onClick={() =>
                    handleConvert(template.id, template.recommended_format, template.name)
                  }
                  disabled={isConverting}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                    isConverting
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-primary/90 hover:shadow-lg'
                  }`}
                >
                  {isConverting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Converting...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Download className="h-4 w-4" />
                      Try This Template
                    </span>
                  )}
                </button>
              )}

              {/* Additional Info */}
              <p className="text-xs text-muted-foreground text-center mt-3">
                Free - No upload required
              </p>
            </div>
          )
        })}
      </div>

      {/* Help Text */}
      <div className="text-center text-sm text-muted-foreground">
        <p>
          These conversions count toward your plan limit.{' '}
          <a href="/pricing" className="text-primary hover:underline">
            Need more?
          </a>
        </p>
      </div>
    </div>
  )
}

export default SampleTemplates
