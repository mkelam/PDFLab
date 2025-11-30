"use client"

import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { XCircle, ArrowLeft, RefreshCw, HelpCircle, MessageCircle } from "lucide-react"

export default function PaymentCancelClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get the plan they were trying to purchase (if available)
  const planId = searchParams.get("plan") || "starter"

  const handleRetryPayment = () => {
    router.push(`/payment?plan=${planId}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="glass-strong border-border/50">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
              <XCircle className="w-12 h-12 text-orange-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-foreground">Payment Cancelled</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Your payment was not completed
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Information Box */}
            <div className="p-6 rounded-lg border border-border/40 bg-muted/30">
              <p className="text-center text-muted-foreground">
                Don't worry - no charges were made to your account. Your payment was cancelled before completion.
              </p>
            </div>

            {/* Common Reasons */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border/40">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Common Reasons for Cancellation
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">&bull;</span>
                  <span>You clicked the "Cancel" or "Back" button on the payment page</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">&bull;</span>
                  <span>Payment details were incorrect or incomplete</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">&bull;</span>
                  <span>Session timed out due to inactivity</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">&bull;</span>
                  <span>Browser or network connection issue</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleRetryPayment}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/pricing")}
                className="flex-1 glass-subtle border-border/40"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Pricing
              </Button>
            </div>

            {/* Help Section */}
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
              <h3 className="font-semibold mb-2">Need Help?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                If you're experiencing issues completing your payment or have questions about our plans, we're here to help.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Link href="/support" className="flex-1">
                  <Button variant="outline" className="w-full glass-subtle border-border/40">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                </Link>
                <Link href="/faq" className="flex-1">
                  <Button variant="outline" className="w-full glass-subtle border-border/40">
                    <HelpCircle className="w-4 h-4 mr-2" />
                    View FAQ
                  </Button>
                </Link>
              </div>
            </div>

            {/* Free Plan Option */}
            <div className="text-center pt-4 border-t border-border/40">
              <p className="text-sm text-muted-foreground mb-3">
                Not ready to upgrade yet?
              </p>
              <Button
                variant="ghost"
                onClick={() => router.push("/")}
                className="text-primary hover:bg-primary/10"
              >
                Continue with Free Plan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Additional Support Info */}
        <div className="mt-6 p-4 rounded-lg bg-muted/50 text-center">
          <p className="text-sm text-muted-foreground">
            Payment secured by PayFast - PCI DSS compliant - SSL encrypted
          </p>
        </div>
      </div>
    </div>
  )
}
