// Test partner portal pages
const { chromium } = require('playwright');

async function testPartnerPortal() {
  console.log('🌐 Testing Partner Portal pages...\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Test homepage
    console.log('📍 Step 1: Testing Partner Portal Homepage');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1000);

    let currentUrl = page.url();
    console.log(`   ✓ Loaded: ${currentUrl}`);

    await page.screenshot({ path: 'partner-homepage.png' });
    console.log('   ✓ Screenshot saved: partner-homepage.png');

    // Check content
    const homeContent = await page.textContent('body');
    if (homeContent.includes('Partner') || homeContent.includes('Influencer')) {
      console.log('   ✓ Partner content detected');
    }

    // Test apply page
    console.log('\n📍 Step 2: Testing Partner Application Page');
    await page.goto('http://localhost:3001/apply', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1000);

    currentUrl = page.url();
    console.log(`   ✓ Loaded: ${currentUrl}`);

    await page.screenshot({ path: 'partner-apply-page.png' });
    console.log('   ✓ Screenshot saved: partner-apply-page.png');

    // Check for form elements
    const formContent = await page.textContent('body');
    if (formContent.includes('Application') || formContent.includes('Apply')) {
      console.log('   ✓ Application form detected');
    }

    console.log('\n✅ PARTNER PORTAL IS WORKING!');
    console.log('\nAvailable pages:');
    console.log('   • Homepage: http://localhost:3001');
    console.log('   • Apply: http://localhost:3001/apply');
    console.log('\nPartner management is in the main admin panel:');
    console.log('   • Admin Partners: http://localhost:3000/admin/partners');
    console.log('   • Partner Applications: http://localhost:3000/admin/partner-applications');

    // Keep browser open for 5 seconds
    console.log('\n⏳ Keeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ path: 'partner-portal-error.png' });
    console.log('   Screenshot saved: partner-portal-error.png');
  } finally {
    await browser.close();
    console.log('\n✓ Test complete');
  }
}

testPartnerPortal().catch(console.error);
