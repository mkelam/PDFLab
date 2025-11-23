// Test partner portal login
const { chromium } = require('playwright');

async function testPartnerLogin() {
  console.log('🌐 Testing Partner Portal login...\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to partner portal login
    console.log('📍 Step 1: Navigating to partner portal login');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Fill in credentials
    console.log('📍 Step 2: Filling in admin credentials');
    console.log('   Email: admin@pdflab.test');
    console.log('   Password: Admin123!');

    await page.fill('input[type="email"]', 'admin@pdflab.test');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.waitForTimeout(500);

    // Take screenshot before login
    await page.screenshot({ path: 'partner-login-filled.png' });
    console.log('   ✓ Screenshot saved: partner-login-filled.png');

    // Click login button
    console.log('\n📍 Step 3: Clicking login button');
    await page.click('button[type="submit"]');

    // Wait for navigation or error
    await page.waitForTimeout(3000);

    // Check current URL
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);

    // Take screenshot after login attempt
    await page.screenshot({ path: 'partner-after-login.png' });
    console.log('   ✓ Screenshot saved: partner-after-login.png');

    // Check for success (should redirect to dashboard)
    if (currentUrl.includes('/dashboard') || currentUrl === 'http://localhost:3001/') {
      console.log('\n✅ PARTNER PORTAL LOGIN SUCCESSFUL!');
      console.log(`   Redirected to: ${currentUrl}`);

      // Check for partner info
      const pageContent = await page.content();
      if (pageContent.includes('Test Admin') || pageContent.includes('admin@pdflab.test') || pageContent.includes('Dashboard')) {
        console.log('   ✓ Partner dashboard loaded');
      }
    } else if (currentUrl === 'http://localhost:3001/login') {
      console.log('\n⚠️  Still on login page');

      // Check for error message
      const errorElement = await page.$('[role="alert"], .error, .text-red-500, .text-destructive');
      if (errorElement) {
        const errorText = await errorElement.textContent();
        console.log(`   Error message: ${errorText}`);
      } else {
        console.log('   No error message visible - checking page content...');
        const bodyText = await page.textContent('body');
        console.log(`   Page text sample: ${bodyText.substring(0, 200)}`);
      }
    } else {
      console.log('\n✅ LOGIN SUCCESSFUL!');
      console.log(`   Redirected to: ${currentUrl}`);
    }

    // Keep browser open for 5 seconds to see result
    console.log('\n⏳ Keeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ path: 'partner-error.png' });
    console.log('   Screenshot saved: partner-error.png');
  } finally {
    await browser.close();
    console.log('\n✓ Test complete');
  }
}

testPartnerLogin().catch(console.error);
