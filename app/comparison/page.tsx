"use client";

import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Ban, Check, DollarSign, Lock, Shield, Zap } from "lucide-react";
import Link from "next/link";

export default function CompetitivePositioning() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-grow pt-32 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-4">
            <h1 className="font-bold text-4xl md:text-5xl mb-6 leading-tight">
              Why Professionals Choose{" "}
              <span className="text-gradient-primary">PDFLab</span>
            </h1>
            <p
              className="text-xl text-muted-foreground max-w-2xl mx-auto"
              style={{
                color: "oklch(0.65 0 0)",
                fontSize: "1.25rem",
                maxWidth: "42rem",
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              Stop overpaying for bloatware or risking your data with free
              tools. Get enterprise-grade conversion at startup prices.
            </p>
          </div>

          {/* Comparison Table */}
          <div className="mb-20 overflow-x-auto pt-8">
            <div className="min-w-[1000px]">
              <div className="grid grid-cols-7 gap-4 mb-2 px-4 items-end">
                <div className="col-span-2 font-semibold text-lg pb-4">
                  Feature
                </div>
                <div className="text-center font-bold text-lg pdflab-column-header">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-gradient-primary text-2xl font-extrabold tracking-tight">
                      PDFLab
                    </span>
                  </div>
                </div>
                <div className="text-center font-bold text-foreground pb-4">
                  Adobe Acrobat
                </div>
                <div className="text-center font-bold text-foreground pb-4">
                  Foxit
                </div>
                <div className="text-center font-bold text-foreground pb-4">
                  Smallpdf
                </div>
                <div className="text-center font-bold text-foreground pb-4">
                  iLovePDF
                </div>
              </div>

              <div className="space-y-3">
                {/* Price */}
                <div className="glass p-4 grid grid-cols-7 gap-4 items-center">
                  <div className="col-span-2 font-medium">Monthly Cost</div>
                  <div className="text-center font-bold text-green-400 pdflab-column-cell p-4">
                    $9.99 - $29.99
                  </div>
                  <div className="text-center text-muted-foreground">
                    $20.00+
                  </div>
                  <div className="text-center text-muted-foreground">
                    $14.99+
                  </div>
                  <div className="text-center text-muted-foreground">
                    $12.00+
                  </div>
                  <div className="text-center text-red-400 font-medium">
                    $7.00 + Data Mining
                  </div>
                </div>

                {/* Privacy */}
                <div className="glass p-4 grid grid-cols-7 gap-4 items-center">
                  <div className="col-span-2 font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Data Privacy
                  </div>
                  <div className="text-center font-bold text-primary pdflab-column-cell p-4">
                    Zero Data Mining
                  </div>
                  <div className="text-center text-muted-foreground">
                    Cloud Retention
                  </div>
                  <div className="text-center text-muted-foreground">
                    Cloud Retention
                  </div>
                  <div className="text-center text-muted-foreground">
                    Varies
                  </div>
                  <div className="text-center text-red-400 font-medium">
                    Ad-Targeting
                  </div>
                </div>

                {/* Limits */}
                <div className="glass p-4 grid grid-cols-7 gap-4 items-center">
                  <div className="col-span-2 font-medium">Free Tier Limits</div>
                  <div className="text-center font-bold text-primary pdflab-column-cell p-4">
                    10/mo (25MB)
                  </div>
                  <div className="text-center text-muted-foreground">
                    7-day Trial Only
                  </div>
                  <div className="text-center text-muted-foreground">
                    14-day Trial Only
                  </div>
                  <div className="text-center text-muted-foreground">
                    2 tasks/day
                  </div>
                  <div className="text-center text-muted-foreground">
                    Limited
                  </div>
                </div>

                {/* Bloatware */}
                <div className="glass p-4 grid grid-cols-7 gap-4 items-center">
                  <div className="col-span-2 font-medium">Software Bloat</div>
                  <div className="text-center font-bold text-green-400 pdflab-column-cell p-4">
                    Zero (Web-Based)
                  </div>
                  <div className="text-center text-red-400">Heavy Install</div>
                  <div className="text-center text-red-400">Heavy Install</div>
                  <div className="text-center text-muted-foreground">
                    Web-Based
                  </div>
                  <div className="text-center text-muted-foreground">
                    Web-Based
                  </div>
                </div>

                {/* Ad-Free */}
                <div className="glass p-4 grid grid-cols-7 gap-4 items-center">
                  <div className="col-span-2 font-medium flex items-center gap-2">
                    <Ban className="w-4 h-4 text-primary" />
                    Ad-Free Experience
                  </div>
                  <div className="text-center flex justify-center pdflab-column-cell p-4">
                    <Check className="text-green-400 w-5 h-5" />
                  </div>
                  <div className="text-center text-red-400">Upsells</div>
                  <div className="text-center text-red-400">Upsells</div>
                  <div className="text-center text-red-400">Ads & Upsells</div>
                  <div className="text-center text-red-400">Ads & Upsells</div>
                </div>

                {/* Watermarks */}
                <div className="glass p-4 grid grid-cols-7 gap-4 items-center">
                  <div className="col-span-2 font-medium">No Watermarks</div>
                  <div className="text-center flex justify-center pdflab-column-cell p-4">
                    <Check className="text-green-400 w-5 h-5" />
                  </div>
                  <div className="text-center text-muted-foreground">
                    Paid Only
                  </div>
                  <div className="text-center text-muted-foreground">
                    Paid Only
                  </div>
                  <div className="text-center text-muted-foreground">
                    Free Tier
                  </div>
                  <div className="text-center text-muted-foreground">
                    Free Tier
                  </div>
                </div>

                {/* Batch Processing */}
                <div className="glass p-4 grid grid-cols-7 gap-4 items-center">
                  <div className="col-span-2 font-medium flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    Batch Processing
                  </div>
                  <div className="text-center flex justify-center pdflab-column-cell p-4">
                    <Check className="text-green-400 w-5 h-5" />
                  </div>
                  <div className="text-center flex justify-center">
                    <Check className="text-green-400 w-5 h-5" />
                  </div>
                  <div className="text-center flex justify-center">
                    <Check className="text-green-400 w-5 h-5" />
                  </div>
                  <div className="text-center flex justify-center">
                    <Check className="text-green-400 w-5 h-5" />
                  </div>
                  <div className="text-center flex justify-center">
                    <Check className="text-green-400 w-5 h-5" />
                  </div>
                </div>

                {/* OCR */}
                <div className="glass p-4 grid grid-cols-7 gap-4 items-center">
                  <div className="col-span-2 font-medium">AI-Powered OCR</div>
                  <div className="text-center flex justify-center pdflab-column-cell p-4">
                    <Check className="text-green-400 w-5 h-5" />
                  </div>
                  <div className="text-center flex justify-center">
                    <Check className="text-green-400 w-5 h-5" />
                  </div>
                  <div className="text-center flex justify-center">
                    <Check className="text-green-400 w-5 h-5" />
                  </div>
                  <div className="text-center flex justify-center">
                    <Check className="text-green-400 w-5 h-5" />
                  </div>
                  <div className="text-center flex justify-center">
                    <Check className="text-green-400 w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Differentiators */}
          <div className="grid md:grid-cols-3 gap-6 mb-20">
            {/* Card 1 */}
            <div className="glass-strong border border-primary/20 rounded-xl p-6">
              <div className="flex flex-col space-y-1.5 mb-4">
                <Lock className="w-10 h-10 text-primary mb-2" />
                <h3 className="font-semibold leading-none tracking-tight text-xl">
                  Privacy First
                </h3>
              </div>
              <div className="text-sm text-muted-foreground">
                We don't mine your data. Your files are automatically and
                permanently deleted from our servers 1 hour after processing.
                Bank-grade TLS encryption ensures your documents are safe in
                transit.
              </div>
            </div>

            {/* Card 2 */}
            <div className="glass-strong border border-primary/20 rounded-xl p-6">
              <div className="flex flex-col space-y-1.5 mb-4">
                <DollarSign className="w-10 h-10 text-green-400 mb-2" />
                <h3 className="font-semibold leading-none tracking-tight text-xl">
                  Startup Pricing
                </h3>
              </div>
              <div className="text-sm text-muted-foreground">
                Get the same enterprise-quality conversion engine used by the
                big guys, but at a price that makes sense for individuals and
                startups. No hidden fees, cancel anytime.
              </div>
            </div>

            {/* Card 3 */}
            <div className="glass-strong border border-primary/20 rounded-xl p-6">
              <div className="flex flex-col space-y-1.5 mb-4">
                <Zap className="w-10 h-10 text-yellow-400 mb-2" />
                <h3 className="font-semibold leading-none tracking-tight text-xl">
                  Built for Speed
                </h3>
              </div>
              <div className="text-sm text-muted-foreground">
                Batch process up to 50 files at once. Our distributed cloud
                architecture ensures your conversions happen in seconds, not
                minutes, regardless of file size.
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center glass-strong p-12 rounded-2xl border border-primary/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 z-0"></div>
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-4">
                Ready to Upgrade Your Workflow?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of professionals who have switched to the faster,
                safer, and more affordable PDF solution.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/pricing">
                  <Button className="w-full sm:w-auto text-lg font-medium h-11 px-8">
                    View Pricing
                  </Button>
                </Link>
                <Link href="/">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto text-lg font-medium h-11 px-8 border-primary/50 bg-transparent hover:bg-primary/10 hover:text-accent-foreground"
                  >
                    Try for Free
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 px-6 mt-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap justify-center gap-6 mb-6">
            <Link
              href="/security"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Shield className="w-4 h-4" />
              Bank-Grade Security
            </Link>
            <Link
              href="/privacy"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Check className="w-4 h-4" />
              GDPR Compliant
            </Link>
            <Link
              href="/security"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Ban className="w-4 h-4" />
              Zero Data Retention
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-4 mb-4 text-sm">
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/security"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Security
            </Link>
            <Link
              href="/features"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Pricing
            </Link>
          </div>

          <div className="text-center">
            <div className="text-sm text-muted-foreground">
              © 2024 PDFLab.Pro. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
