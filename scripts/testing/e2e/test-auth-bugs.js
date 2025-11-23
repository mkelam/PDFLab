const http = require('http');

const BASE_URL = 'http://141.136.44.168:3007';

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (body && method !== 'GET') {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (body && method !== 'GET') {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      req.write(bodyStr);
    }

    req.end();
  });
}

async function testAuthBugs() {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING AUTHORIZATION BUGS');
  console.log('='.repeat(80));

  // First, get tokens for testing
  console.log('\n[1] Getting test tokens...');
  const user1Login = await makeRequest('/api/auth/login', 'POST', {
    email: 'testuser@pdflab.com',
    password: 'TestPass123!'
  });

  const user2Login = await makeRequest('/api/auth/login', 'POST', {
    email: 'mmkela@gmail.com',
    password: 'TestPass123!'
  });

  const user1Token = user1Login.body.token;
  const user2Token = user2Login.body.token;
  const user2Id = user2Login.body.user.id;

  console.log('  ✓ User 1 token obtained');
  console.log('  ✓ User 2 token obtained');
  console.log('  User 2 ID:', user2Id);

  // Get User 2's subscription ID
  const user2SubResponse = await makeRequest(
    '/api/payfast/subscription',
    'GET',
    null,
    { 'Authorization': `Bearer ${user2Token}` }
  );
  const user2SubscriptionId = user2SubResponse.body.subscription?.id || 'a9283e79-c5ef-11f0-8a51-e62909c9494f';
  console.log('  User 2 Subscription ID:', user2SubscriptionId);

  // Test Bug #1: Protected routes without auth
  console.log('\n[2] BUG #1: Protected routes without authentication');

  const protectedRoutesGET = [
    '/api/auth/profile',
    '/api/history',
  ];

  const protectedRoutesPOST = [
    '/api/upload',
    '/api/compress',
    '/api/merge',
    '/api/payfast/initialize',
    '/api/payfast/cancel-subscription',
  ];

  // Test GET routes
  for (const route of protectedRoutesGET) {
    const response = await makeRequest(route, 'GET');
    const expected = 401;
    const pass = response.status === expected;
    console.log(`  ${pass ? '✓' : '✗'} ${route} (GET)`);
    console.log(`    Expected: ${expected}, Got: ${response.status}`);
    if (!pass && response.body.error) {
      console.log(`    Error: ${response.body.error}`);
    }
  }

  // Test POST routes
  for (const route of protectedRoutesPOST) {
    const response = await makeRequest(route, 'POST');
    const expected = 401;
    const pass = response.status === expected;
    console.log(`  ${pass ? '✓' : '✗'} ${route} (POST)`);
    console.log(`    Expected: ${expected}, Got: ${response.status}`);
    if (!pass && response.body.error) {
      console.log(`    Error: ${response.body.error}`);
    }
  }

  // Test Bug #2: User accessing other user's data
  console.log('\n[3] BUG #2: User accessing other user\'s subscription');
  const response = await makeRequest(
    `/api/payfast/subscription/${user2SubscriptionId}`,
    'GET',
    null,
    { 'Authorization': `Bearer ${user1Token}` }
  );

  const expected = 403;
  const pass = response.status === expected;
  console.log(`  ${pass ? '✓' : '✗'} User 1 accessing User 2's subscription`);
  console.log(`    Expected: ${expected}, Got: ${response.status}`);
  if (!pass) {
    console.log(`    Body:`, JSON.stringify(response.body, null, 2));
  }

  console.log('\n' + '='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80) + '\n');
}

testAuthBugs().catch(console.error);
