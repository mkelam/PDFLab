"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  FileType,
  Presentation,
  FileSpreadsheet,
  ImageIcon,
  Minimize2,
  Merge,
  Shield,
  Zap,
  Layers,
  ScanText,
  CreditCard,
  ArrowLeft,
} from "lucide-react"
import { Navigation } from "@/components/Navigation"

export default function FeaturesPage() {
  return (
    <div className="min-h-screen">
      <Navigation />

      <section className="pt-32 pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center mb-8">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>

          <div className="text-center mb-16">
            <h1 className="font-bold text-4xl md:text-5xl mb-6 leading-tight">Transform Your PDFs in Seconds</h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Professional document conversion, compression, and merging - no software installation required.
            </p>
          </div>

          {/* PDF Conversion */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Convert to Any Format You Need</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="glass hover:scale-105 transition-transform">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Presentation className="w-5 h-5 text-primary mr-2" />
                    PowerPoint
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Turn PDFs into editable presentations. Perfect for repurposing reports and proposals.</p>
                </CardContent>
              </Card>

              <Card className="glass hover:scale-105 transition-transform">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <FileType className="w-5 h-5 text-primary mr-2" />
                    Word
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Edit PDF content as Word documents. Make changes without starting from scratch.</p>
                </CardContent>
              </Card>

              <Card className="glass hover:scale-105 transition-transform">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <FileSpreadsheet className="w-5 h-5 text-primary mr-2" />
                    Excel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Extract tables into spreadsheets. Analyze data without manual retyping.</p>
                </CardContent>
              </Card>

              <Card className="glass hover:scale-105 transition-transform">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <ImageIcon className="w-5 h-5 text-primary mr-2" />
                    Images
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Save PDF pages as JPG images. Share visuals on social media or presentations.</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Advanced Features */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">More Ways to Work Smarter</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="glass hover:scale-105 transition-transform">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Minimize2 className="w-5 h-5 text-primary mr-2" />
                    Compress PDFs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">Shrink file sizes for email attachments or faster sharing. Reduce by up to 60% while keeping quality.</p>
                </CardContent>
              </Card>

              <Card className="glass hover:scale-105 transition-transform">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Merge className="w-5 h-5 text-primary mr-2" />
                    Merge PDFs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">Combine contracts, invoices, or reports into one organized document. Upload up to 10 files at once.</p>
                </CardContent>
              </Card>

              <Card className="glass hover:scale-105 transition-transform">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Layers className="w-5 h-5 text-primary mr-2" />
                    Batch Process
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">Convert dozens of files at once. Track progress in real-time and download when ready.</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Why Choose PDFLab */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Why Teams Choose PDFLab</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="glass hover:scale-105 transition-transform">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <ScanText className="w-5 h-5 text-primary mr-2" />
                    Scanned PDFs? No Problem
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Extract text from scanned documents and images. Turn old paper files into editable digital content.</p>
                </CardContent>
              </Card>

              <Card className="glass hover:scale-105 transition-transform">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Shield className="w-5 h-5 text-primary mr-2" />
                    Your Files Stay Private
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Files are automatically deleted after processing. Enterprise-grade security keeps your documents safe.</p>
                </CardContent>
              </Card>

              <Card className="glass hover:scale-105 transition-transform">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Zap className="w-5 h-5 text-primary mr-2" />
                    Lightning Fast Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Most conversions complete in under 30 seconds. No waiting, no downloads - just results.</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Pricing */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-center">Simple, Transparent Pricing</h2>
            <p className="text-center text-muted-foreground mb-8">Choose the plan that fits your needs. Upgrade or downgrade anytime.</p>
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="glass hover:scale-105 transition-transform">
                <CardHeader>
                  <CardTitle className="text-lg">Free</CardTitle>
                  <p className="text-3xl font-bold">$0</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">Try it out</p>
                  <ul className="text-sm space-y-2">
                    <li>✓ 3 files per month</li>
                    <li>✓ All formats</li>
                    <li>✓ 10MB file size</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="glass hover:scale-105 transition-transform">
                <CardHeader>
                  <CardTitle className="text-lg">Starter</CardTitle>
                  <p className="text-3xl font-bold">$9.99<span className="text-base font-normal text-muted-foreground">/mo</span></p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">For individuals</p>
                  <ul className="text-sm space-y-2">
                    <li>✓ 100 files per month</li>
                    <li>✓ All formats</li>
                    <li>✓ 25MB file size</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="glass hover:scale-105 transition-transform border-primary">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    Pro
                    <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-1 rounded">Popular</span>
                  </CardTitle>
                  <p className="text-3xl font-bold">$29.99<span className="text-base font-normal text-muted-foreground">/mo</span></p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">For professionals</p>
                  <ul className="text-sm space-y-2">
                    <li>✓ Unlimited files</li>
                    <li>✓ All formats</li>
                    <li>✓ 100MB file size</li>
                    <li>✓ Priority support</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="glass hover:scale-105 transition-transform">
                <CardHeader>
                  <CardTitle className="text-lg">Enterprise</CardTitle>
                  <p className="text-3xl font-bold">$99.99<span className="text-base font-normal text-muted-foreground">/mo</span></p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">For teams</p>
                  <ul className="text-sm space-y-2">
                    <li>✓ Unlimited files</li>
                    <li>✓ All formats</li>
                    <li>✓ 500MB file size</li>
                    <li>✓ API access</li>
                    <li>✓ Dedicated support</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <Card className="glass max-w-2xl mx-auto">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-4">Start Processing PDFs Today</h3>
                <p className="text-muted-foreground mb-6">
                  No credit card required for Free plan. Upgrade anytime.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/">
                    <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      Try Free Now
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button variant="outline" size="lg">
                      Compare Plans
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/30 py-6 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="text-sm text-muted-foreground">© 2025 PDFLab. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
