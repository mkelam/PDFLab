import nodemailer, { Transporter } from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

class EmailService {
  private transporter: Transporter | null = null

  constructor() {
    this.initializeTransporter()
  }

  /**
   * Initialize nodemailer transporter
   */
  private initializeTransporter(): void {
    const emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    }

    // Only initialize if SMTP credentials are provided
    if (emailConfig.auth.user && emailConfig.auth.pass) {
      this.transporter = nodemailer.createTransport(emailConfig)
      console.log('✓ Email service initialized with SMTP:', emailConfig.host)
    } else {
      console.warn('⚠ Email service not configured - missing SMTP credentials')
      console.warn('  Emails will be logged to console only (development mode)')
    }
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // If transporter is not configured, log to console (development mode)
      if (!this.transporter) {
        console.log('='.repeat(80))
        console.log('EMAIL (Development Mode - Not Sent)')
        console.log('='.repeat(80))
        console.log(`To: ${options.to}`)
        console.log(`Subject: ${options.subject}`)
        console.log(`Text: ${options.text || 'See HTML content'}`)
        console.log('='.repeat(80))
        return true
      }

      // Send email via SMTP
      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'PDFLab'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      }

      await this.transporter.sendMail(mailOptions)
      console.log(`✓ Email sent successfully to ${options.to}`)
      return true
    } catch (error) {
      console.error('✗ Failed to send email:', error)
      return false
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/reset-password?token=${resetToken}`
    const expirationTime = '1 hour'

    const html = this.getPasswordResetEmailTemplate(resetUrl, expirationTime)
    const text = `
Password Reset Request

You requested to reset your password for your PDFLab account.

Click the link below to reset your password:
${resetUrl}

This link will expire in ${expirationTime}.

If you didn't request this, please ignore this email. Your password will remain unchanged.

Best regards,
The PDFLab Team
    `.trim()

    return await this.sendEmail({
      to: email,
      subject: 'Reset your PDFLab password',
      html,
      text,
    })
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, verificationToken: string): Promise<boolean> {
    const verificationUrl = `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/verify-email?token=${verificationToken}`

    const html = this.getVerificationEmailTemplate(verificationUrl)
    const text = `
Welcome to PDFLab!

Please verify your email address by clicking the link below:
${verificationUrl}

If you didn't create this account, please ignore this email.

Best regards,
The PDFLab Team
    `.trim()

    return await this.sendEmail({
      to: email,
      subject: 'Verify your PDFLab email',
      html,
      text,
    })
  }

  /**
   * Get password reset email HTML template
   */
  private getPasswordResetEmailTemplate(resetUrl: string, expirationTime: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f7;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 30px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 10px 0 0;
      font-size: 16px;
      opacity: 0.9;
    }
    .content {
      padding: 40px 30px;
      color: #333333;
    }
    .content h2 {
      margin: 0 0 20px;
      font-size: 22px;
      color: #1a1a1a;
      font-weight: 600;
    }
    .content p {
      margin: 0 0 20px;
      font-size: 16px;
      color: #666666;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      margin: 20px 0;
      transition: transform 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box p {
      margin: 0;
      font-size: 14px;
      color: #555555;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #999999;
      font-size: 13px;
    }
    .footer p {
      margin: 5px 0;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .container {
        margin: 20px;
      }
      .header, .content, .footer {
        padding: 30px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔒 PDFLab</h1>
      <p>Password Reset Request</p>
    </div>
    <div class="content">
      <h2>Reset Your Password</h2>
      <p>We received a request to reset the password for your PDFLab account. Click the button below to create a new password:</p>

      <center>
        <a href="${resetUrl}" class="button">Reset Password</a>
      </center>

      <div class="info-box">
        <p><strong>⏱️ This link will expire in ${expirationTime}.</strong></p>
      </div>

      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #667eea; font-size: 14px;">${resetUrl}</p>

      <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee;">
        If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
      </p>
    </div>
    <div class="footer">
      <p><strong>PDFLab</strong> - Professional PDF Conversion Platform</p>
      <p>
        <a href="${process.env['FRONTEND_URL'] || 'http://localhost:3000'}">Visit Website</a> •
        <a href="${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/support">Support</a>
      </p>
      <p>© ${new Date().getFullYear()} PDFLab. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }

  /**
   * Send welcome email (without verification)
   */
  async sendWelcomeEmail(email: string, userName?: string): Promise<boolean> {
    const html = this.getWelcomeEmailTemplate(userName)
    const text = `
Welcome to PDFLab${userName ? `, ${userName}` : ''}!

Thank you for joining PDFLab - the professional PDF conversion platform.

You now have access to:
- Convert PDFs to DOCX, PPTX, XLSX, PNG
- Compress PDFs to reduce file size
- Merge multiple PDFs into one
- Batch processing for multiple files
- Fast, secure cloud processing

Get started by logging in to your dashboard:
${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/dashboard

Need help? Visit our support page:
${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/support

Best regards,
The PDFLab Team
    `.trim()

    return await this.sendEmail({
      to: email,
      subject: 'Welcome to PDFLab!',
      html,
      text,
    })
  }

  /**
   * Send payment receipt email
   */
  async sendPaymentReceiptEmail(
    email: string,
    paymentDetails: {
      plan: string
      amount: string
      currency: string
      transactionId: string
      billingDate: string
      nextBillingDate: string
    }
  ): Promise<boolean> {
    const html = this.getPaymentReceiptTemplate(paymentDetails)
    const text = `
Payment Receipt - PDFLab

Thank you for your payment!

Plan: ${paymentDetails.plan}
Amount: ${paymentDetails.currency} ${paymentDetails.amount}
Transaction ID: ${paymentDetails.transactionId}
Billing Date: ${paymentDetails.billingDate}
Next Billing Date: ${paymentDetails.nextBillingDate}

Your subscription is now active. You can view your subscription details in your dashboard:
${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/dashboard

Questions? Contact us:
${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/support

Best regards,
The PDFLab Team
    `.trim()

    return await this.sendEmail({
      to: email,
      subject: `Payment Receipt - ${paymentDetails.plan} Plan`,
      html,
      text,
    })
  }

  /**
   * Send subscription cancellation email
   */
  async sendSubscriptionCancelledEmail(
    email: string,
    cancellationDetails: {
      plan: string
      cancellationDate: string
      accessUntil: string
    }
  ): Promise<boolean> {
    const html = this.getSubscriptionCancelledTemplate(cancellationDetails)
    const text = `
Subscription Cancelled - PDFLab

Your ${cancellationDetails.plan} subscription has been cancelled.

Cancellation Date: ${cancellationDetails.cancellationDate}
Access Until: ${cancellationDetails.accessUntil}

You will continue to have access to your plan benefits until ${cancellationDetails.accessUntil}.

Changed your mind? You can reactivate your subscription anytime from your dashboard:
${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/dashboard

We're sad to see you go! If you have feedback on how we can improve, please let us know:
${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/support

Best regards,
The PDFLab Team
    `.trim()

    return await this.sendEmail({
      to: email,
      subject: 'Subscription Cancelled - PDFLab',
      html,
      text,
    })
  }

  /**
   * Get email verification HTML template
   */
  private getVerificationEmailTemplate(verificationUrl: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f7;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 30px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 10px 0 0;
      font-size: 16px;
      opacity: 0.9;
    }
    .content {
      padding: 40px 30px;
      color: #333333;
    }
    .content h2 {
      margin: 0 0 20px;
      font-size: 22px;
      color: #1a1a1a;
      font-weight: 600;
    }
    .content p {
      margin: 0 0 20px;
      font-size: 16px;
      color: #666666;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      margin: 20px 0;
      transition: transform 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
    }
    .features {
      background-color: #f8f9fa;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
    }
    .features ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    .features li {
      margin: 8px 0;
      color: #555555;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #999999;
      font-size: 13px;
    }
    .footer p {
      margin: 5px 0;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .container {
        margin: 20px;
      }
      .header, .content, .footer {
        padding: 30px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✉️ Welcome to PDFLab</h1>
      <p>Verify your email address</p>
    </div>
    <div class="content">
      <h2>Thanks for signing up!</h2>
      <p>We're excited to have you on board. To get started with PDFLab, please verify your email address by clicking the button below:</p>

      <center>
        <a href="${verificationUrl}" class="button">Verify Email Address</a>
      </center>

      <div class="features">
        <p><strong>With PDFLab, you can:</strong></p>
        <ul>
          <li>📄 Convert PDFs to DOCX, PPTX, XLSX</li>
          <li>🖼️ Extract images from PDFs</li>
          <li>🔀 Merge multiple PDFs</li>
          <li>⚡ Fast, secure cloud processing</li>
        </ul>
      </div>

      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #667eea; font-size: 14px;">${verificationUrl}</p>

      <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee;">
        If you didn't create this account, you can safely ignore this email.
      </p>
    </div>
    <div class="footer">
      <p><strong>PDFLab</strong> - Professional PDF Conversion Platform</p>
      <p>
        <a href="${process.env['FRONTEND_URL'] || 'http://localhost:3000'}">Visit Website</a> •
        <a href="${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/support">Support</a>
      </p>
      <p>© ${new Date().getFullYear()} PDFLab. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }

  /**
   * Get welcome email HTML template
   */
  private getWelcomeEmailTemplate(userName?: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to PDFLab</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f7;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 30px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 10px 0 0;
      font-size: 16px;
      opacity: 0.9;
    }
    .content {
      padding: 40px 30px;
      color: #333333;
    }
    .content h2 {
      margin: 0 0 20px;
      font-size: 22px;
      color: #1a1a1a;
      font-weight: 600;
    }
    .content p {
      margin: 0 0 20px;
      font-size: 16px;
      color: #666666;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      margin: 20px 0;
      transition: transform 0.2s;
    }
    .features {
      background-color: #f8f9fa;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
    }
    .features ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    .features li {
      margin: 8px 0;
      color: #555555;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #999999;
      font-size: 13px;
    }
    .footer p {
      margin: 5px 0;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to PDFLab!</h1>
      <p>Your account is ready</p>
    </div>
    <div class="content">
      <h2>Hi${userName ? ` ${userName}` : ''}!</h2>
      <p>Thank you for joining PDFLab - the professional PDF conversion platform trusted by thousands of users worldwide.</p>

      <div class="features">
        <p><strong>You now have access to:</strong></p>
        <ul>
          <li>📄 Convert PDFs to DOCX, PPTX, XLSX, PNG</li>
          <li>🗜️ Compress PDFs to reduce file size</li>
          <li>🔀 Merge multiple PDFs into one</li>
          <li>⚡ Batch processing for multiple files</li>
          <li>🔒 Fast, secure cloud processing</li>
        </ul>
      </div>

      <center>
        <a href="${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/dashboard" class="button">Go to Dashboard</a>
      </center>

      <p style="margin-top: 30px;">Need help getting started? Check out our <a href="${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/support" style="color: #667eea;">support page</a> or reply to this email.</p>
    </div>
    <div class="footer">
      <p><strong>PDFLab</strong> - Professional PDF Conversion Platform</p>
      <p>
        <a href="${process.env['FRONTEND_URL'] || 'http://localhost:3000'}">Visit Website</a> •
        <a href="${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/support">Support</a>
      </p>
      <p>© ${new Date().getFullYear()} PDFLab. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }

  /**
   * Get payment receipt HTML template
   */
  private getPaymentReceiptTemplate(paymentDetails: {
    plan: string
    amount: string
    currency: string
    transactionId: string
    billingDate: string
    nextBillingDate: string
  }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f7;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      padding: 40px 30px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 10px 0 0;
      font-size: 16px;
      opacity: 0.9;
    }
    .content {
      padding: 40px 30px;
      color: #333333;
    }
    .content h2 {
      margin: 0 0 20px;
      font-size: 22px;
      color: #1a1a1a;
      font-weight: 600;
    }
    .content p {
      margin: 0 0 20px;
      font-size: 16px;
      color: #666666;
    }
    .receipt-details {
      background-color: #f8f9fa;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
      border-left: 4px solid #10b981;
    }
    .receipt-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .receipt-row:last-child {
      border-bottom: none;
      font-weight: 600;
      font-size: 18px;
      padding-top: 12px;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #999999;
      font-size: 13px;
    }
    .footer p {
      margin: 5px 0;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Payment Successful</h1>
      <p>Thank you for your payment</p>
    </div>
    <div class="content">
      <h2>Payment Receipt</h2>
      <p>Your payment has been processed successfully. Here are your transaction details:</p>

      <div class="receipt-details">
        <div class="receipt-row">
          <span>Plan:</span>
          <span><strong>${paymentDetails.plan}</strong></span>
        </div>
        <div class="receipt-row">
          <span>Transaction ID:</span>
          <span style="font-family: monospace; font-size: 14px;">${paymentDetails.transactionId}</span>
        </div>
        <div class="receipt-row">
          <span>Billing Date:</span>
          <span>${paymentDetails.billingDate}</span>
        </div>
        <div class="receipt-row">
          <span>Next Billing Date:</span>
          <span>${paymentDetails.nextBillingDate}</span>
        </div>
        <div class="receipt-row">
          <span>Amount Paid:</span>
          <span>${paymentDetails.currency} ${paymentDetails.amount}</span>
        </div>
      </div>

      <p>Your subscription is now active! You can view your subscription details and manage your account in your dashboard.</p>

      <center>
        <a href="${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/dashboard" class="button">View Dashboard</a>
      </center>

      <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee; font-size: 14px;">
        Questions about your payment? Contact us at <a href="${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/support" style="color: #667eea;">support</a>.
      </p>
    </div>
    <div class="footer">
      <p><strong>PDFLab</strong> - Professional PDF Conversion Platform</p>
      <p>
        <a href="${process.env['FRONTEND_URL'] || 'http://localhost:3000'}">Visit Website</a> •
        <a href="${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/support">Support</a>
      </p>
      <p>© ${new Date().getFullYear()} PDFLab. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }

  /**
   * Get subscription cancelled HTML template
   */
  private getSubscriptionCancelledTemplate(cancellationDetails: {
    plan: string
    cancellationDate: string
    accessUntil: string
  }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Cancelled</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f7;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 30px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 10px 0 0;
      font-size: 16px;
      opacity: 0.9;
    }
    .content {
      padding: 40px 30px;
      color: #333333;
    }
    .content h2 {
      margin: 0 0 20px;
      font-size: 22px;
      color: #1a1a1a;
      font-weight: 600;
    }
    .content p {
      margin: 0 0 20px;
      font-size: 16px;
      color: #666666;
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box p {
      margin: 0;
      font-size: 14px;
      color: #555555;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #999999;
      font-size: 13px;
    }
    .footer p {
      margin: 5px 0;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Subscription Cancelled</h1>
      <p>We're sad to see you go</p>
    </div>
    <div class="content">
      <h2>Your subscription has been cancelled</h2>
      <p>Your <strong>${cancellationDetails.plan}</strong> subscription has been successfully cancelled.</p>

      <div class="info-box">
        <p><strong>Cancellation Date:</strong> ${cancellationDetails.cancellationDate}</p>
        <p><strong>Access Until:</strong> ${cancellationDetails.accessUntil}</p>
      </div>

      <p>You will continue to have access to all ${cancellationDetails.plan} features until <strong>${cancellationDetails.accessUntil}</strong>. After that, your account will be downgraded to the Free plan.</p>

      <p>Changed your mind? You can reactivate your subscription anytime from your dashboard.</p>

      <center>
        <a href="${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/dashboard" class="button">Go to Dashboard</a>
      </center>

      <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee;">
        We'd love to hear your feedback! If there's anything we could have done better, please <a href="${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/support" style="color: #667eea;">let us know</a>.
      </p>
    </div>
    <div class="footer">
      <p><strong>PDFLab</strong> - Professional PDF Conversion Platform</p>
      <p>
        <a href="${process.env['FRONTEND_URL'] || 'http://localhost:3000'}">Visit Website</a> •
        <a href="${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/support">Support</a>
      </p>
      <p>© ${new Date().getFullYear()} PDFLab. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }
}

export default new EmailService()
