// Test script to verify partners API is working
const http = require('http');

// Login first to get a valid token
const loginData = JSON.stringify({
  email: 'mmkela@fnb.co.za',
  password: 'Admin123!'
});

const loginOptions = {
  hostname: 'localhost',
  port: 3006,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

console.log('Step 1: Logging in...');

const loginReq = http.request(loginOptions, (loginRes) => {
  let data = '';

  loginRes.on('data', (chunk) => {
    data += chunk;
  });

  loginRes.on('end', () => {
    if (loginRes.statusCode !== 200) {
      console.error('Login failed:', loginRes.statusCode);
      console.error('Response:', data);
      return;
    }

    const loginResponse = JSON.parse(data);
    const token = loginResponse.token;
    console.log('✓ Login successful!');
    console.log('Token:', token.substring(0, 50) + '...');

    // Now fetch partners
    console.log('\nStep 2: Fetching partners...');

    const partnersOptions = {
      hostname: 'localhost',
      port: 3006,
      path: '/api/partners/admin/all',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const partnersReq = http.request(partnersOptions, (partnersRes) => {
      let partnersData = '';

      console.log('\nResponse Status:', partnersRes.statusCode);
      console.log('Response Headers:', partnersRes.headers);

      partnersRes.on('data', (chunk) => {
        partnersData += chunk;
      });

      partnersRes.on('end', () => {
        if (partnersRes.statusCode === 200) {
          const response = JSON.parse(partnersData);
          console.log('\n✓ Partners fetched successfully!');
          console.log(`Total partners: ${response.partners.length}`);
          console.log('\nPartners:');
          response.partners.forEach((p, i) => {
            console.log(`${i + 1}. ${p.name} (${p.slug}) - ${p.email}`);
            console.log(`   Commission: ${p.commission_rate}% | Signups: ${p.total_signups} | Conversions: ${p.total_conversions}`);
          });
        } else {
          console.error('Failed to fetch partners:', partnersRes.statusCode);
          console.error('Response:', partnersData);
        }
      });
    });

    partnersReq.on('error', (e) => {
      console.error('Request error:', e.message);
    });

    partnersReq.end();
  });
});

loginReq.on('error', (e) => {
  console.error('Login error:', e.message);
});

loginReq.write(loginData);
loginReq.end();
