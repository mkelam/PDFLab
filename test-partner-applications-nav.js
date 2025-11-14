// Test partner applications page navigation
const { chromium } = require('playwright');

async function testNavigation() {
  console.log('🌐 Testing Partner Applications Page Navigation...\n');

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
    console.log('   ✓ Logged in successfully');

    // Navigate to partner applications
    console.log('\n📍 Step 2: Navigating to Partner Applications');
    await page.goto('http://localhost:3000/admin/partner-applications', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1000);

    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);

    // Check for admin navigation
    const hasNav = await page.$('nav, [role="navigation"], .admin-nav, header nav');
    if (hasNav) {
      console.log('   ✅ Navigation element found!');

      // Check for specific nav items
      const navText = await page.textContent('body');
      const navItems = ['Dashboard', 'Users', 'Partners', 'Analytics', 'System'];
      const foundItems = navItems.filter(item => navText.includes(item));

      console.log(`   ✓ Found navigation items: ${foundItems.join(', ')}`);
    } else {
      console.log('   ❌ No navigation element found');
    }

    // Take screenshot
    await page.screenshot({ path: 'partner-applications-with-nav.png', fullPage: true });
    console.log('   ✓ Screenshot saved: partner-applications-with-nav.png');

    // Keep browser open for viewing
    console.log('\n⏳ Keeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ path: 'nav-test-error.png' });
  } finally {
    await browser.close();
    console.log('\n✓ Test complete');
  }
}

testNavigation().catch(console.error);
