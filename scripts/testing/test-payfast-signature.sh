#!/bin/bash
# ========================================================================
# PayFast Signature Generation Test
# ========================================================================
# This script tests the PayFast signature generation on the VPS to verify
# the fix is working correctly with proper parameter ordering.
# ========================================================================

set -e

echo "=========================================="
echo "PayFast Signature Fix - Command Line Test"
echo "=========================================="
echo ""

VPS_HOST="root@141.136.44.168"

echo "Creating test script on VPS..."
ssh "$VPS_HOST" << 'ENDSSH'
# Create test script inside the container
docker exec pdflab-backend-prod node -e "
const crypto = require('crypto');

console.log('PayFast Signature Generation Test');
console.log('=====================================\n');

// This is the CORRECT parameter order per PayFast API
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

// Test payment data (Starter plan - R85)
const testData = {
  merchant_id: '25263515',
  merchant_key: '***REMOVED***',
  return_url: 'https://pdflab.pro/payment/success',
  cancel_url: 'https://pdflab.pro/payment/cancel',
  notify_url: 'https://pdflab.pro/api/payfast/webhook',
  name_first: 'Test',
  name_last: 'User',
  email_address: 'testbuyer@example.com',
  m_payment_id: 'test-' + Date.now(),
  amount: '85.00',
  item_name: 'PDFLab Starter Plan',
  item_description: 'PDFLab Starter monthly subscription',
  custom_str1: 'user-test-123',
  custom_str2: 'starter',
  email_confirmation: '1',
  confirmation_address: 'testbuyer@example.com',
  subscription_type: '1',
  billing_date: '2025-12-05',
  recurring_amount: '85.00',
  frequency: '3',
  cycles: '0'
};

console.log('Test Data:');
console.log('----------');
console.log('Plan: Starter (R85.00/month)');
console.log('Email:', testData.email_address);
console.log('Amount:', testData.amount, 'ZAR');
console.log('');

// Generate signature using CORRECT parameter order
let paramString = '';
for (const key of PAYFAST_PARAM_ORDER) {
  if (testData[key] && testData[key] !== '') {
    const value = encodeURIComponent(String(testData[key]).trim()).replace(/%20/g, '+');
    paramString += \`\${key}=\${value}&\`;
  }
}
paramString = paramString.slice(0, -1);

const signature = crypto.createHash('md5').update(paramString).digest('hex').toLowerCase();

console.log('Parameter String (first 200 chars):');
console.log('------------------------------------');
console.log(paramString.substring(0, 200) + '...');
console.log('');

console.log('Generated Signature:');
console.log('-------------------');
console.log(signature);
console.log('');

// Generate signature using WRONG method (alphabetical) for comparison
const wrongKeys = Object.keys(testData).sort();
let wrongParamString = '';
for (const key of wrongKeys) {
  if (testData[key] && testData[key] !== '') {
    const value = encodeURIComponent(String(testData[key]).trim()).replace(/%20/g, '+');
    wrongParamString += \`\${key}=\${value}&\`;
  }
}
wrongParamString = wrongParamString.slice(0, -1);
const wrongSignature = crypto.createHash('md5').update(wrongParamString).digest('hex').toLowerCase();

console.log('Wrong Signature (alphabetical order):');
console.log('-------------------------------------');
console.log(wrongSignature);
console.log('');

console.log('Comparison:');
console.log('-----------');
console.log('Correct signature:', signature);
console.log('Wrong signature:  ', wrongSignature);
console.log('Match:', signature === wrongSignature ? '❌ PROBLEM - Should be different!' : '✅ Different (as expected)');
console.log('');

// Test that the backend service generates the same signature
console.log('Testing Backend Service:');
console.log('------------------------');
try {
  const payfastService = require('./dist/services/payfast.service.js');
  const backendSignature = payfastService.generateSignature(testData, '');

  console.log('Backend generated:', backendSignature);
  console.log('Expected:         ', signature);
  console.log('Match:', backendSignature === signature ? '✅ SUCCESS' : '❌ MISMATCH');
  console.log('');

  if (backendSignature === signature) {
    console.log('🎉 TEST PASSED: Backend signature matches expected signature!');
    console.log('✅ PayFast signature fix is working correctly');
  } else {
    console.log('❌ TEST FAILED: Backend signature does not match!');
    console.log('⚠️  The fix may not be applied correctly');
  }
} catch (error) {
  console.log('❌ Error testing backend service:', error.message);
}

console.log('');
console.log('Parameter Order Test:');
console.log('--------------------');
console.log('First 5 parameters in correct order:');
PAYFAST_PARAM_ORDER.slice(0, 5).forEach((key, i) => {
  console.log(\`  \${i+1}. \${key}\`);
});
console.log('');
console.log('First 5 parameters in alphabetical order:');
wrongKeys.slice(0, 5).forEach((key, i) => {
  console.log(\`  \${i+1}. \${key}\`);
});
console.log('');
console.log('Note: These should be DIFFERENT to show the fix is applied.');
"
ENDSSH

echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="
