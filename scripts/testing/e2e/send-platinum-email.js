/**
 * Send PLATINUM tier approval email to the test partner
 */

const emailService = require('./dist/services/email.service').default;

async function sendEmail() {
  try {
    console.log('📧 Sending PLATINUM tier approval email...\n');

    await emailService.sendPartnerApprovalEmail({
      email: 'claude-test-1763829822@example.com',
      full_name: 'Claude Test Partner',
      partner_code: 'PLAT1763840165385',
      commission_tier: 'platinum',
      commission_rate: 60.0
    });

    console.log('\n✅ Email sent successfully!');
    console.log('📬 Recipient: claude-test-1763829822@example.com');
    console.log('🎊 Tier: PLATINUM (60% commission)');
    console.log('🔑 Partner Code: PLAT1763840165385');

  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

sendEmail();
