// Test glassmorphism styling on partner applications page
const { chromium } = require('playwright');

async function testStyling() {
  console.log('🎨 Testing Glassmorphism Styling...\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Login first
    console.log('📍 Step 1: Logging in as admin');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'admin@pdflab.test');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('   ✓ Logged in');

    // Navigate to partner applications
    console.log('\n📍 Step 2: Navigating to Partner Applications');
    await page.goto('http://localhost:3000/admin/partner-applications', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Take full page screenshot
    await page.screenshot({
      path: 'partner-applications-glassmorphism.png',
      fullPage: true
    });
    console.log('   ✓ Screenshot saved: partner-applications-glassmorphism.png');

    // Check for glassmorphism classes
    const cards = await page.$$('.glass-strong');
    console.log(`\n✅ Found ${cards.length} cards with glass-strong class`);

    // Compare with admin dashboard
    console.log('\n📍 Step 3: Comparing with Admin Dashboard');
    await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'admin-dashboard-glassmorphism.png',
      fullPage: true
    });
    console.log('   ✓ Screenshot saved: admin-dashboard-glassmorphism.png');

    const dashboardCards = await page.$$('.glass-strong');
    console.log(`   ✓ Dashboard has ${dashboardCards.length} cards with glass-strong class`);

    console.log('\n✅ STYLING TEST COMPLETE!');
    console.log('   Compare the two screenshots to verify consistency');

    // Keep browser open
    console.log('\n⏳ Keeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ path: 'styling-error.png' });
  } finally {
    await browser.close();
    console.log('\n✓ Test complete');
  }
}

testStyling().catch(console.error);
