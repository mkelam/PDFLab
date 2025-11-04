const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Starting screenshot test...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    // Step 1: Navigate to login
    console.log('📍 Step 1: Going to http://localhost:3001/login');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle' });
    await page.screenshot({ path: '01-login-page.png', fullPage: true });
    console.log('   ✅ Screenshot saved: 01-login-page.png');

    // Step 2: Fill in login credentials
    console.log('\n📍 Step 2: Entering credentials...');
    console.log('   Email: admin@pdflab.test');
    console.log('   Password: Admin123!');

    await page.fill('input[type="email"]', 'admin@pdflab.test');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.screenshot({ path: '02-login-filled.png', fullPage: true });
    console.log('   ✅ Screenshot saved: 02-login-filled.png');

    // Step 3: Click login button
    console.log('\n📍 Step 3: Clicking login button...');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '03-after-login.png', fullPage: true });
    console.log('   ✅ Screenshot saved: 03-after-login.png');
    console.log('   Current URL:', page.url());

    // Step 4: Navigate to admin users
    console.log('\n📍 Step 4: Going to admin users page...');
    await page.goto('http://localhost:3001/admin/users', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '04-admin-users-list.png', fullPage: true });
    console.log('   ✅ Screenshot saved: 04-admin-users-list.png');

    // Step 5: Click first user
    console.log('\n📍 Step 5: Looking for first user...');
    const userLinks = await page.locator('a[href^="/admin/users/"]').all();
    console.log('   Found', userLinks.length, 'user links');

    if (userLinks.length > 0) {
      console.log('   Clicking first user...');
      await userLinks[0].click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: '05-user-detail-page.png', fullPage: true });
      console.log('   ✅ Screenshot saved: 05-user-detail-page.png');
      console.log('   Current URL:', page.url());

      // Step 6: Search for the button
      console.log('\n📍 Step 6: Searching for "Send Verification Email" button...');

      const pageContent = await page.content();
      const hasButtonText = pageContent.includes('Send Verification Email');
      console.log('   Page contains "Send Verification Email" text:', hasButtonText ? 'YES ✅' : 'NO ❌');

      const buttonExists = await page.locator('button:has-text("Send Verification Email")').count();
      console.log('   Button element found:', buttonExists > 0 ? 'YES ✅' : 'NO ❌');

      // Highlight where the button should be
      await page.evaluate(() => {
        const statusCards = document.querySelectorAll('.glass-strong');
        if (statusCards.length > 0) {
          statusCards[0].style.border = '3px solid red';
        }
      });
      await page.screenshot({ path: '06-status-card-highlighted.png', fullPage: true });
      console.log('   ✅ Screenshot saved: 06-status-card-highlighted.png (status card highlighted in red)');

    } else {
      console.log('   ❌ No users found in list!');
    }

    console.log('\n' + '='.repeat(70));
    console.log('📸 ALL SCREENSHOTS SAVED!');
    console.log('='.repeat(70));
    console.log('\nPlease check these screenshot files to see what the user is seeing:');
    console.log('  - 05-user-detail-page.png (Full user detail page)');
    console.log('  - 06-status-card-highlighted.png (Status card with red border)');
    console.log('');

    // Keep browser open for 10 seconds
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    console.log('   ✅ Error screenshot saved: error-screenshot.png');
  } finally {
    await browser.close();
    console.log('\n🏁 Test completed\n');
  }
})();
