const { chromium } = require('playwright');

(async () => {
  console.log('🧪 Starting Admin Email Button Test...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Navigate to login
    console.log('📍 Step 1: Navigating to http://localhost:3000/login');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Step 2: Check if we need to login or already authenticated
    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);

    if (currentUrl.includes('/login')) {
      console.log('⚠️  Not authenticated - need login credentials');
      console.log('❌ TEST STOPPED: Please provide admin credentials or login manually first');
      await browser.close();
      return;
    }

    // Step 3: Navigate to admin users page
    console.log('📍 Step 2: Navigating to admin users page');
    await page.goto('http://localhost:3000/admin/users', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Step 4: Get first user from the list
    console.log('📍 Step 3: Looking for first user in the list');
    const firstUserLink = await page.locator('a[href^="/admin/users/"]').first();
    const userExists = await firstUserLink.count() > 0;

    if (!userExists) {
      console.log('❌ No users found in the list');
      await browser.close();
      return;
    }

    console.log('✅ Found user, clicking...');
    await firstUserLink.click();
    await page.waitForTimeout(3000);

    // Step 5: Look for the "Send Verification Email" button
    console.log('\n📍 Step 4: Searching for "Send Verification Email" button...');

    // Try multiple selectors
    const buttonSelectors = [
      'button:has-text("Send Verification Email")',
      'text=Send Verification Email',
      '[class*="Button"]:has-text("Send Verification")',
    ];

    let buttonFound = false;
    let buttonText = '';

    for (const selector of buttonSelectors) {
      const button = page.locator(selector);
      const count = await button.count();
      if (count > 0) {
        buttonFound = true;
        buttonText = await button.first().textContent();
        break;
      }
    }

    console.log('\n' + '='.repeat(60));
    if (buttonFound) {
      console.log('✅ SUCCESS! BUTTON FOUND!');
      console.log('📧 Button text:', buttonText);
      console.log('✅ The "Send Verification Email" functionality IS VISIBLE!');
    } else {
      console.log('❌ FAILURE! BUTTON NOT FOUND!');
      console.log('❌ The "Send Verification Email" button is NOT VISIBLE!');

      // Get page content for debugging
      console.log('\n📄 Page title:', await page.title());
      console.log('📄 Current URL:', page.url());

      // Take screenshot
      await page.screenshot({ path: 'admin-page-screenshot.png', fullPage: true });
      console.log('📸 Screenshot saved as admin-page-screenshot.png');
    }
    console.log('='.repeat(60) + '\n');

    // Keep browser open for 5 seconds to see the result
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
    console.log('🏁 Test completed');
  }
})();
