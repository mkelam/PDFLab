'use client'

import React, { useState, useEffect } from 'react'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileText, Presentation, FileSpreadsheet, Image, ArrowRight, ArrowLeft, Check, X } from 'lucide-react'

/**
 * QuickStartWizard Component
 *
 * 3-step modal wizard for first-time users
 * Step 1: Choose a sample template
 * Step 2: Select output format
 * Step 3: Confirmation and conversion
 */

interface QuickStartWizardProps {
  isOpen: boolean
  onClose: () => void
}

const QuickStartWizard: React.FC<QuickStartWizardProps> = ({ isOpen, onClose }) => {
  const { templates, updateProgress, convertTemplate, fetchTemplates } = useOnboarding()
  const [step, setStep] = useState(1)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const router = useRouter()

  // Fetch templates on mount
  useEffect(() => {
    if (isOpen && templates.length === 0) {
      fetchTemplates()
    }
  }, [isOpen])

  // Reset wizard when opened
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setSelectedTemplate(null)
      setSelectedFormat(null)
      setIsConverting(false)
    }
  }, [isOpen])

  // Format options with icons
  const formatOptions = [
    {
      value: 'pptx',
      label: 'PowerPoint',
      description: 'Editable slides',
      icon: Presentation,
      color: 'text-orange-500',
    },
    {
      value: 'docx',
      label: 'Word',
      description: 'Editable document',
      icon: FileText,
      color: 'text-blue-500',
    },
    {
      value: 'xlsx',
      label: 'Excel',
      description: 'Editable spreadsheet',
      icon: FileSpreadsheet,
      color: 'text-green-500',
    },
    {
      value: 'png',
      label: 'Image',
      description: 'High-quality PNG',
      icon: Image,
      color: 'text-purple-500',
    },
  ]

  // Get selected template object
  const selectedTemplateObj = templates.find((t) => t.id === selectedTemplate)

  // Get selected format object
  const selectedFormatObj = formatOptions.find((f) => f.value === selectedFormat)

  // Handle next step
  const handleNext = async () => {
    if (step < 3) {
      await updateProgress({ wizard_last_step: step })
      setStep(step + 1)
    }
  }

  // Handle back step
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  // Handle finish and convert
  const handleFinish = async () => {
    if (!selectedTemplate || !selectedFormat) return

    setIsConverting(true)

    try {
      // Mark wizard as completed
      await updateProgress({ wizard_completed: true })

      // Start conversion
      const { job_id } = await convertTemplate(selectedTemplate, selectedFormat)

      // Close wizard
      onClose()

      // Redirect to dashboard with highlight
      router.push(`/dashboard?highlight=${job_id}`)
    } catch (error) {
      console.error('Failed to convert template:', error)
      alert(error instanceof Error ? error.message : 'Failed to convert template')
      setIsConverting(false)
    }
  }

  // Handle skip wizard
  const handleSkip = async () => {
    await updateProgress({ wizard_completed: false })
    onClose()
  }

  // Progress bar width
  const progressWidth = `${(step / 3) * 100}%`

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Quick Start Wizard</DialogTitle>
          <p className="text-muted-foreground">
            Let's convert your first PDF in 3 easy steps
          </p>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="font-medium">
              Step {step} of 3
            </span>
            <span className="text-muted-foreground">{Math.round((step / 3) * 100)}% Complete</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: progressWidth }}
            ></div>
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {/* Step 1: Choose Template */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold mb-2">Choose a Sample Template</h3>
                <p className="text-muted-foreground">
                  Select one of our sample PDFs to get started
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedTemplate === template.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-3xl">{template.category === 'invoice' ? '📄' : template.category === 'report' ? '📊' : '📽️'}</div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{template.name}</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {template.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{template.formatted_file_size}</span>
                          <span>•</span>
                          <span>{template.category_display}</span>
                        </div>
                      </div>
                      {selectedTemplate === template.id && (
                        <Check className="h-6 w-6 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Choose Format */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold mb-2">Choose Output Format</h3>
                <p className="text-muted-foreground">
                  What format do you want to convert to?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {formatOptions.map((format) => {
                  const Icon = format.icon
                  return (
                    <button
                      key={format.value}
                      onClick={() => setSelectedFormat(format.value)}
                      className={`p-6 rounded-lg border-2 text-center transition-all ${
                        selectedFormat === format.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Icon className={`h-12 w-12 mx-auto mb-3 ${format.color}`} />
                      <h4 className="font-semibold mb-1">{format.label}</h4>
                      <p className="text-sm text-muted-foreground">{format.description}</p>
                      {selectedFormat === format.value && (
                        <div className="mt-3">
                          <Check className="h-5 w-5 text-primary mx-auto" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Recommended Format Hint */}
              {selectedTemplateObj && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
                  <p className="text-sm">
                    ⭐ <strong>Recommended:</strong> {selectedTemplateObj.recommended_format.toUpperCase()} works best with {selectedTemplateObj.name}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold mb-2">Ready to Convert!</h3>
                <p className="text-muted-foreground">
                  Review your selections and start the conversion
                </p>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <FileText className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">Template</h4>
                    <p className="text-muted-foreground">{selectedTemplateObj?.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedTemplateObj?.formatted_file_size}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-start gap-4">
                    {selectedFormatObj && (
                      <>
                        <selectedFormatObj.icon className={`h-6 w-6 flex-shrink-0 mt-1 ${selectedFormatObj.color}`} />
                        <div>
                          <h4 className="font-semibold mb-1">Output Format</h4>
                          <p className="text-muted-foreground">{selectedFormatObj.label}</p>
                          <p className="text-sm text-muted-foreground">{selectedFormatObj.description}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* What Happens Next */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold mb-2 text-blue-900">What happens next?</h4>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>We'll convert your PDF in the background (usually takes 10-30 seconds)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>You'll be redirected to your dashboard to download the result</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>The converted file will be available for 7 days</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t">
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isConverting}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-2" />
            Skip Wizard
          </Button>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack} disabled={isConverting}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}

            {step < 3 ? (
              <Button
                onClick={handleNext}
                disabled={
                  (step === 1 && !selectedTemplate) || (step === 2 && !selectedFormat)
                }
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={isConverting} className="min-w-[140px]">
                {isConverting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Converting...
                  </>
                ) : (
                  <>
                    Start Conversion
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default QuickStartWizard
