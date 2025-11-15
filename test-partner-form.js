const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Starting Partner Application Form Test...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the partner application page
    console.log('📍 Navigating to https://partners.pdflab.pro/apply');
    await page.goto('https://partners.pdflab.pro/apply', { waitUntil: 'networkidle' });
    console.log('✅ Page loaded\n');

    // Fill out the form
    console.log('📝 Filling out the form...');
    await page.fill('input[name="name"]', 'Test Partner');
    await page.fill('input[name="email"]', 'testpartner@example.com');
    await page.fill('input[name="platform"]', 'YouTube');
    await page.fill('input[name="audience_size"]', '50000');
    await page.fill('textarea[name="use_case"]', 'I want to promote PDFLab to my tech-focused YouTube audience of 50k subscribers.');

    // Check the terms checkbox
    await page.check('button[role="checkbox"]');
    console.log('✅ Form filled\n');

    // Set up request interception to monitor the API call
    let apiCallMade = false;
    let apiUrl = '';
    let apiResponse = null;

    page.on('request', request => {
      if (request.url().includes('/api/partner-applications/submit')) {
        apiCallMade = true;
        apiUrl = request.url();
        console.log('🌐 API Request detected:');
        console.log('   URL:', apiUrl);
        console.log('   Method:', request.method());
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/partner-applications/submit')) {
        apiResponse = response;
        console.log('📥 API Response received:');
        console.log('   Status:', response.status());
        console.log('   Status Text:', response.statusText());
        try {
          const body = await response.json();
          console.log('   Response Body:', JSON.stringify(body, null, 2));
        } catch (e) {
          console.log('   Could not parse response body');
        }
      }
    });

    // Submit the form
    console.log('🔄 Submitting form...');
    await page.click('button[type="submit"]');

    // Wait for response
    await page.waitForTimeout(3000);

    // Verify results
    console.log('\n📊 TEST RESULTS:');
    console.log('================');

    if (apiCallMade) {
      console.log('✅ API call was made');
      console.log('✅ API URL:', apiUrl);

      if (apiUrl.includes('localhost')) {
        console.log('❌ FAIL: API call went to localhost instead of production!');
        console.log('   Expected: https://pdflab.pro/api/partner-applications/submit');
        console.log('   Actual:', apiUrl);
      } else if (apiUrl.includes('https://pdflab.pro')) {
        console.log('✅ SUCCESS: API call went to production URL!');
      }

      if (apiResponse) {
        if (apiResponse.status() === 200 || apiResponse.status() === 201) {
          console.log('✅ API responded successfully (Status:', apiResponse.status() + ')');
        } else {
          console.log('⚠️  API responded with status:', apiResponse.status());
        }
      }
    } else {
      console.log('❌ FAIL: No API call was detected');
    }

    // Keep browser open for 5 seconds to see the result
    console.log('\n⏳ Keeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  } finally {
    await browser.close();
    console.log('\n✅ Test completed');
  }
})();
