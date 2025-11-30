"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Check, Shield, Infinity, Loader2, Lock, AlertCircle } from "lucide-react"
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

export default function PaymentClient() {
  useRequireAuth() // Redirect to login if not authenticated

  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")

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

      // Initialize PayFast payment
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
                  Your payment is securely processed by PayFast. We never store your credit card information.
                  All transactions are encrypted and PCI DSS compliant.
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
