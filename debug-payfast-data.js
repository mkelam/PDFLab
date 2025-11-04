/**
 * Debug PayFast Payment Data
 * Shows exactly what data is being sent to PayFast
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:3006';
const TEST_USER = {
  email: `payfast-debug-${Date.now()}@pdflab.com`,
  password: 'TestPass123!',
  name: 'Debug User'
};

async function debugPayFastData() {
  console.log('🔍 PayFast Payment Data Debugger\n');

  try {
    // Step 1: Register user
    console.log('📝 Step 1: Registering test user...');
    const registerResponse = await axios.post(`${BACKEND_URL}/api/auth/register`, {
      firstName: 'Debug',
      lastName: 'User',
      email: TEST_USER.email,
      password: TEST_USER.password,
      confirmPassword: TEST_USER.password
    });

    const token = registerResponse.data.token || registerResponse.data.access_token;
    console.log(`✅ User registered: ${TEST_USER.email}`);
    console.log(`✅ Token: ${token.substring(0, 20)}...\n`);

    // Step 2: Initialize PayFast payment
    console.log('💳 Step 2: Initializing PayFast payment...');
    const paymentResponse = await axios.post(
      `${BACKEND_URL}/api/payfast/initialize`,
      {
        plan: 'starter',
        userEmail: TEST_USER.email,
        userName: 'Debug User'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Payment initialized successfully\n');
    console.log('📋 Payment Response:');
    console.log(JSON.stringify(paymentResponse.data, null, 2));

    if (paymentResponse.data.paymentData) {
      console.log('\n📦 Payment Data Sent to PayFast:');
      console.log('═'.repeat(80));

      const data = paymentResponse.data.paymentData;
      const sortedKeys = Object.keys(data).sort();

      for (const key of sortedKeys) {
        const value = data[key];
        const display = key === 'signature' ? `${value.substring(0, 16)}...` : value;
        console.log(`${key.padEnd(25)} = ${display}`);
      }

      console.log('═'.repeat(80));

      // Validate required fields
      console.log('\n✅ Validation:');
      const requiredFields = [
        'merchant_id',
        'merchant_key',
        'return_url',
        'cancel_url',
        'notify_url',
        'name_first',
        'email_address',
        'm_payment_id',
        'amount',
        'item_name',
        'signature'
      ];

      for (const field of requiredFields) {
        const present = !!data[field];
        const icon = present ? '✅' : '❌';
        console.log(`${icon} ${field.padEnd(20)} ${present ? 'Present' : 'MISSING'}`);
      }

      // Check specific values
      console.log('\n🔍 Field Inspection:');
      console.log(`merchant_id: ${data.merchant_id} (should be 10000100)`);
      console.log(`merchant_key: ${data.merchant_key} (should be 46f0cd694581a)`);
      console.log(`amount: ${data.amount} (should be 4.55)`);
      console.log(`email_address: ${data.email_address}`);
      console.log(`signature length: ${data.signature?.length || 0} chars (should be 32 for MD5)`);

      // Show PayFast URL
      console.log(`\n🌐 PayFast URL: ${paymentResponse.data.paymentUrl}`);
      console.log(`\n💡 Form will POST to: https://sandbox.payfast.co.za/eng/process`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugPayFastData().catch(console.error);
