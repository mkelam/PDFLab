'use client'

import "./globals.css"
import PartnerNav from "@/components/PartnerNav"
import { PartnerAuthProvider } from "@/contexts/PartnerAuthContext"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <PartnerAuthProvider>
          <PartnerNav />
          <main className="relative z-10">
            {children}
          </main>
        </PartnerAuthProvider>
      </body>
    </html>
  )
}
