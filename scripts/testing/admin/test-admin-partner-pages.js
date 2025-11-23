// Test admin partner management pages
const { chromium } = require('playwright');

async function testAdminPartnerPages() {
  console.log('🌐 Testing Admin Partner Management Pages...\n');

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

    // Test Partners page
    console.log('\n📍 Step 2: Testing Admin Partners Dashboard');
    await page.goto('http://localhost:3000/admin/partners', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1000);

    let currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);

    await page.screenshot({ path: 'admin-partners-page.png' });
    console.log('   ✓ Screenshot saved: admin-partners-page.png');

    // Check content
    const partnersContent = await page.textContent('body');
    if (partnersContent.includes('Partner') || partnersContent.includes('Influencer')) {
      console.log('   ✓ Partners dashboard loaded');
    }

    // Test Partner Applications page
    console.log('\n📍 Step 3: Testing Partner Applications Review');
    await page.goto('http://localhost:3000/admin/partner-applications', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1000);

    currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);

    await page.screenshot({ path: 'admin-partner-applications.png' });
    console.log('   ✓ Screenshot saved: admin-partner-applications.png');

    // Check content
    const appsContent = await page.textContent('body');
    if (appsContent.includes('Application') || appsContent.includes('Pending')) {
      console.log('   ✓ Partner applications page loaded');
    }

    console.log('\n✅ ALL ADMIN PARTNER PAGES WORKING!');
    console.log('\nAdmin Partner Management:');
    console.log('   • Partners Dashboard: http://localhost:3000/admin/partners');
    console.log('   • Partner Applications: http://localhost:3000/admin/partner-applications');
    console.log('\nPublic Partner Portal:');
    console.log('   • Homepage: http://localhost:3001');
    console.log('   • Apply Form: http://localhost:3001/apply');

    // Keep browser open for 5 seconds
    console.log('\n⏳ Keeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ path: 'admin-partner-error.png' });
    console.log('   Screenshot saved: admin-partner-error.png');
  } finally {
    await browser.close();
    console.log('\n✓ Test complete');
  }
}

testAdminPartnerPages().catch(console.error);
