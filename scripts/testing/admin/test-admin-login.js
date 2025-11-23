// Test admin login
const http = require('http');

const data = JSON.stringify({
  email: 'admin@pdflab.test',
  password: 'Admin123!'
});

const options = {
  hostname: 'localhost',
  port: 3006,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('🔐 Testing admin login...');
console.log('📧 Email: admin@pdflab.test');
console.log('🔑 Password: Admin123!');
console.log('');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);

  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(responseData);
      if (res.statusCode === 200) {
        console.log('✅ Login successful!');
        console.log('');
        console.log('User info:');
        console.log(`  Name: ${response.user.name}`);
        console.log(`  Email: ${response.user.email}`);
        console.log(`  Role: ${response.user.role}`);
        console.log(`  Plan: ${response.user.plan}`);
        console.log('');
        console.log('Access token received:', response.accessToken.substring(0, 30) + '...');
      } else {
        console.log('❌ Login failed');
        console.log('Error:', response.error || response.message);
      }
    } catch (e) {
      console.log('❌ Response parse error');
      console.log('Raw response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.write(data);
req.end();
