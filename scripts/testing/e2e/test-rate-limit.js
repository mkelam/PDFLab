const http = require('http');

const BASE_URL = 'http://141.136.44.168:3007';

async function makeRequest() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: '141.136.44.168',
      port: 3007,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.write(JSON.stringify({
      email: 'test@test.com',
      password: 'wrong',
    }));
    req.end();
  });
}

async function testRateLimiting() {
  console.log('Testing Rate Limiting - Auth Limiter');
  console.log('Limit: 50 failed attempts per 15 minutes (staging)');
  console.log('Making 60 failed login attempts...\n');

  let rateLimited = false;
  let firstRateLimitAt = 0;

  for (let i = 1; i <= 60; i++) {
    const result = await makeRequest();

    if (result.status === 429) {
      if (!rateLimited) {
        firstRateLimitAt = i;
        rateLimited = true;
      }
      console.log(`Request ${i}: HTTP ${result.status} - ✓ RATE LIMITED`);
    } else {
      console.log(`Request ${i}: HTTP ${result.status}`);
    }

    // Stop after first rate limit to save time
    if (i >= firstRateLimitAt + 5 && rateLimited) {
      console.log(`\n✓ Rate limiting confirmed after ${firstRateLimitAt} requests`);
      break;
    }
  }

  if (!rateLimited) {
    console.log('\n❌ Rate limiting did NOT trigger (expected after 50 requests)');
  } else {
    console.log(`\n✅ Rate limiting working correctly`);
  }
}

testRateLimiting().catch(console.error);
