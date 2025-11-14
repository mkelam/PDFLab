import type { Metadata } from "next"
import "./globals.css"
import PartnerNav from "@/components/PartnerNav"

export const metadata: Metadata = {
  title: "PDFLab Partners - Influencer Dashboard",
  description: "Partner portal for PDFLab influencers and affiliates. Track your earnings, referrals, and commission tiers.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <PartnerNav />
        <main className="relative z-10">
          {children}
        </main>
      </body>
    </html>
  )
}
