/**
 * Direct partner approval script - bypasses API authentication
 * Directly updates database and sends email
 */

const PartnerApplication = require('./dist/models/PartnerApplication').default;
const { Partner } = require('./dist/models/Partner');
const emailService = require('./dist/services/email.service').default;
const { sequelize } = require('./dist/config/database');

async function approvePartnerDirectly() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Find pending application
    const pendingApp = await PartnerApplication.findOne({
      where: { status: 'pending' },
      order: [['created_at', 'DESC']]
    });

    if (!pendingApp) {
      console.log('⚠ No pending applications found');
      return;
    }

    console.log(`\n📧 Found pending application:`);
    console.log(`   Email: ${pendingApp.email}`);
    console.log(`   Name: ${pendingApp.full_name}`);
    console.log(`   Platform: ${pendingApp.primary_platform}`);
    console.log(`   Applied: ${new Date(pendingApp.created_at).toLocaleString()}`);

    // Generate partner codes and slug
    const timestamp = Date.now();
    const partnerCode = `PLAT-${timestamp}`;
    const referralCode = `PLAT${timestamp}`;
    const slug = pendingApp.full_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Create partner record with PLATINUM tier
    console.log('\n🎉 Creating PLATINUM tier partner...');
    const partner = await Partner.create({
      name: pendingApp.full_name,
      email: pendingApp.email,
      slug: slug,
      referral_code: referralCode,
      partner_code: partnerCode,
      commission_tier: 'platinum', // 60% commission rate
      commission_rate: 60.0,
      total_conversions: 0,
      total_revenue: 0,
      total_commission: 0,
      is_active: true
    });

    console.log('✅ Partner created:', partner.partner_code);

    // Update application status
    await pendingApp.update({
      status: 'approved',
      reviewed_at: new Date(),
      admin_notes: 'PLATINUM tier approval - Testing new 60% commission tier system'
    });

    console.log('✅ Application marked as approved');

    // Send email
    console.log('\n📧 Sending approval email...');

    await emailService.sendPartnerApprovalEmail({
      email: partner.email,
      full_name: partner.name,
      partner_code: partner.referral_code,
      commission_tier: partner.commission_tier,
      commission_rate: partner.commission_rate
    });

    console.log('✅ Email sent successfully!');
    console.log(`\n🎊 Partner approved with PLATINUM tier (60% commission)`);
    console.log(`   Partner Code: ${partner.partner_code}`);
    console.log(`   Email: ${partner.email}`);
    console.log(`   Dashboard: https://partners.pdflab.pro/${partner.partner_code.toLowerCase()}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

approvePartnerDirectly();
