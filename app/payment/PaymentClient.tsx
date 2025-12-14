"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Check, Shield, Infinity, Loader2, Lock, AlertCircle, CreditCard } from "lucide-react"
import { useAuth, useRequireAuth } from "@/contexts/AuthContext"

interface PlanDetails {
  id: string
  name: string
  price: number
  originalPrice?: number
  currency: string
  interval: string
  icon: JSX.Element
  features: string[]
}

type PaymentProvider = "payfast" | "paypal"

const PLAN_DETAILS: Record<string, PlanDetails> = {
  starter: {
    id: "starter",
    name: "Starter",
    price: 4.55,
    originalPrice: 9.99,
    currency: "USD",
    interval: "month",
    icon: <Shield className="w-6 h-6" />,
    features: [
      "100 conversions per month",
      "25MB file size limit",
      "OCR-Enhanced PDF conversion",
      "Email support"
    ]
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 13.50,
    originalPrice: 29.99,
    currency: "USD",
    interval: "month",
    icon: <Infinity className="w-6 h-6" />,
    features: [
      "Unlimited conversions",
      "100MB file size limit",
      "OCR-Enhanced conversion",
      "Advanced analytics",
      "Priority processing",
      "Priority support"
    ]
  }
}

// PayPal SVG Icon component
const PayPalIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.773.773 0 0 1 .764-.648h6.38c2.121 0 3.707.628 4.715 1.863.898 1.1 1.218 2.523.94 4.21-.027.175-.06.354-.1.538-.583 2.736-2.197 4.523-4.812 5.327-.813.25-1.715.377-2.66.377H8.187a.773.773 0 0 0-.764.648l-.347 2.302zM19.04 8.17c-.026.166-.058.338-.095.514-.58 2.707-2.17 4.476-4.754 5.27-.801.246-1.69.371-2.621.371H9.586l-.863 5.738a.773.773 0 0 1-.764.648H5.89l.343-2.268 1.105-7.32a.773.773 0 0 1 .764-.648h1.982c.946 0 1.847-.127 2.66-.377 2.615-.804 4.229-2.591 4.812-5.327.04-.184.073-.363.1-.538.138-.894.138-1.652-.012-2.303-.13-.575-.36-1.08-.675-1.518 1.31.96 2.013 2.51 2.013 4.758 0 .866-.098 1.657-.284 2.367-.023.077-.047.154-.073.233z"/>
  </svg>
)

export default function PaymentClient() {
  useRequireAuth() // Redirect to login if not authenticated

  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>("paypal")

  const planId = searchParams.get("plan") || "starter"
  const plan = PLAN_DETAILS[planId]

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3006"

  const handlePayment = async () => {
    if (!user) {
      router.push(`/get-started?plan=${planId}`)
      return
    }

    setIsProcessing(true)
    setError("")

    try {
      const token = localStorage.getItem("authToken")
      if (!token) {
        throw new Error("Not authenticated")
      }

      if (selectedProvider === "paypal") {
        // Initialize PayPal payment
        const response = await fetch(`${apiUrl}/api/paypal/initialize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            plan: planId,
            userEmail: user.email,
            userName: user.name || user.email.split("@")[0]
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || data.message || "Payment initialization failed")
        }

        if (data.success && data.approveUrl) {
          // Redirect to PayPal for approval
          window.location.href = data.approveUrl
        } else {
          throw new Error("No approval URL received from PayPal")
        }
      } else {
        // Initialize PayFast payment (legacy)
        const response = await fetch(`${apiUrl}/api/payfast/initialize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            plan: planId,
            userEmail: user.email,
            userName: user.name || user.email.split("@")[0]
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || data.message || "Payment initialization failed")
        }

        if (data.success && data.paymentUrl && data.paymentData) {
          // Create and submit a form to PayFast with payment data
          const form = document.createElement('form')
          form.method = 'POST'
          form.action = data.paymentUrl

          // Add all payment data as hidden form fields
          Object.keys(data.paymentData).forEach(key => {
            const input = document.createElement('input')
            input.type = 'hidden'
            input.name = key
            input.value = data.paymentData[key]
            form.appendChild(input)
          })

          document.body.appendChild(form)
          form.submit()
        } else {
          throw new Error("No payment URL or payment data received")
        }
      }
    } catch (error) {
      console.error("Payment error:", error)
      setError(error instanceof Error ? error.message : "Payment initialization failed. Please try again.")
      setIsProcessing(false)
    }
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="glass-strong border-border/50 max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Invalid Plan</h2>
            <p className="text-muted-foreground mb-4">The selected plan doesn't exist.</p>
            <Button onClick={() => router.push("/pricing")}>View Pricing Plans</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to Pricing
        </Link>

        <Card className="glass-strong border-border/50">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Complete Your Purchase</CardTitle>
            <CardDescription>
              You're about to subscribe to the {plan.name} plan
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {/* Plan Summary */}
            <div className="p-6 rounded-lg border border-border/40 bg-card/50">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    {plan.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{plan.name} Plan</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {plan.originalPrice && (
                        <span className="text-sm text-muted-foreground line-through">
                          ${plan.originalPrice}
                        </span>
                      )}
                      <span className="text-2xl font-bold text-primary">
                        ${plan.price}
                      </span>
                      <span className="text-muted-foreground">/{plan.interval}</span>
                    </div>
                  </div>
                </div>
                {plan.originalPrice && (
                  <Badge className="bg-green-500 text-white">
                    Save {Math.round((1 - plan.price / plan.originalPrice) * 100)}%
                  </Badge>
                )}
              </div>

              <div className="pt-4 border-t border-border/40">
                <p className="text-sm font-medium mb-3">Plan includes:</p>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="p-6 rounded-lg border border-border/40 bg-card/50">
              <h3 className="font-semibold mb-4">Select Payment Method</h3>
              <div className="grid grid-cols-2 gap-3">
                {/* PayPal Option */}
                <button
                  type="button"
                  onClick={() => setSelectedProvider("paypal")}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    selectedProvider === "paypal"
                      ? "border-primary bg-primary/5"
                      : "border-border/40 hover:border-border"
                  }`}
                >
                  <div className={`p-2 rounded-full ${
                    selectedProvider === "paypal" ? "bg-[#003087] text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    <PayPalIcon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">PayPal</p>
                    <p className="text-xs text-muted-foreground">Fast & Secure</p>
                  </div>
                  {selectedProvider === "paypal" && (
                    <Check className="w-5 h-5 text-primary ml-auto" />
                  )}
                </button>

                {/* Credit Card Option (via PayFast) */}
                <button
                  type="button"
                  onClick={() => setSelectedProvider("payfast")}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    selectedProvider === "payfast"
                      ? "border-primary bg-primary/5"
                      : "border-border/40 hover:border-border"
                  }`}
                >
                  <div className={`p-2 rounded-full ${
                    selectedProvider === "payfast" ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Credit Card</p>
                    <p className="text-xs text-muted-foreground">Visa, Mastercard</p>
                  </div>
                  {selectedProvider === "payfast" && (
                    <Check className="w-5 h-5 text-primary ml-auto" />
                  )}
                </button>
              </div>
            </div>

            {/* Payment Details */}
            <div className="p-6 rounded-lg border border-border/40 bg-card/50">
              <h3 className="font-semibold mb-4">Payment Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${plan.price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Billing Cycle</span>
                  <span className="font-medium">Monthly</span>
                </div>
                <div className="pt-3 border-t border-border/40 flex justify-between items-center">
                  <span className="font-semibold">Total Today</span>
                  <span className="text-2xl font-bold text-primary">${plan.price}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Recurring monthly charge. Cancel anytime from your dashboard.
                </p>
              </div>
            </div>

            {/* Account Info */}
            {user && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm">
                  <span className="font-medium">Billing to:</span> {user.email}
                </p>
              </div>
            )}

            {/* Payment Button */}
            <Button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-lg font-semibold"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : selectedProvider === "paypal" ? (
                <>
                  <PayPalIcon className="w-5 h-5 mr-2" />
                  Pay with PayPal
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  Proceed to Secure Payment
                </>
              )}
            </Button>

            {/* Security Notice */}
            <div className="flex items-start gap-2 p-4 rounded-lg bg-muted/50">
              <Lock className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Secure Payment Processing</p>
                <p>
                  Your payment is securely processed by {selectedProvider === "paypal" ? "PayPal" : "PayFast"}.
                  We never store your credit card information. All transactions are encrypted and PCI DSS compliant.
                </p>
              </div>
            </div>

            {/* Money Back Guarantee */}
            <div className="text-center pt-4 border-t border-border/40">
              <p className="text-sm text-muted-foreground">
                30-day money-back guarantee - Cancel anytime - No hidden fees
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
