// PayFast Signature Debug Script for Production Issue
// Tests signature generation with and without passphrase

const crypto = require('crypto');

// Production credentials (from .env.production)
const PAYFAST_CONFIG = {
  merchantId: '25263515',
  merchantKey: process.env.PAYFAST_MERCHANT_KEY || '',
  passphrase: process.env.PAYFAST_PASSPHRASE || '', // From environment
  mode: process.env.PAYFAST_MODE || 'production'
};

// Sample payment data (from actual production request)
const paymentData = {
  merchant_id: '25263515',
  merchant_key: process.env.PAYFAST_MERCHANT_KEY || '',
  return_url: 'https://pdflab.pro/payment/success',
  cancel_url: 'https://pdflab.pro/payment/cancel',
  notify_url: 'https://pdflab.pro/api/payfast/webhook',
  name_first: 'Test',
  name_last: 'User',
  email_address: 'test@example.com',
  m_payment_id: 'test-12345',
  amount: '9.99',
  item_name: 'PDFLab Starter Plan',
  item_description: 'PDFLab Starter monthly subscription',
  custom_str1: 'user-id-123',
  custom_str2: 'starter',
  email_confirmation: '1',
  confirmation_address: 'test@example.com',
  subscription_type: '1',
  billing_date: '2025-12-08',
  recurring_amount: '9.99',
  frequency: '3',
  cycles: '0'
};

// PayFast parameter order (CRITICAL - must match exactly)
const PAYFAST_PARAM_ORDER = [
  'merchant_id',
  'merchant_key',
  'return_url',
  'cancel_url',
  'notify_url',
  'name_first',
  'name_last',
  'email_address',
  'cell_number',
  'm_payment_id',
  'amount',
  'item_name',
  'item_description',
  'custom_int1',
  'custom_int2',
  'custom_int3',
  'custom_int4',
  'custom_int5',
  'custom_str1',
  'custom_str2',
  'custom_str3',
  'custom_str4',
  'custom_str5',
  'email_confirmation',
  'confirmation_address',
  'payment_method',
  'subscription_type',
  'billing_date',
  'recurring_amount',
  'frequency',
  'cycles'
];

function generateSignature(data, passphrase = '') {
  let paramString = '';

  for (const key of PAYFAST_PARAM_ORDER) {
    if (key !== 'signature' && data[key] !== '' && data[key] !== null && data[key] !== undefined) {
      paramString += `${key}=${encodeURIComponent(String(data[key]).trim()).replace(/%20/g, '+')} &`;
    }
  }

  // Remove last ampersand
  paramString = paramString.slice(0, -1);

  // Add passphrase if provided
  if (passphrase) {
    paramString += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`;
  }

  console.log('\n📝 Parameter String (first 200 chars):');
  console.log(paramString.substring(0, 200) + '...');
  console.log(`\n📏 Total length: ${paramString.length} characters`);

  // Generate MD5 hash
  const signature = crypto.createHash('md5').update(paramString).digest('hex').toLowerCase();

  return signature;
}

console.log('=================================================');
console.log('🔍 PayFast Signature Debug - Production Issue');
console.log('=================================================\n');

console.log('📊 Configuration:');
console.log(`  Merchant ID: ${PAYFAST_CONFIG.merchantId}`);
console.log(`  Merchant Key: ${PAYFAST_CONFIG.merchantKey}`);
console.log(`  Passphrase: ${PAYFAST_CONFIG.passphrase || '(EMPTY)'}`);
console.log(`  Mode: ${PAYFAST_CONFIG.mode}`);
console.log('');

console.log('💳 Payment Data:');
console.log(`  Amount: $${paymentData.amount} USD`);
console.log(`  Plan: ${paymentData.item_name}`);
console.log(`  Subscription: ${paymentData.subscription_type === '1' ? 'Recurring' : 'One-time'}`);
console.log('');

// Test 1: Without passphrase (current production setup)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 1: Signature WITHOUT Passphrase (Current)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const signatureWithoutPassphrase = generateSignature(paymentData, '');
console.log(`\n✅ Generated Signature: ${signatureWithoutPassphrase}`);
console.log('');

// Test 2: With sample passphrase
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 2: Signature WITH Passphrase (If Set)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const samplePassphrase = 'YourPassphraseHere'; // Replace with actual from dashboard
const signatureWithPassphrase = generateSignature(paymentData, samplePassphrase);
console.log(`\n✅ Generated Signature: ${signatureWithPassphrase}`);
console.log('');

console.log('=================================================');
console.log('🎯 DIAGNOSIS:');
console.log('=================================================\n');

console.log('❓ Possible Issues:');
console.log('');
console.log('1. ⚠️  MISSING PASSPHRASE');
console.log('   - PayFast production REQUIRES passphrase for recurring billing');
console.log('   - Current .env has PAYFAST_PASSPHRASE=  (empty)');
console.log('   - Check PayFast Dashboard: Settings > Integration > Security');
console.log('');
console.log('2. ⚠️  INCORRECT COMMENT IN CODE');
console.log('   - Code says "only for sandbox mode"');
console.log('   - This is WRONG - production also needs passphrase');
console.log('');
console.log('3. ✅ PARAMETER ORDER');
console.log('   - Using correct PayFast parameter order');
console.log('   - Not alphabetical (common mistake)');
console.log('');

console.log('=================================================');
console.log('🔧 SOLUTION:');
console.log('=================================================\n');

console.log('Step 1: Get Passphrase from PayFast Dashboard');
console.log('  1. Log into https://www.payfast.co.za');
console.log('  2. Go to Settings > Integration');
console.log('  3. Find "Passphrase" field');
console.log('  4. If empty, generate one (or leave empty if PayFast allows)');
console.log('');

console.log('Step 2: Update Production .env');
console.log('  SSH to VPS:');
console.log('    ssh root@141.136.44.168');
console.log('    nano /var/pdflab/app/backend/.env.production');
console.log('  ');
console.log('  Update line:');
console.log('    PAYFAST_PASSPHRASE=YourActualPassphrase');
console.log('');

console.log('Step 3: Restart Backend');
console.log('  docker restart pdflab-backend-prod');
console.log('');

console.log('Step 4: Test Payment Again');
console.log('  Try payment flow - signature should match!');
console.log('');

console.log('=================================================\n');

console.log('📚 Reference: PayFast Docs');
console.log('https://developers.payfast.co.za/docs#signature_generation');
console.log('');
