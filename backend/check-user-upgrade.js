/**
 * Diagnostic Script: Check User Upgrade Status
 *
 * This script checks:
 * 1. User's current plan and conversion limits
 * 2. Payment logs for the user
 * 3. Subscription records
 * 4. ITN webhook data
 */

const { Sequelize, DataTypes } = require('sequelize');

// Database connection
const sequelize = new Sequelize('pdflab', 'pdflab', '***REMOVED***', {
  host: 'localhost',
  port: 3306,
  dialect: 'mysql',
  logging: false
});

async function checkUserUpgrade(userEmail) {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected\n');

    // Get user details
    const [users] = await sequelize.query(`
      SELECT id, email, name, plan, conversions_used, conversions_limit,
             subscription_id, subscription_status, created_at, updated_at
      FROM users
      WHERE email = :email
    `, {
      replacements: { email: userEmail }
    });

    if (users.length === 0) {
      console.log('❌ User not found:', userEmail);
      process.exit(1);
    }

    const user = users[0];
    console.log('👤 USER DETAILS:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Name:', user.name);
    console.log('   Plan:', user.plan);
    console.log('   Conversions Used:', user.conversions_used);
    console.log('   Conversions Limit:', user.conversions_limit);
    console.log('   Subscription ID:', user.subscription_id);
    console.log('   Subscription Status:', user.subscription_status);
    console.log('   Last Updated:', user.updated_at);
    console.log('');

    // Get subscriptions
    const [subscriptions] = await sequelize.query(`
      SELECT id, user_id, plan, status, amount, currency,
             payfast_token, payfast_subscription_id,
             billing_date, next_billing_date,
             started_at, canceled_at, ended_at,
             created_at, updated_at
      FROM subscriptions
      WHERE user_id = :userId
      ORDER BY created_at DESC
    `, {
      replacements: { userId: user.id }
    });

    console.log('📋 SUBSCRIPTIONS (' + subscriptions.length + ' total):');
    if (subscriptions.length === 0) {
      console.log('   No subscriptions found');
    } else {
      subscriptions.forEach((sub, index) => {
        console.log(`\n   [${index + 1}] Subscription ID: ${sub.id}`);
        console.log('       Plan:', sub.plan);
        console.log('       Status:', sub.status);
        console.log('       Amount:', sub.amount, sub.currency);
        console.log('       PayFast Token:', sub.payfast_token || 'N/A');
        console.log('       PayFast Subscription ID:', sub.payfast_subscription_id || 'N/A');
        console.log('       Billing Date:', sub.billing_date || 'N/A');
        console.log('       Next Billing:', sub.next_billing_date || 'N/A');
        console.log('       Started:', sub.started_at);
        console.log('       Created:', sub.created_at);
        console.log('       Updated:', sub.updated_at);
      });
    }
    console.log('');

    // Get payment logs
    const [payments] = await sequelize.query(`
      SELECT id, user_id, subscription_id, transaction_id,
             payfast_payment_id, payment_type, status,
             amount_gross, amount_fee, amount_net, currency,
             plan, name_first, email_address,
             itn_data, error_message,
             created_at, processed_at
      FROM payment_logs
      WHERE user_id = :userId
      ORDER BY created_at DESC
      LIMIT 5
    `, {
      replacements: { userId: user.id }
    });

    console.log('💳 PAYMENT LOGS (latest 5):');
    if (payments.length === 0) {
      console.log('   No payment logs found');
    } else {
      payments.forEach((payment, index) => {
        console.log(`\n   [${index + 1}] Payment ID: ${payment.id}`);
        console.log('       Transaction ID:', payment.transaction_id);
        console.log('       PayFast Payment ID:', payment.payfast_payment_id || 'N/A');
        console.log('       Type:', payment.payment_type);
        console.log('       Status:', payment.status);
        console.log('       Plan:', payment.plan);
        console.log('       Amount:', payment.amount_gross, payment.currency);
        console.log('       Fee:', payment.amount_fee);
        console.log('       Net:', payment.amount_net);
        console.log('       Subscription ID:', payment.subscription_id);
        console.log('       Created:', payment.created_at);
        console.log('       Processed:', payment.processed_at || 'Not processed');

        if (payment.error_message) {
          console.log('       ❌ Error:', payment.error_message);
        }

        if (payment.itn_data) {
          console.log('       ITN Data:', typeof payment.itn_data === 'string' ?
            payment.itn_data.substring(0, 100) + '...' :
            JSON.stringify(payment.itn_data).substring(0, 100) + '...');
        }
      });
    }
    console.log('');

    // Analysis
    console.log('🔍 ANALYSIS:');

    const pendingSubscriptions = subscriptions.filter(s => s.status === 'pending');
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
    const completePayments = payments.filter(p => p.status === 'complete');
    const pendingPayments = payments.filter(p => p.status === 'pending');
    const failedPayments = payments.filter(p => p.status === 'failed');

    console.log('   Pending Subscriptions:', pendingSubscriptions.length);
    console.log('   Active Subscriptions:', activeSubscriptions.length);
    console.log('   Complete Payments:', completePayments.length);
    console.log('   Pending Payments:', pendingPayments.length);
    console.log('   Failed Payments:', failedPayments.length);
    console.log('');

    // Diagnosis
    console.log('📊 DIAGNOSIS:');

    if (user.plan === 'free' && pendingSubscriptions.length > 0) {
      console.log('   ⚠️  User has pending subscription but still on FREE plan');
      console.log('   → Likely issue: ITN webhook not received or failed');
      console.log('');
      console.log('   Possible causes:');
      console.log('   1. PayFast webhook not sent yet (check PayFast dashboard)');
      console.log('   2. Webhook URL not configured correctly');
      console.log('   3. Webhook received but validation failed');
      console.log('   4. Webhook received but processing error occurred');
      console.log('');

      const latestPayment = payments[0];
      if (latestPayment && latestPayment.status === 'pending') {
        console.log('   Latest payment still PENDING');
        console.log('   → Payment not confirmed by PayFast yet');
      }

      if (latestPayment && latestPayment.status === 'complete') {
        console.log('   ❌ CRITICAL: Payment marked COMPLETE but user not upgraded!');
        console.log('   → This indicates webhook processed payment but failed to update user');
        console.log('   → Manual intervention required');
      }
    } else if (user.plan === 'free' && completePayments.length > 0) {
      console.log('   ❌ CRITICAL: User has COMPLETE payments but still on FREE plan!');
      console.log('   → Webhook received payment confirmation but user upgrade failed');
      console.log('   → Manual upgrade needed');
    } else if (user.plan !== 'free' && activeSubscriptions.length > 0) {
      console.log('   ✅ User successfully upgraded to plan:', user.plan);
      console.log('   ✅ Active subscription exists');
    } else {
      console.log('   ℹ️  User status appears normal');
    }

    await sequelize.close();
    console.log('\n✓ Analysis complete');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Get user email from command line or use default
const userEmail = process.argv[2] || 'testuser@pdflab.com';

console.log('🔍 PDFLab User Upgrade Diagnostic Tool');
console.log('========================================');
console.log('Checking user:', userEmail);
console.log('');

checkUserUpgrade(userEmail);
