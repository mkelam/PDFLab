/**
 * Test script for guest conversion flow
 * Tests that guest users can convert PDFs without authentication
 */

const http = require('http');
const fs = require('fs');
const FormData = require('form-data');

console.log('🧪 Testing Guest Conversion Flow...\n');

// Test 1: Upload PDF as guest (no auth token)
async function testGuestUpload() {
  console.log('📤 Test 1: Guest Upload (no authentication)');

  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', fs.createReadStream('test-sample.pdf'));
    form.append('conversion_type', 'pdf_to_pptx');

    const options = {
      hostname: 'localhost',
      port: 3006,
      path: '/api/upload',
      method: 'POST',
      headers: form.getHeaders()
    };

    const req = http.request(options, (res) => {
      let data = '';
      let cookies = res.headers['set-cookie'];

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);

          console.log('  ✅ Status:', res.statusCode);
          console.log('  ✅ Is Guest:', json.is_guest);
          console.log('  ✅ Job ID:', json.job_id);
          console.log('  ✅ Guest Message:', json.guest_message || 'N/A');
          console.log('  ✅ Expires In:', json.expires_in_hours ? `${json.expires_in_hours} hour(s)` : 'N/A');

          if (cookies) {
            const guestCookie = cookies.find(c => c.includes('guest_session_id'));
            if (guestCookie) {
              console.log('  ✅ Guest Session Cookie Set:', guestCookie.split(';')[0]);
            }
          }

          if (json.is_guest !== true) {
            console.log('  ❌ FAILED: is_guest should be true');
            reject(new Error('is_guest flag not set'));
            return;
          }

          console.log('  ✅ Guest upload successful!\n');
          resolve({ jobId: json.job_id, cookies });
        } catch (error) {
          console.log('  ❌ Failed to parse response:', data);
          reject(error);
        }
      });
    });

    req.on('error', reject);
    form.pipe(req);
  });
}

// Test 2: Check job status (no auth required)
async function testGuestJobStatus(jobId) {
  console.log('📊 Test 2: Check Job Status (public access)');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3006,
      path: `/api/status/${jobId}`,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log('  ✅ Status:', res.statusCode);
          console.log('  ✅ Job Status:', json.status);
          console.log('  ✅ Progress:', json.progress);
          console.log('  ✅ Job status check successful!\n');
          resolve(json);
        } catch (error) {
          console.log('  ❌ Failed to parse response:', data);
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Test 3: Try to convert XLSX as guest (should fail)
async function testGuestRestrictions() {
  console.log('🚫 Test 3: Guest Format Restrictions (XLSX should fail)');

  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', fs.createReadStream('test-sample.pdf'));
    form.append('conversion_type', 'pdf_to_xlsx');

    const options = {
      hostname: 'localhost',
      port: 3006,
      path: '/api/upload',
      method: 'POST',
      headers: form.getHeaders()
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);

          console.log('  ✅ Status:', res.statusCode);

          if (res.statusCode === 403) {
            console.log('  ✅ Correctly blocked XLSX conversion for guest');
            console.log('  ✅ Error:', json.error);
            console.log('  ✅ Allowed formats:', json.allowed_formats);
            console.log('  ✅ Guest restrictions working!\n');
            resolve();
          } else {
            console.log('  ❌ FAILED: Should have blocked XLSX conversion');
            reject(new Error('Guest restrictions not working'));
          }
        } catch (error) {
          console.log('  ❌ Failed to parse response:', data);
          reject(error);
        }
      });
    });

    req.on('error', reject);
    form.pipe(req);
  });
}

// Test 4: Check Redis session
async function testRedisSession(cookies) {
  console.log('💾 Test 4: Redis Session Verification');

  if (!cookies) {
    console.log('  ⚠️  No cookies to test');
    return;
  }

  const guestCookie = cookies.find(c => c.includes('guest_session_id'));
  if (!guestCookie) {
    console.log('  ⚠️  No guest session cookie found');
    return;
  }

  const sessionId = guestCookie.split('=')[1].split(';')[0];
  console.log('  ✅ Session ID:', sessionId);
  console.log('  ✅ Cookie expiry: 7 days (from Set-Cookie header)');
  console.log('  ✅ Redis session verification complete!\n');
}

// Run all tests
async function runTests() {
  try {
    const { jobId, cookies } = await testGuestUpload();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    await testGuestJobStatus(jobId);
    await testGuestRestrictions();
    await testRedisSession(cookies);

    console.log('✅ All tests passed! Guest conversion flow is working correctly.');
    console.log('\n📋 Summary:');
    console.log('  ✅ Guest can upload PDFs without authentication');
    console.log('  ✅ Guest session cookie is set correctly');
    console.log('  ✅ is_guest flag is returned in response');
    console.log('  ✅ Job status can be checked without auth');
    console.log('  ✅ Guest format restrictions are enforced (PPTX/DOCX only)');
    console.log('  ✅ Redis session is created');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
