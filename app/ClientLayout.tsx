"use client"

import type React from "react"
import { useEffect } from "react"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
// <CHANGE> Added Montserrat for premium headings as per design brief
import { Montserrat } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { TokenExpirationWarning } from "@/components/TokenExpirationWarning"
import { Toaster } from "@/components/ui/toaster"
import FeedbackBubble from "@/components/FeedbackBubble"
import { AuthProvider } from "@/contexts/AuthContext"
import { SessionProvider } from "@/contexts/SessionContext"
import { OnboardingProvider } from "@/contexts/OnboardingContext"
import { performStartupHealthCheck } from "@/lib/api-health"
import "./globals.css"

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700", "800", "900"],
})

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Perform health check on app startup
  useEffect(() => {
    performStartupHealthCheck()
  }, [])

  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} ${montserrat.variable}`}>
        <SessionProvider>
          <AuthProvider>
            <OnboardingProvider>
              <div className="relative z-10">{children}</div>
              <TokenExpirationWarning />
              <Toaster />
              <FeedbackBubble />
            </OnboardingProvider>
          </AuthProvider>
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  )
}
