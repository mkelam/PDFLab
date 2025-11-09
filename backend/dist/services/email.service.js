"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = __importDefault(require("nodemailer"));
class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }
    /**
     * Initialize nodemailer transporter
     */
    initializeTransporter() {
        const emailConfig = {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        };
        // Only initialize if SMTP credentials are provided
        if (emailConfig.auth.user && emailConfig.auth.pass) {
            this.transporter = nodemailer_1.default.createTransport(emailConfig);
            console.log('✓ Email service initialized with SMTP:', emailConfig.host);
        }
        else {
            console.warn('⚠ Email service not configured - missing SMTP credentials');
            console.warn('  Emails will be logged to console only (development mode)');
        }
    }
    /**
     * Send email
     */
    async sendEmail(options) {
        try {
            // If transporter is not configured, log to console (development mode)
            if (!this.transporter) {
                console.log('='.repeat(80));
                console.log('EMAIL (Development Mode - Not Sent)');
                console.log('='.repeat(80));
                console.log(`To: ${options.to}`);
                console.log(`Subject: ${options.subject}`);
                console.log(`Text: ${options.text || 'See HTML content'}`);
                console.log('='.repeat(80));
                return true;
            }
            // Send email via SMTP
            const mailOptions = {
                from: `"${process.env.SMTP_FROM_NAME || 'PDFLab'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
                to: options.to,
                subject: options.subject,
                text: options.text,
                html: options.html,
            };
            await this.transporter.sendMail(mailOptions);
            console.log(`✓ Email sent successfully to ${options.to}`);
            return true;
        }
        catch (error) {
            console.error('✗ Failed to send email:', error);
            return false;
        }
    }
    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email, resetToken) {
        const resetUrl = `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        const expirationTime = '1 hour';
        const html = this.getPasswordResetEmailTemplate(resetUrl, expirationTime);
        const text = `
Password Reset Request

You requested to reset your password for your PDFLab account.

Click the link below to reset your password:
${resetUrl}

This link will expire in ${expirationTime}.

If you didn't request this, please ignore this email. Your password will remain unchanged.

Best regards,
The PDFLab Team
    `.trim();
        return await this.sendEmail({
            to: email,
            subject: 'Reset your PDFLab password',
            html,
            text,
        });
    }
    /**
     * Send verification email
     */
    async sendVerificationEmail(email, verificationToken) {
        const verificationUrl = `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
        const html = this.getVerificationEmailTemplate(verificationUrl);
        const text = `
Welcome to PDFLab!

Please verify your email address by clicking the link below:
${verificationUrl}

If you didn't create this account, please ignore this email.

Best regards,
The PDFLab Team
    `.trim();
        return await this.sendEmail({
            to: email,
            subject: 'Verify your PDFLab email',
            html,
            text,
        });
    }
    /**
     * Get password reset email HTML template
     */
    getPasswordResetEmailTemplate(resetUrl, expirationTime) {
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
    `.trim();
    }
    /**
     * Get email verification HTML template
     */
    getVerificationEmailTemplate(verificationUrl) {
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
    `.trim();
    }
}
exports.default = new EmailService();
//# sourceMappingURL=email.service.js.map