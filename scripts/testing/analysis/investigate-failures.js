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

async function investigate() {
  console.log('\n' + '='.repeat(80));
  console.log('INVESTIGATING STAGING TEST FAILURES');
  console.log('='.repeat(80));

  // Test 1: Login with valid credentials
  console.log('\n[1/6] Testing login with testuser@pdflab.com...');
  try {
    const login = await makeRequest('/api/auth/login', 'POST', {
      email: 'testuser@pdflab.com',
      password: 'TestPass123!'
    });
    console.log(`  Status: ${login.status}`);
    console.log(`  Has token: ${!!login.body.token}`);
    console.log(`  Has refreshToken: ${!!login.body.refreshToken}`);
    if (login.body.error) console.log(`  Error: ${login.body.error}`);

    if (login.body.token) {
      const token = login.body.token;

      // Test 2: Access profile with valid token
      console.log('\n[2/6] Testing profile endpoint with valid token...');
      const profile = await makeRequest('/api/auth/profile', 'GET', null, {
        'Authorization': `Bearer ${token}`
      });
      console.log(`  Status: ${profile.status}`);
      console.log(`  Has user data: ${!!profile.body.user}`);
      if (profile.body.error) console.log(`  Error: ${profile.body.error}`);

      // Test 3: Test feedback endpoint
      console.log('\n[3/6] Testing feedback submission...');
      const feedback = await makeRequest('/api/feedback', 'POST', {
        type: 'bug',
        message: 'Test feedback from investigation',
        pageUrl: '/test'
      }, {
        'Authorization': `Bearer ${token}`
      });
      console.log(`  Status: ${feedback.status}`);
      if (feedback.body.error) console.log(`  Error: ${feedback.body.error}`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }

  // Test 4: Check if test users exist
  console.log('\n[4/6] Testing admin user login...');
  try {
    const adminLogin = await makeRequest('/api/auth/login', 'POST', {
      email: 'admin@pdflab.test',
      password: 'Admin123!'
    });
    console.log(`  Status: ${adminLogin.status}`);
    console.log(`  Admin login success: ${adminLogin.status === 200}`);
    if (adminLogin.body.user) {
      console.log(`  User plan: ${adminLogin.body.user.plan}`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }

  // Test 5: Test SQL injection protection
  console.log('\n[5/6] Testing SQL injection protection...');
  try {
    const sqlInj = await makeRequest('/api/auth/login', 'POST', {
      email: "admin' OR '1'='1",
      password: 'anything'
    });
    console.log(`  Status: ${sqlInj.status}`);
    console.log(`  Blocked correctly: ${sqlInj.status === 401}`);
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }

  // Test 6: Test XSS protection
  console.log('\n[6/6] Testing XSS sanitization...');
  try {
    const xss = await makeRequest('/api/auth/register', 'POST', {
      email: `xsstest${Date.now()}@test.com`,
      password: 'Test123!',
      name: '<script>alert("xss")</script>Test User'
    });
    console.log(`  Status: ${xss.status}`);
    if (xss.status === 201 && xss.body.user) {
      console.log(`  Name sanitized: ${!xss.body.user.name.includes('<script>')}`);
      console.log(`  Actual name: ${xss.body.user.name}`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('INVESTIGATION COMPLETE');
  console.log('='.repeat(80) + '\n');
}

investigate().catch(console.error);
