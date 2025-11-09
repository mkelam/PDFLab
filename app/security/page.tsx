import Link from 'next/link'
import { ArrowLeft, Shield, Lock, Server, FileCheck, AlertTriangle, CheckCircle2 } from 'lucide-react'

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to PDF Lab Pro
        </Link>

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold">Security & Data Protection</h1>
          </div>
          <p className="text-muted-foreground">
            Last Updated: <span className="font-medium">November 6, 2025</span>
          </p>
          <p className="text-lg text-muted-foreground mt-4">
            Your security is our top priority. We implement bank-grade security measures to protect your files and personal information.
          </p>
        </div>

        {/* Trust Banner */}
        <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Bank-Grade Security</h3>
              <p className="text-sm text-muted-foreground">
                All files are encrypted with TLS 1.3 during transmission and automatically deleted within 24 hours.
                We never store your file contents permanently and have zero access to your data.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          {/* 1. Our Security Commitment */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold mb-0">Our Security Commitment</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              At PDFLab, we understand that you trust us with sensitive documents. That&apos;s why we&apos;ve built our
              platform with security and privacy as the foundation, not an afterthought.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="bg-card border rounded-lg p-4">
                <h3 className="font-semibold text-primary mb-2">🔒 Zero-Knowledge Architecture</h3>
                <p className="text-sm text-muted-foreground">
                  We cannot access your file contents. Files are processed automatically and deleted within 24 hours.
                </p>
              </div>
              <div className="bg-card border rounded-lg p-4">
                <h3 className="font-semibold text-primary mb-2">🛡️ Military-Grade Encryption</h3>
                <p className="text-sm text-muted-foreground">
                  TLS 1.3 for transmission, AES-256 encryption at rest. The same standards used by banks.
                </p>
              </div>
              <div className="bg-card border rounded-lg p-4">
                <h3 className="font-semibold text-primary mb-2">⏱️ Automatic Deletion</h3>
                <p className="text-sm text-muted-foreground">
                  All uploaded and converted files are permanently deleted within 24 hours of processing.
                </p>
              </div>
              <div className="bg-card border rounded-lg p-4">
                <h3 className="font-semibold text-primary mb-2">🔍 Regular Audits</h3>
                <p className="text-sm text-muted-foreground">
                  Security assessments, vulnerability testing, and penetration testing conducted regularly.
                </p>
              </div>
            </div>
          </section>

          {/* 2. How We Protect Your Files */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <FileCheck className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold mb-0">How We Protect Your Files</h2>
            </div>

            <h3 className="text-xl font-medium mb-3 mt-6">2.1 Encryption in Transit</h3>
            <p className="text-muted-foreground leading-relaxed">
              Every file you upload is encrypted using TLS 1.3 (Transport Layer Security), the latest and most secure
              protocol for data transmission:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4 ml-4">
              <li><strong>HTTPS-Only:</strong> All connections use HTTPS with automatic HTTP redirect</li>
              <li><strong>TLS 1.3:</strong> The latest encryption protocol (faster and more secure than TLS 1.2)</li>
              <li><strong>Perfect Forward Secrecy:</strong> Each session has unique encryption keys</li>
              <li><strong>Certificate Pinning:</strong> Prevents man-in-the-middle attacks</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">2.2 Encryption at Rest</h3>
            <p className="text-muted-foreground leading-relaxed">
              Files stored temporarily during processing are encrypted:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4 ml-4">
              <li><strong>AES-256 Encryption:</strong> Military-grade encryption for stored files</li>
              <li><strong>Encrypted File System:</strong> Server storage uses full-disk encryption</li>
              <li><strong>Secure Deletion:</strong> Files are securely overwritten (not just marked as deleted)</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">2.3 Automatic File Deletion</h3>
            <p className="text-muted-foreground leading-relaxed">
              Your files are not stored permanently:
            </p>
            <div className="bg-card border rounded-lg p-6 mt-4">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 rounded-full p-3">
                  <AlertTriangle className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">24-Hour Automatic Deletion Policy</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    All uploaded PDFs and converted files are automatically deleted from our servers within 24 hours
                    of processing. This is not configurable - it happens automatically.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>Upload → Process → Download → Delete (within 24 hours)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>No long-term storage of file contents</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>No human access to your files</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <h3 className="text-xl font-medium mb-3 mt-6">2.4 Processing via CloudConvert</h3>
            <p className="text-muted-foreground leading-relaxed">
              We use CloudConvert API for PDF processing, a trusted service with:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4 ml-4">
              <li><strong>ISO 27001 Certified:</strong> International security management standard</li>
              <li><strong>SOC 2 Type II Compliant:</strong> Annual third-party security audits</li>
              <li><strong>GDPR Compliant:</strong> European data protection standards</li>
              <li><strong>Automatic Deletion:</strong> CloudConvert also deletes files after processing</li>
            </ul>
          </section>

          {/* 3. Infrastructure Security */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Server className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold mb-0">Infrastructure Security</h2>
            </div>

            <h3 className="text-xl font-medium mb-3 mt-6">3.1 Hosting & Servers</h3>
            <p className="text-muted-foreground leading-relaxed">
              Our infrastructure is hosted on hardened VPS servers with multiple layers of protection:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4 ml-4">
              <li><strong>Hostinger VPS:</strong> Enterprise-grade hosting with 99.9% uptime SLA</li>
              <li><strong>Fail2ban:</strong> Automatic IP blocking after failed login attempts</li>
              <li><strong>UFW Firewall:</strong> Only essential ports open (443 HTTPS, 22 SSH)</li>
              <li><strong>Automatic Security Updates:</strong> Daily security patches applied automatically</li>
              <li><strong>SSH Key Authentication:</strong> Password authentication disabled</li>
              <li><strong>DDoS Protection:</strong> CloudFlare protection against distributed attacks</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">3.2 Database Security</h3>
            <p className="text-muted-foreground leading-relaxed">
              User data is stored in encrypted databases:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4 ml-4">
              <li><strong>MySQL 8.0:</strong> Latest stable version with security patches</li>
              <li><strong>Password Hashing:</strong> bcrypt with salt rounds (not reversible)</li>
              <li><strong>Parameterized Queries:</strong> Protection against SQL injection attacks</li>
              <li><strong>Network Isolation:</strong> Database accessible only from application server</li>
              <li><strong>Regular Backups:</strong> Encrypted backups stored separately</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">3.3 Access Controls</h3>
            <p className="text-muted-foreground leading-relaxed">
              Strict controls on who can access what:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4 ml-4">
              <li><strong>Zero File Access:</strong> No employees can access your uploaded files</li>
              <li><strong>Minimal Data Access:</strong> Only authorized personnel can access user metadata (email, name)</li>
              <li><strong>Audit Logs:</strong> All database access is logged and monitored</li>
              <li><strong>Two-Factor Authentication:</strong> Required for all admin accounts</li>
            </ul>
          </section>

          {/* 4. Compliance & Certifications */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Compliance & Standards</h2>
            <p className="text-muted-foreground leading-relaxed">
              We comply with international security and privacy standards:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="border rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-3">🇪🇺 GDPR Compliant</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  European Union General Data Protection Regulation
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Right to access your data</li>
                  <li>✓ Right to deletion (GDPR Article 17)</li>
                  <li>✓ Data portability</li>
                  <li>✓ Breach notification (within 72 hours)</li>
                </ul>
              </div>

              <div className="border rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-3">🇺🇸 CCPA Compliant</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  California Consumer Privacy Act
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Right to know what data is collected</li>
                  <li>✓ Right to delete personal information</li>
                  <li>✓ Right to opt-out of data sales (we don&apos;t sell data)</li>
                  <li>✓ Non-discrimination guarantee</li>
                </ul>
              </div>

              <div className="border rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-3">🇿🇦 POPIA Compliant</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Protection of Personal Information Act (South Africa)
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Lawful processing of personal information</li>
                  <li>✓ Data minimization (only collect what&apos;s needed)</li>
                  <li>✓ Security safeguards</li>
                  <li>✓ Required for PayFast compliance</li>
                </ul>
              </div>

              <div className="border rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-3">🔐 PCI DSS (via PayFast)</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Payment Card Industry Data Security Standard
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ We never store card details</li>
                  <li>✓ PayFast is PCI DSS Level 1 certified</li>
                  <li>✓ Secure payment processing</li>
                  <li>✓ Encrypted transactions</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 5. Third-Party Security */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Third-Party Service Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We carefully vet all third-party services we use:
            </p>

            <div className="space-y-4 mt-6">
              <div className="border-l-4 border-primary pl-6 py-3">
                <h3 className="font-semibold mb-2">CloudConvert (PDF Processing)</h3>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded">ISO 27001</span>
                  <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded">SOC 2 Type II</span>
                  <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded">GDPR</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Industry-leading PDF conversion API with automatic file deletion after processing.
                </p>
              </div>

              <div className="border-l-4 border-primary pl-6 py-3">
                <h3 className="font-semibold mb-2">PayFast (Payment Processing)</h3>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded">PCI DSS Level 1</span>
                  <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded">POPIA Compliant</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  South Africa&apos;s leading payment gateway. We never store your card details - all payment data is handled by PayFast.
                </p>
              </div>

              <div className="border-l-4 border-primary pl-6 py-3">
                <h3 className="font-semibold mb-2">Hostinger (Hosting Infrastructure)</h3>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded">GDPR Compliant</span>
                  <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded">99.9% Uptime</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enterprise-grade VPS hosting with DDoS protection and 24/7 monitoring.
                </p>
              </div>
            </div>
          </section>

          {/* 6. Comparison to Competitors */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Why PDFLab is More Secure Than Competitors</h2>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-2">Recent Security Incidents in PDF Industry</h3>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li><strong>January 2025:</strong> Nitro PDF breach leaked 77 million records (including Google, Apple, Microsoft customers)</li>
                    <li><strong>March 2025:</strong> FBI warning about malware in free online PDF converters</li>
                    <li><strong>2024:</strong> Multiple incidents of PDF converters selling user data to third parties</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto mt-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Security Feature</th>
                    <th className="text-center py-3 px-4 bg-primary/10">PDFLab</th>
                    <th className="text-center py-3 px-4">Smallpdf</th>
                    <th className="text-center py-3 px-4">iLovePDF</th>
                    <th className="text-center py-3 px-4">Adobe</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b">
                    <td className="py-3 px-4">Auto-delete files</td>
                    <td className="text-center py-3 px-4 bg-primary/5">✅ 24 hours</td>
                    <td className="text-center py-3 px-4">✅ 1 hour</td>
                    <td className="text-center py-3 px-4">✅ 2 hours</td>
                    <td className="text-center py-3 px-4">❌ Cloud stored</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">TLS 1.3 encryption</td>
                    <td className="text-center py-3 px-4 bg-primary/5">✅</td>
                    <td className="text-center py-3 px-4">❌ TLS 1.2</td>
                    <td className="text-center py-3 px-4">❌ TLS 1.2</td>
                    <td className="text-center py-3 px-4">✅</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Zero employee file access</td>
                    <td className="text-center py-3 px-4 bg-primary/5">✅</td>
                    <td className="text-center py-3 px-4">⚠️ Unknown</td>
                    <td className="text-center py-3 px-4">⚠️ Unknown</td>
                    <td className="text-center py-3 px-4">⚠️ Unknown</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">No data breaches</td>
                    <td className="text-center py-3 px-4 bg-primary/5">✅ Never</td>
                    <td className="text-center py-3 px-4">✅ None reported</td>
                    <td className="text-center py-3 px-4">✅ None reported</td>
                    <td className="text-center py-3 px-4">⚠️ Past incidents</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Privacy-first approach</td>
                    <td className="text-center py-3 px-4 bg-primary/5">✅ Core value</td>
                    <td className="text-center py-3 px-4">❌ Upsell feature</td>
                    <td className="text-center py-3 px-4">❌ Not emphasized</td>
                    <td className="text-center py-3 px-4">⚠️ Cloud-focused</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 7. Incident Response */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Incident Response & Support</h2>

            <h3 className="text-xl font-medium mb-3 mt-6">If a Security Breach Occurs</h3>
            <p className="text-muted-foreground leading-relaxed">
              While we take every precaution to prevent security incidents, we have a clear protocol:
            </p>
            <ol className="list-decimal list-inside text-muted-foreground space-y-2 mt-4 ml-4">
              <li><strong>Within 24 hours:</strong> Internal incident team investigates</li>
              <li><strong>Within 72 hours:</strong> Affected users notified via email (GDPR requirement)</li>
              <li><strong>Within 1 week:</strong> Public disclosure and remediation plan</li>
              <li><strong>Full transparency:</strong> Detailed post-mortem report published</li>
            </ol>

            <h3 className="text-xl font-medium mb-3 mt-6">Report a Security Issue</h3>
            <p className="text-muted-foreground leading-relaxed">
              If you discover a security vulnerability, please report it responsibly:
            </p>
            <div className="bg-card border rounded-lg p-6 mt-4">
              <p className="text-sm text-muted-foreground">
                <strong>Security Team:</strong> security@pdflab.pro
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Response Time:</strong> Within 24 hours
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Bug Bounty:</strong> We offer rewards for valid security reports
              </p>
            </div>
          </section>

          {/* 8. Best Practices for Users */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Security Best Practices for Users</h2>
            <p className="text-muted-foreground leading-relaxed">
              While we secure our platform, you can enhance your security:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4 ml-4">
              <li><strong>Strong Passwords:</strong> Use unique passwords with 12+ characters, mix of letters/numbers/symbols</li>
              <li><strong>Enable 2FA:</strong> Two-factor authentication adds an extra layer (coming soon)</li>
              <li><strong>Don&apos;t Share Accounts:</strong> Each user should have their own account</li>
              <li><strong>Log Out:</strong> Always log out on shared computers</li>
              <li><strong>Check HTTPS:</strong> Ensure the URL shows https://pdflab.pro (with lock icon)</li>
              <li><strong>Beware of Phishing:</strong> We&apos;ll never ask for your password via email</li>
              <li><strong>Download Promptly:</strong> Download converted files quickly (they&apos;re deleted in 24 hours)</li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t">
          <p className="text-sm text-muted-foreground text-center">
            Your security is our responsibility. If you have questions or concerns about our security practices,
            please contact our security team.
          </p>
          <div className="flex justify-center gap-6 mt-6">
            <Link href="/privacy" className="text-sm text-primary hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-primary hover:underline">
              Terms of Service
            </Link>
            <Link href="/" className="text-sm text-primary hover:underline">
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
