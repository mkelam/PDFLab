/**
 * Send PLATINUM tier approval email to the test partner using generic sendEmail method
 */

const emailService = require('./dist/services/email.service').default;

async function sendEmail() {
  try {
    console.log('📧 Sending PLATINUM tier approval email...\n');

    const partnerName = 'Claude Test Partner';
    const partnerEmail = 'claude-test-1763829822@example.com';
    const partnerCode = 'PLAT1763840165385';
    const commissionTier = 'platinum';
    const commissionRate = 60.0;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to PDFLab Partners - PLATINUM Tier!</title>
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
      background: linear-gradient(135deg, #06b6d4 0%, #0e7490 100%);
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
      background: linear-gradient(135deg, #06b6d4 0%, #0e7490 100%);
      color: #ffffff;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
    }
    .info-box h3 {
      margin: 0 0 10px;
      font-size: 18px;
    }
    .info-box p {
      margin: 5px 0;
      color: #ffffff;
      opacity: 0.95;
    }
    .tier-box {
      background-color: #f8f9fa;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
      border-left: 4px solid #06b6d4;
    }
    .tier-box h3 {
      margin: 0 0 15px;
      font-size: 18px;
      color: #1a1a1a;
    }
    .tier-box ul {
      margin: 0;
      padding-left: 20px;
    }
    .tier-box li {
      margin: 8px 0;
      color: #555555;
    }
    .platinum-badge {
      display: inline-block;
      background: linear-gradient(135deg, #06b6d4 0%, #0e7490 100%);
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      margin: 10px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #06b6d4 0%, #0e7490 100%);
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
      color: #06b6d4;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to PDFLab Partners!</h1>
      <p>Your application has been approved</p>
    </div>
    <div class="content">
      <h2>Congratulations, ${partnerName}!</h2>
      <p>We're thrilled to welcome you to the PDFLab Partner Program. Your application has been approved and you've been granted our exclusive <span class="platinum-badge">⭐ PLATINUM TIER</span> status!</p>

      <div class="info-box">
        <h3>Your Partner Details:</h3>
        <p><strong>Partner Code:</strong> ${partnerCode}</p>
        <p><strong>Commission Rate:</strong> ${commissionRate}% (Highest tier!)</p>
        <p><strong>Tier:</strong> ${commissionTier.toUpperCase()}</p>
        <p><strong>Status:</strong> Active</p>
      </div>

      <div class="tier-box">
        <h3>PDFLab Partner Commission Tiers:</h3>
        <ul>
          <li><strong>Bronze (30%):</strong> 0-10 conversions/month</li>
          <li><strong>Silver (40%):</strong> 11-50 conversions/month</li>
          <li><strong>Gold (50%):</strong> 51-100 conversions/month</li>
          <li><strong>⭐ Platinum (60%):</strong> 100+ conversions/month (Elite Partners)</li>
        </ul>
      </div>

      <p>As a PLATINUM tier partner, you'll earn our highest commission rate of <strong>${commissionRate}%</strong> on every conversion generated through your unique referral code.</p>

      <p><strong>How to get started:</strong></p>
      <ol>
        <li>Access your partner dashboard at: <a href="https://partners.pdflab.pro/${partnerCode.toLowerCase()}" style="color: #06b6d4;">https://partners.pdflab.pro/${partnerCode.toLowerCase()}</a></li>
        <li>Share your referral code: <strong>${partnerCode}</strong></li>
        <li>Track your conversions and earnings in real-time</li>
        <li>Get paid monthly for all conversions</li>
      </ol>

      <center>
        <a href="https://partners.pdflab.pro/${partnerCode.toLowerCase()}" class="button">Access Partner Dashboard</a>
      </center>

      <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee;">
        Have questions? We're here to help! Contact us at <a href="mailto:partners@pdflab.pro" style="color: #06b6d4;">partners@pdflab.pro</a>
      </p>
    </div>
    <div class="footer">
      <p><strong>PDFLab Partners</strong> - Elite Partner Program</p>
      <p>
        <a href="https://pdflab.pro">PDFLab</a> •
        <a href="https://partners.pdflab.pro">Partner Portal</a> •
        <a href="mailto:partners@pdflab.pro">Support</a>
      </p>
      <p>© ${new Date().getFullYear()} PDFLab. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const text = `
Welcome to PDFLab Partners - PLATINUM Tier!

Hi ${partnerName},

Congratulations! Your application has been approved and you've been granted PLATINUM tier status - our highest tier!

Your Partner Details:
- Partner Code: ${partnerCode}
- Commission Rate: ${commissionRate}% (Highest tier!)
- Tier: ${commissionTier.toUpperCase()}
- Status: Active

PDFLab Partner Commission Tiers:
- Bronze (30%): 0-10 conversions/month
- Silver (40%): 11-50 conversions/month
- Gold (50%): 51-100 conversions/month
- Platinum (60%): 100+ conversions/month (Elite Partners) ⭐

As a PLATINUM tier partner, you'll earn ${commissionRate}% on every conversion generated through your referral code.

How to get started:
1. Access your partner dashboard: https://partners.pdflab.pro/${partnerCode.toLowerCase()}
2. Share your referral code: ${partnerCode}
3. Track conversions and earnings in real-time
4. Get paid monthly for all conversions

Questions? Contact us at partners@pdflab.pro

Best regards,
The PDFLab Team
    `.trim();

    await emailService.sendEmail({
      to: partnerEmail,
      subject: '🎉 Welcome to PDFLab Partners - PLATINUM Tier!',
      html: html,
      text: text
    });

    console.log('\n✅ Email sent successfully!');
    console.log('📬 Recipient:', partnerEmail);
    console.log('🎊 Tier: PLATINUM (60% commission)');
    console.log('🔑 Partner Code:', partnerCode);

  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

sendEmail();
