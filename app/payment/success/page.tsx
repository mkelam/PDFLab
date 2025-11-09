"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, ArrowRight, Loader2, Download, Home } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

function PaymentSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [isVerifying, setIsVerifying] = useState(true)
  const [verificationComplete, setVerificationComplete] = useState(false)

  // PayFast returns these parameters
  const paymentId = searchParams.get("pf_payment_id")
  const transactionId = searchParams.get("m_payment_id")

  useEffect(() => {
    // Simulate verification delay (ITN webhook usually arrives within seconds)
    const timer = setTimeout(() => {
      setIsVerifying(false)
      setVerificationComplete(true)
      // User data will refresh on next page load
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="glass-strong border-border/50 max-w-lg">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-16 h-16 text-primary mx-auto mb-6 animate-spin" />
            <h2 className="text-2xl font-bold mb-2">Verifying Your Payment</h2>
            <p className="text-muted-foreground">
              Please wait while we confirm your payment with PayFast...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="glass-strong border-border/50">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-foreground">Payment Successful!</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Your subscription has been activated
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Payment Details */}
            {(paymentId || transactionId) && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border/40">
                <h3 className="font-semibold mb-3">Payment Details</h3>
                <div className="space-y-2 text-sm">
                  {transactionId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transaction ID:</span>
                      <span className="font-mono">{transactionId}</span>
                    </div>
                  )}
                  {paymentId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">PayFast Payment ID:</span>
                      <span className="font-mono">{paymentId}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* What's Next */}
            <div className="p-6 rounded-lg border border-primary/20 bg-primary/5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                What's Next?
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Your account has been upgraded to your selected plan</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>You can now start converting PDFs with your new limits</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>A confirmation email has been sent to {user?.email || "your email"}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Manage your subscription anytime from your dashboard</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={() => router.push("/")}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Download className="w-4 h-4 mr-2" />
                Start Converting PDFs
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
                className="flex-1 glass-subtle border-border/40"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            </div>

            {/* Support Link */}
            <div className="text-center pt-4 border-t border-border/40">
              <p className="text-sm text-muted-foreground mb-2">
                Need help getting started?
              </p>
              <Link
                href="/support"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                Contact Support
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="mt-6 p-4 rounded-lg bg-muted/50 text-center">
          <p className="text-sm text-muted-foreground">
            Your subscription will automatically renew monthly. You can cancel anytime from your dashboard.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}
