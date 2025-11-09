/**
 * PayFast Passphrase Diagnostic Script
 * Tests signature generation with and without passphrase
 *
 * Run: node test-passphrase-scenarios.js
 */

const crypto = require('crypto');

// Test payment data (matching what PayFast would receive)
const testData = {
  merchant_id: '10000100',
  merchant_key: '46f0cd694581a',
  return_url: 'http://localhost:3000/payment/success',
  cancel_url: 'http://localhost:3000/payment/cancel',
  notify_url: 'https://major-eagles-doubt.loca.lt/api/payfast/webhook',
  name_first: 'Test',
  name_last: 'User',
  email_address: 'test@example.com',
  m_payment_id: 'test-' + Date.now(),
  amount: '85.00',
  item_name: 'PDFLab Starter Plan',
  item_description: 'PDFLab Starter monthly subscription',
  custom_str1: 'user-test-id',
  custom_str2: 'starter',
  email_confirmation: '1',
  confirmation_address: 'test@example.com',
  subscription_type: '1',
  billing_date: '2025-12-05',
  recurring_amount: '85.00',
  frequency: '3',
  cycles: '0'
};

// PayFast parameter order (CRITICAL: Must match exactly)
const PAYFAST_PARAM_ORDER = [
  'merchant_id', 'merchant_key', 'return_url', 'cancel_url', 'notify_url',
  'name_first', 'name_last', 'email_address', 'cell_number', 'm_payment_id',
  'amount', 'item_name', 'item_description', 'custom_int1', 'custom_int2',
  'custom_int3', 'custom_int4', 'custom_int5', 'custom_str1', 'custom_str2',
  'custom_str3', 'custom_str4', 'custom_str5', 'email_confirmation',
  'confirmation_address', 'payment_method', 'subscription_type', 'billing_date',
  'recurring_amount', 'frequency', 'cycles'
];

function generateSignature(data, passphrase = '') {
  let paramString = '';

  for (const key of PAYFAST_PARAM_ORDER) {
    if (data[key] !== '' && data[key] !== null && data[key] !== undefined) {
      paramString += `${key}=${encodeURIComponent(String(data[key]).trim()).replace(/%20/g, '+')}&`;
    }
  }

  // Remove last ampersand
  paramString = paramString.slice(0, -1);

  // Add passphrase if provided
  if (passphrase) {
    paramString += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`;
  }

  // Generate MD5 hash
  return crypto.createHash('md5').update(paramString).digest('hex').toLowerCase();
}

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║   PayFast Signature Diagnostic - Passphrase Investigation    ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log('');

// Scenario 1: NO passphrase (empty string)
console.log('═══════════════════════════════════════════════════════════════');
console.log('SCENARIO 1: Dashboard has NO passphrase configured');
console.log('═══════════════════════════════════════════════════════════════');
const sig1 = generateSignature(testData, '');
console.log('Expected Signature:', sig1);
console.log('Action: Set PAYFAST_PASSPHRASE="" in .env');
console.log('');

// Scenario 2: Current passphrase
console.log('═══════════════════════════════════════════════════════════════');
console.log('SCENARIO 2: Dashboard has passphrase = "jt7NOE43FZPn"');
console.log('═══════════════════════════════════════════════════════════════');
const sig2 = generateSignature(testData, 'jt7NOE43FZPn');
console.log('Expected Signature:', sig2);
console.log('Action: Verify dashboard passphrase EXACTLY matches "jt7NOE43FZPn"');
console.log('');

// Scenario 3: Common sandbox passphrase
console.log('═══════════════════════════════════════════════════════════════');
console.log('SCENARIO 3: Dashboard has default sandbox passphrase');
console.log('═══════════════════════════════════════════════════════════════');
const sig3 = generateSignature(testData, 'payfast');
console.log('Expected Signature (with "payfast"):', sig3);
console.log('Action: Try PAYFAST_PASSPHRASE="payfast" in .env');
console.log('');

// Scenario 4: Trimming issue
console.log('═══════════════════════════════════════════════════════════════');
console.log('SCENARIO 4: Dashboard has passphrase with trailing space');
console.log('═══════════════════════════════════════════════════════════════');
const sig4 = generateSignature(testData, 'jt7NOE43FZPn ');
console.log('Expected Signature (with space):', sig4);
console.log('Action: Check dashboard passphrase for whitespace');
console.log('');

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║                    VERIFICATION STEPS                         ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log('');
console.log('1. Login to PayFast Sandbox: https://sandbox.payfast.co.za');
console.log('2. Navigate to: Settings → Integration → Security');
console.log('3. Check the Passphrase field:');
console.log('   - If BLANK: Use Scenario 1 (empty passphrase)');
console.log('   - If SET: Copy exact value and update .env');
console.log('4. Restart backend server after changing .env');
console.log('5. Test payment again');
console.log('');
console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║                  QUICKTEST COMMAND                            ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log('');
console.log('Test without passphrase:');
console.log('  Set PAYFAST_PASSPHRASE= (empty) in .env');
console.log('  Restart: npm run dev');
console.log('  Try payment again');
console.log('');
console.log('If that works: Dashboard has NO passphrase configured!');
console.log('');
