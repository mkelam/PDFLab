// Test email sending
const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  console.log('Testing email with:');
  console.log('Host:', process.env.SMTP_HOST);
  console.log('Port:', process.env.SMTP_PORT);
  console.log('User:', process.env.SMTP_USER);
  console.log('From:', process.env.SMTP_FROM_EMAIL);
  console.log('');

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: 'mmkela@fnb.co.za',
      subject: 'PDFLab - Email Test',
      text: 'This is a test email from PDFLab to verify email configuration is working correctly.',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 40px auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px; }
            h1 { color: #667eea; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ Email Configuration Test</h1>
            <p>Hello,</p>
            <p>This is a test email from <strong>PDFLab</strong> to verify that the email configuration is working correctly.</p>
            <p>If you're reading this, it means:</p>
            <ul>
              <li>✅ SMTP server connection successful</li>
              <li>✅ Authentication working</li>
              <li>✅ Email delivery functional</li>
            </ul>
            <p>Your PDFLab email service is now ready for production!</p>
            <div class="footer">
              <p><strong>PDFLab</strong> - Professional PDF Conversion Platform</p>
              <p>© 2025 PDFLab. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log('✓ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    process.exit(0);
  } catch (error) {
    console.error('✗ Email sending failed:');
    console.error('Error:', error.message);
    if (error.code) console.error('Code:', error.code);
    if (error.command) console.error('Command:', error.command);
    process.exit(1);
  }
}

testEmail();
