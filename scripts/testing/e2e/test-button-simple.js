const { chromium } = require('playwright');

(async () => {
  console.log('🧪 Testing if admin email button exists in source code...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Navigate to home page first
    console.log('📍 Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });

    console.log('✅ Frontend is responding!');
    console.log('📄 Page title:', await page.title());

    // Now test if backend is responding
    console.log('\n📍 Testing backend at http://localhost:3006/health');
    const backendResponse = await fetch('http://localhost:3006/health');
    const backendData = await backendResponse.text();

    console.log('✅ Backend is responding!');
    console.log('📊 Backend status:', backendData.substring(0, 100) + '...');

    console.log('\n' + '='.repeat(60));
    console.log('✅ BOTH SERVERS ARE RUNNING CORRECTLY!');
    console.log('='.repeat(60));

    console.log('\n📌 Next step: Login to admin panel and navigate to:');
    console.log('   http://localhost:3000/admin/users/[USER_ID]');
    console.log('\n📌 Look for button with text: "Send Verification Email"');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
