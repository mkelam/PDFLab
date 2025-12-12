// Test PayFast signature with actual passphrase
const crypto = require('crypto');

const PAYFAST_PASSPHRASE = process.env.PAYFAST_PASSPHRASE || '';
if (!PAYFAST_PASSPHRASE) {
  throw new Error('Missing env var: PAYFAST_PASSPHRASE');
}

// Sample payment data
const paymentData = {
  merchant_id: '25263515',
  merchant_key: process.env.PAYFAST_MERCHANT_KEY || 'change_me',
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

const PAYFAST_PARAM_ORDER = [
  'merchant_id', 'merchant_key', 'return_url', 'cancel_url', 'notify_url',
  'name_first', 'name_last', 'email_address', 'cell_number', 'm_payment_id',
  'amount', 'item_name', 'item_description',
  'custom_int1', 'custom_int2', 'custom_int3', 'custom_int4', 'custom_int5',
  'custom_str1', 'custom_str2', 'custom_str3', 'custom_str4', 'custom_str5',
  'email_confirmation', 'confirmation_address', 'payment_method',
  'subscription_type', 'billing_date', 'recurring_amount', 'frequency', 'cycles'
];

function generateSignature(data, passphrase = '') {
  let paramString = '';

  for (const key of PAYFAST_PARAM_ORDER) {
    if (key !== 'signature' && data[key] !== '' && data[key] !== null && data[key] !== undefined) {
      paramString += `${key}=${encodeURIComponent(String(data[key]).trim()).replace(/%20/g, '+')}&`;
    }
  }

  paramString = paramString.slice(0, -1);

  if (passphrase) {
    paramString += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`;
  }

  return crypto.createHash('md5').update(paramString).digest('hex').toLowerCase();
}

console.log('==============================================');
console.log('✅ PayFast Signature with Actual Passphrase');
console.log('==============================================\n');

const signature = generateSignature(paymentData, PAYFAST_PASSPHRASE);

console.log('📊 Configuration:');
console.log(`  Passphrase: ${PAYFAST_PASSPHRASE}`);
console.log('');

console.log('💳 Payment Data:');
console.log(`  Amount: $${paymentData.amount} USD`);
console.log(`  Plan: ${paymentData.item_name}`);
console.log('');

console.log('🔐 Generated Signature:');
console.log(`  ${signature}`);
console.log('');

console.log('✅ This signature should now work with PayFast!');
console.log('');
console.log('Next: Try payment at https://pdflab.pro/pricing');
console.log('');
