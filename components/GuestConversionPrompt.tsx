"use client"

import { useState } from "react"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle, Gift, Clock, Shield } from "lucide-react"

interface GuestConversionPromptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSignup: () => void
  onContinue: () => void
}

export function GuestConversionPrompt({
  open,
  onOpenChange,
  onSignup,
  onContinue
}: GuestConversionPromptProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-primary" />
            </div>
          </div>
          <AlertDialogTitle className="text-center text-2xl">
            Your file is ready!
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-base">
            Create a free account to download your file and unlock more benefits
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Benefits List */}
        <div className="space-y-3 my-4">
          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
            <Gift className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">2 More Free Conversions</h4>
              <p className="text-xs text-muted-foreground">
                Get 3 conversions per month with a free account
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
            <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">7-Day File Retention</h4>
              <p className="text-xs text-muted-foreground">
                Guest files expire in 1 hour • Account files last 7 days
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
            <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">Conversion History</h4>
              <p className="text-xs text-muted-foreground">
                Access all your conversions anytime from your dashboard
              </p>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel asChild>
            <Button
              variant="ghost"
              onClick={onContinue}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Just Download
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Link href="/signup" className="w-full sm:w-auto order-1 sm:order-2">
              <Button
                onClick={onSignup}
                className="w-full bg-primary hover:bg-primary/90"
              >
                Create Free Account & Download
              </Button>
            </Link>
          </AlertDialogAction>
        </AlertDialogFooter>

        <p className="text-xs text-center text-muted-foreground mt-2">
          No credit card required • Takes 30 seconds
        </p>
      </AlertDialogContent>
    </AlertDialog>
  )
}
