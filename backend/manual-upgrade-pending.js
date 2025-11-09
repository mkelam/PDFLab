/**
 * Manual Upgrade Script for Pending Subscriptions
 *
 * This script manually activates the 10 pending subscriptions that were
 * blocked by the webhook issue before the fix was deployed.
 */

const { Sequelize, DataTypes } = require('sequelize');

// Database connection
const sequelize = new Sequelize('pdflab', 'pdflab', '***REMOVED***', {
  host: 'localhost',
  port: 3306,
  dialect: 'mysql',
  logging: false
});

// Conversion limits by plan
const PLAN_LIMITS = {
  starter: 100,
  pro: 999999,      // Unlimited
  enterprise: 999999 // Unlimited
};

async function upgradePendingSubscriptions() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected\n');

    // Get all pending subscriptions
    const [subscriptions] = await sequelize.query(`
      SELECT
        s.id as subscription_id,
        s.user_id,
        s.plan,
        s.amount,
        s.currency,
        s.created_at,
        u.email,
        u.name,
        u.plan as current_plan,
        u.conversions_used,
        u.conversions_limit
      FROM subscriptions s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.status = 'pending'
      ORDER BY s.created_at ASC
    `);

    if (subscriptions.length === 0) {
      console.log('✅ No pending subscriptions found! All users are upgraded.\n');
      process.exit(0);
    }

    console.log(`Found ${subscriptions.length} pending subscriptions\n`);
    console.log('================================================');

    // Show summary
    subscriptions.forEach((sub, index) => {
      console.log(`${index + 1}. ${sub.email}`);
      console.log(`   Current Plan: ${sub.current_plan}`);
      console.log(`   Pending Upgrade: ${sub.plan}`);
      console.log(`   Amount Paid: ${sub.currency} ${sub.amount}`);
      console.log(`   Date: ${sub.created_at}`);
      console.log('');
    });

    console.log('================================================\n');
    console.log('⚠️  This script will:');
    console.log('   1. Activate all pending subscriptions');
    console.log('   2. Update user plans');
    console.log('   3. Set conversion limits');
    console.log('   4. Reset conversion usage to 0\n');

    // In production, you might want to add a confirmation prompt here
    // For now, we'll proceed automatically

    console.log('🚀 Starting upgrades...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const sub of subscriptions) {
      try {
        const conversionLimit = PLAN_LIMITS[sub.plan] || 3;

        console.log(`Processing: ${sub.email} → ${sub.plan} plan`);

        // Start transaction
        const transaction = await sequelize.transaction();

        try {
          // 1. Update subscription to active
          await sequelize.query(`
            UPDATE subscriptions
            SET status = 'active',
                billing_date = NOW(),
                next_billing_date = DATE_ADD(NOW(), INTERVAL 30 DAY),
                started_at = NOW()
            WHERE id = ?
          `, {
            replacements: [sub.subscription_id],
            transaction
          });

          // 2. Update user plan and limits
          await sequelize.query(`
            UPDATE users
            SET plan = ?,
                conversions_limit = ?,
                conversions_used = 0,
                subscription_status = 'active',
                updated_at = NOW()
            WHERE id = ?
          `, {
            replacements: [sub.plan, conversionLimit, sub.user_id],
            transaction
          });

          // 3. Update payment log to complete (if exists)
          await sequelize.query(`
            UPDATE payment_logs
            SET status = 'complete',
                processed_at = NOW()
            WHERE subscription_id = ? AND status = 'pending'
          `, {
            replacements: [sub.subscription_id],
            transaction
          });

          await transaction.commit();

          console.log(`   ✅ Upgraded successfully!`);
          console.log(`      Plan: ${sub.current_plan} → ${sub.plan}`);
          console.log(`      Conversions: ${sub.conversions_limit} → ${conversionLimit}`);
          console.log('');

          successCount++;
        } catch (error) {
          await transaction.rollback();
          throw error;
        }
      } catch (error) {
        console.error(`   ❌ Error upgrading ${sub.email}:`, error.message);
        console.log('');
        errorCount++;
      }
    }

    console.log('================================================');
    console.log('📊 UPGRADE SUMMARY:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📋 Total: ${subscriptions.length}`);
    console.log('================================================\n');

    if (successCount > 0) {
      console.log('🎉 Users have been upgraded!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Verify in database: SELECT email, plan, conversions_limit FROM users WHERE plan != "free"');
      console.log('2. Notify affected users their accounts are now upgraded');
      console.log('3. Users should refresh their dashboards to see new limits\n');
    }

    await sequelize.close();
    console.log('✓ Database connection closed');
    process.exit(errorCount > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

// Run the upgrade
console.log('🔧 PDFLab Manual Subscription Upgrade Tool');
console.log('==========================================');
console.log('Date:', new Date().toISOString());
console.log('Target: Pending subscriptions blocked by webhook issue');
console.log('==========================================\n');

upgradePendingSubscriptions();
