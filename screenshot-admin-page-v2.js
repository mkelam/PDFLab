const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Starting screenshot test V2...\n');

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

    // Step 2: Fill in login credentials
    console.log('📍 Step 2: Logging in as admin@pdflab.test');
    await page.fill('input[type="email"]', 'admin@pdflab.test');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Step 3: Navigate to admin users
    console.log('📍 Step 3: Going to admin users page...');
    await page.goto('http://localhost:3001/admin/users', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Step 4: Click the FIRST "View" button
    console.log('📍 Step 4: Clicking first View button...');
    const viewButtons = await page.locator('button:has-text("View")').all();
    console.log('   Found', viewButtons.length, 'View buttons');

    if (viewButtons.length > 0) {
      await viewButtons[0].click();
      await page.waitForTimeout(3000);
      console.log('   Current URL:', page.url());

      // Step 5: Take screenshot of user detail page
      console.log('\n📍 Step 5: Taking screenshot of user detail page...');
      await page.screenshot({ path: 'USER-DETAIL-PAGE.png', fullPage: true });
      console.log('   ✅ Screenshot saved: USER-DETAIL-PAGE.png');

      // Step 6: Search for the button
      console.log('\n📍 Step 6: Analyzing page for Send Verification Email button...');

      const pageContent = await page.content();
      const hasButtonText = pageContent.includes('Send Verification Email');
      console.log('   Page HTML contains "Send Verification Email":', hasButtonText ? 'YES ✅' : 'NO ❌');

      const sendButton = await page.locator('button:has-text("Send Verification Email")').count();
      console.log('   <button> element with text found:', sendButton > 0 ? 'YES ✅' : 'NO ❌');

      // Look for all buttons on the page
      const allButtons = await page.locator('button').all();
      console.log('\n   All buttons on page (' + allButtons.length + ' total):');
      for (let i = 0; i < Math.min(allButtons.length, 20); i++) {
        const text = await allButtons[i].textContent();
        console.log('     - Button', i + 1 + ':', text ? text.trim() : '(no text)');
      }

      // Step 7: Highlight the status cards
      await page.evaluate(() => {
        const cards = document.querySelectorAll('.glass-strong');
        cards.forEach((card, index) => {
          card.style.border = '5px solid ' + (index === 0 ? 'red' : 'blue');
        });
      });
      await page.screenshot({ path: 'USER-DETAIL-WITH-HIGHLIGHTS.png', fullPage: true });
      console.log('\n   ✅ Screenshot saved: USER-DETAIL-WITH-HIGHLIGHTS.png');
      console.log('      (First card highlighted in RED - where button should be)');

    } else {
      console.log('   ❌ No View buttons found!');
    }

    console.log('\n' + '='.repeat(70));
    console.log('📸 CHECK THESE SCREENSHOTS:');
    console.log('   1. USER-DETAIL-PAGE.png - What user sees');
    console.log('   2. USER-DETAIL-WITH-HIGHLIGHTS.png - Cards highlighted');
    console.log('='.repeat(70));

    // Keep browser open for inspection
    await page.waitForTimeout(15000);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: 'ERROR.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\n🏁 Test completed\n');
  }
})();
