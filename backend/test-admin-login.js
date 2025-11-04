const fetch = require('node-fetch');

const API_URL = 'http://localhost:3006';

async function testAdminLogin() {
  try {
    console.log('Testing admin login...\n');

    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@pdflab.test',
        password: 'Admin123!'
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✓ Login successful!\n');
      console.log('Response:', JSON.stringify(data, null, 2));
      console.log('\n--- LOGIN CREDENTIALS VERIFIED ---');
      console.log('Email: admin@pdflab.test');
      console.log('Password: Admin123!');
      console.log('Frontend URL: http://localhost:3003/login');
      console.log('----------------------------------\n');

      if (data.token) {
        console.log('Token received:', data.token.substring(0, 50) + '...');
      }

      return true;
    } else {
      console.error('✗ Login failed!');
      console.error('Status:', response.status);
      console.error('Response:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('✗ Error testing login:', error.message);
    return false;
  }
}

testAdminLogin();
