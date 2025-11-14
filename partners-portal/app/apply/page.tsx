'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft, ArrowRight } from 'lucide-react'

const PLATFORMS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'blog', label: 'Blog/Website' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'other', label: 'Other' }
]

const AUDIENCE_SIZES = [
  { value: 'under_1k', label: 'Under 1,000' },
  { value: '1k_10k', label: '1,000 - 10,000' },
  { value: '10k_50k', label: '10,000 - 50,000' },
  { value: '50k_100k', label: '50,000 - 100,000' },
  { value: '100k_500k', label: '100,000 - 500,000' },
  { value: '500k_plus', label: '500,000+' }
]

const NICHES = [
  'SaaS Founders',
  'Students',
  'Marketers',
  'Designers',
  'Developers',
  'Content Creators',
  'Business Professionals',
  'Other'
]

const PROMOTION_METHODS = [
  { id: 'tutorial', label: 'Tutorial Videos' },
  { id: 'social', label: 'Social Media Posts' },
  { id: 'blog', label: 'Blog Reviews' },
  { id: 'newsletter', label: 'Email Newsletter' },
  { id: 'course', label: 'Course/Community Integration' },
  { id: 'other', label: 'Other' }
]

const ESTIMATED_CONVERSIONS = [
  { value: '1_10', label: '1-10 conversions/month' },
  { value: '10_50', label: '10-50 conversions/month' },
  { value: '50_100', label: '50-100 conversions/month' },
  { value: '100_plus', label: '100+ conversions/month' }
]

export default function ApplyPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    brand_name: '',
    country: '',
    primary_platform: '',
    audience_size: '',
    audience_niche: '',
    platform_url: '',
    why_pdflab: '',
    promotion_methods: [] as string[],
    content_idea: '',
    estimated_conversions: '',
    previous_affiliates: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) newErrors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address'
    }

    if (!formData.full_name) newErrors.full_name = 'Full name is required'
    if (!formData.primary_platform) newErrors.primary_platform = 'Platform is required'
    if (!formData.audience_size) newErrors.audience_size = 'Audience size is required'
    if (!formData.audience_niche) newErrors.audience_niche = 'Audience niche is required'
    if (!formData.platform_url) newErrors.platform_url = 'Platform URL is required'
    // No URL format validation - accepts any text (username, handle, or URL)

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {}

    // All Step 2 fields are now optional - no validation required

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (step === 2 && validateStep2()) {
      setStep(3)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBack = () => {
    setStep(step - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateStep2()) return

    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'
      const response = await fetch(`${apiUrl}/api/partner-applications/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setSubmitStatus('success')
        setTimeout(() => {
          router.push('/?application=success')
        }, 3000)
      } else {
        setSubmitStatus('error')
        setErrorMessage(data.error || 'Failed to submit application')
      }
    } catch (error) {
      setSubmitStatus('error')
      setErrorMessage('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const togglePromotionMethod = (methodId: string) => {
    if (formData.promotion_methods.includes(methodId)) {
      setFormData({
        ...formData,
        promotion_methods: formData.promotion_methods.filter(m => m !== methodId)
      })
    } else {
      setFormData({
        ...formData,
        promotion_methods: [...formData.promotion_methods, methodId]
      })
    }
  }

  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="glass-strong max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Application Submitted!</h2>
            <p className="text-muted-foreground mb-4">
              Thank you for applying to the PDFLab Partner Program. We'll review your application and get back to you within 2-3 business days.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to homepage...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Apply to <span className="text-gradient-primary">PDFLab Partners</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Join our partner program and earn up to 50% commission on every referral
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8 gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                s === step
                  ? 'bg-primary text-primary-foreground'
                  : s < step
                    ? 'bg-primary/50 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {s}
              </div>
              {s < 3 && (
                <div className={`w-12 h-1 ${s < step ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Basic Info & Audience */}
          {step === 1 && (
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle className="text-foreground">Step 1: Your Platform & Audience</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Tell us about your platform and audience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-foreground">Full Name *</Label>
                    <Input
                      id="full_name"
                      placeholder="John Doe"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className={errors.full_name ? 'border-red-500' : ''}
                    />
                    {errors.full_name && <p className="text-sm text-red-500">{errors.full_name}</p>}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="brand_name" className="text-foreground">Brand/Company Name (Optional)</Label>
                    <Input
                      id="brand_name"
                      placeholder="My Brand"
                      value={formData.brand_name}
                      onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-foreground">Country (Optional)</Label>
                    <Input
                      id="country"
                      placeholder="United States"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="primary_platform" className="text-foreground">Primary Platform *</Label>
                    <Select value={formData.primary_platform} onValueChange={(value) => setFormData({ ...formData, primary_platform: value })}>
                      <SelectTrigger className={errors.primary_platform ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORMS.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.primary_platform && <p className="text-sm text-red-500">{errors.primary_platform}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="audience_size" className="text-foreground">Audience Size *</Label>
                    <Select value={formData.audience_size} onValueChange={(value) => setFormData({ ...formData, audience_size: value })}>
                      <SelectTrigger className={errors.audience_size ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {AUDIENCE_SIZES.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.audience_size && <p className="text-sm text-red-500">{errors.audience_size}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audience_niche" className="text-foreground">Audience Niche *</Label>
                  <Select value={formData.audience_niche} onValueChange={(value) => setFormData({ ...formData, audience_niche: value })}>
                    <SelectTrigger className={errors.audience_niche ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select niche" />
                    </SelectTrigger>
                    <SelectContent>
                      {NICHES.map(n => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.audience_niche && <p className="text-sm text-red-500">{errors.audience_niche}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="platform_url" className="text-foreground">Platform URL/Username *</Label>
                  <Input
                    id="platform_url"
                    type="text"
                    placeholder="@yourchannel or https://youtube.com/@yourchannel"
                    value={formData.platform_url}
                    onChange={(e) => setFormData({ ...formData, platform_url: e.target.value })}
                    className={errors.platform_url ? 'border-red-500' : ''}
                  />
                  <p className="text-sm text-muted-foreground">Share your platform URL, username, or handle</p>
                  {errors.platform_url && <p className="text-sm text-red-500">{errors.platform_url}</p>}
                </div>

                <div className="flex justify-end">
                  <Button type="button" onClick={handleNext} className="gap-2">
                    Next Step <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Promotion Strategy */}
          {step === 2 && (
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle className="text-foreground">Step 2: Your Promotion Strategy</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Tell us about your promotion plans (all fields optional)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="why_pdflab" className="text-foreground">
                    Why do you want to partner with PDFLab? (Optional)
                  </Label>
                  <Textarea
                    id="why_pdflab"
                    placeholder="Tell us why PDFLab is a good fit for your audience and how you plan to promote it..."
                    rows={5}
                    value={formData.why_pdflab}
                    onChange={(e) => setFormData({ ...formData, why_pdflab: e.target.value })}
                    className={errors.why_pdflab ? 'border-red-500' : ''}
                  />
                  <p className="text-sm text-muted-foreground">
                    {formData.why_pdflab.length} characters
                  </p>
                  {errors.why_pdflab && <p className="text-sm text-red-500">{errors.why_pdflab}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">How will you promote PDFLab? (Optional - Select all that apply)</Label>
                  <div className="grid md:grid-cols-2 gap-3">
                    {PROMOTION_METHODS.map(method => (
                      <div key={method.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={method.id}
                          checked={formData.promotion_methods.includes(method.id)}
                          onCheckedChange={() => togglePromotionMethod(method.id)}
                        />
                        <label htmlFor={method.id} className="text-sm text-foreground cursor-pointer">
                          {method.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  {errors.promotion_methods && <p className="text-sm text-red-500">{errors.promotion_methods}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content_idea" className="text-foreground">
                    Give us one specific content idea (Optional)
                  </Label>
                  <Textarea
                    id="content_idea"
                    placeholder="Example: 'I'll create a tutorial video showing how to convert PDFs to PowerPoint for my 50K YouTube subscribers who are marketing professionals...'"
                    rows={4}
                    value={formData.content_idea}
                    onChange={(e) => setFormData({ ...formData, content_idea: e.target.value })}
                    className={errors.content_idea ? 'border-red-500' : ''}
                  />
                  <p className="text-sm text-muted-foreground">
                    {formData.content_idea.length} characters
                  </p>
                  {errors.content_idea && <p className="text-sm text-red-500">{errors.content_idea}</p>}
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={handleBack} className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button type="button" onClick={handleNext} className="gap-2">
                    Next Step <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Additional Info & Submit */}
          {step === 3 && (
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle className="text-foreground">Step 3: Additional Details</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Almost done! A few more optional questions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="estimated_conversions" className="text-foreground">
                    Estimated Monthly Conversions (Optional)
                  </Label>
                  <Select value={formData.estimated_conversions} onValueChange={(value) => setFormData({ ...formData, estimated_conversions: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select estimate" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTIMATED_CONVERSIONS.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    This helps us understand your reach (no obligation)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="previous_affiliates" className="text-foreground">
                    Previous Affiliate Programs (Optional)
                  </Label>
                  <Textarea
                    id="previous_affiliates"
                    placeholder="Have you promoted other products as an affiliate? Which ones and what were the results?"
                    rows={3}
                    value={formData.previous_affiliates}
                    onChange={(e) => setFormData({ ...formData, previous_affiliates: e.target.value })}
                  />
                </div>

                {submitStatus === 'error' && (
                  <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-500">Submission Failed</p>
                      <p className="text-sm text-red-400">{errorMessage}</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={handleBack} className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="gap-2">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Application
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
    </div>
  )
}
