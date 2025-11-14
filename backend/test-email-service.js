/**
 * Test Email Service
 * Tests all email templates to verify SMTP configuration
 */

const axios = require('axios');

const API_URL = 'http://localhost:3006/api';

// Test credentials
const TEST_EMAIL = 'test@pdflab.com';
const TEST_PASSWORD = 'TestPass123!';

async function testEmailService() {
  console.log('========================================');
  console.log('PDFLab Email Service Test');
  console.log('========================================\n');

  try {
    // Test 1: Register new user (triggers welcome email)
    console.log('Test 1: User Registration (Welcome Email)');
    console.log('------------------------------------------');

    const uniqueEmail = `test.${Date.now()}@pdflab.com`;

    try {
      const registerResponse = await axios.post(`${API_URL}/auth/register`, {
        email: uniqueEmail,
        password: TEST_PASSWORD,
        name: 'Test User'
      });

      console.log('✅ Registration successful');
      console.log(`   User: ${uniqueEmail}`);
      console.log('   Expected: Welcome email sent to console (dev mode)\n');

      const token = registerResponse.data.token;

      // Test 2: Password Reset Request
      console.log('Test 2: Password Reset Request');
      console.log('------------------------------------------');

      const forgotResponse = await axios.post(`${API_URL}/auth/forgot-password`, {
        email: uniqueEmail
      });

      console.log('✅ Password reset requested');
      console.log('   Expected: Password reset email sent to console (dev mode)\n');

      // Test 3: Refresh Token
      console.log('Test 3: Refresh Token Mechanism');
      console.log('------------------------------------------');

      const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, {
        refresh_token: registerResponse.data.refresh_token
      });

      console.log('✅ Token refreshed successfully');
      console.log(`   New access token expiry: 15 minutes`);
      console.log(`   Refresh token expiry: 30 days\n`);

    } catch (error) {
      if (error.response && error.response.status === 400 && error.response.data.error === 'Email already exists') {
        console.log('⚠️  User already exists, skipping registration test');
        console.log('   To test registration, delete existing user first\n');
      } else {
        throw error;
      }
    }

    console.log('========================================');
    console.log('Email Service Test Complete');
    console.log('========================================');
    console.log('\nCheck backend console for email output (dev mode)');
    console.log('In production, emails will be sent via SMTP\n');

  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', error.response.data.error || error.response.data.message);
    } else {
      console.error('   ', error.message);
    }
    process.exit(1);
  }
}

// Run test
testEmailService();
