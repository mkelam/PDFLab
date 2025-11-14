// Test frontend login in browser
const { chromium } = require('playwright');

async function testLogin() {
  console.log('🌐 Testing frontend login...\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to login page
    console.log('📍 Step 1: Navigating to login page');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Fill in credentials
    console.log('📍 Step 2: Filling in credentials');
    console.log('   Email: admin@pdflab.test');
    console.log('   Password: Admin123!');

    await page.fill('input[type="email"]', 'admin@pdflab.test');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.waitForTimeout(500);

    // Take screenshot before login
    await page.screenshot({ path: 'login-filled.png' });
    console.log('   ✓ Screenshot saved: login-filled.png');

    // Click login button
    console.log('\n📍 Step 3: Clicking login button');
    await page.click('button[type="submit"]');

    // Wait for navigation or error
    await page.waitForTimeout(2000);

    // Check current URL
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);

    // Take screenshot after login attempt
    await page.screenshot({ path: 'after-login.png' });
    console.log('   ✓ Screenshot saved: after-login.png');

    // Check for success (should redirect to dashboard or home)
    if (currentUrl.includes('/dashboard') || currentUrl === 'http://localhost:3000/' || currentUrl.includes('/admin')) {
      console.log('\n✅ LOGIN SUCCESSFUL!');
      console.log(`   Redirected to: ${currentUrl}`);

      // Check for user info in page
      const pageContent = await page.content();
      if (pageContent.includes('Test Admin') || pageContent.includes('admin@pdflab.test')) {
        console.log('   ✓ User information found on page');
      }
    } else {
      console.log('\n❌ LOGIN FAILED');

      // Check for error message
      const errorElement = await page.$('[role="alert"], .error, .text-red-500, .text-destructive');
      if (errorElement) {
        const errorText = await errorElement.textContent();
        console.log(`   Error message: ${errorText}`);
      }

      // Check console logs
      const logs = [];
      page.on('console', msg => logs.push(msg.text()));
      console.log('   Console logs:', logs.slice(-5));
    }

    // Keep browser open for 3 seconds to see result
    console.log('\n⏳ Keeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ path: 'error.png' });
    console.log('   Screenshot saved: error.png');
  } finally {
    await browser.close();
    console.log('\n✓ Test complete');
  }
}

testLogin().catch(console.error);
