const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('🚀 Testing staging frontend...');

  // Navigate to login page
  console.log('📍 Navigating to login page...');
  await page.goto('http://141.136.44.168:3002/login');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Fill in credentials
  console.log('📝 Filling in credentials...');
  await page.fill('input[type="email"]', 'admin@pdflab.test');
  await page.fill('input[type="password"]', 'Admin123!');

  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('❌ Browser console error:', msg.text());
    }
  });

  // Click login button
  console.log('🔑 Clicking login button...');
  await page.click('button[type="submit"]');

  // Wait for navigation or error
  try {
    await page.waitForURL('**/admin', { timeout: 10000 });
    console.log('✅ SUCCESS! Redirected to /admin');
    console.log('✅ Frontend can now connect to backend API correctly');
  } catch (error) {
    console.error('❌ FAILED! Did not redirect to /admin');
    console.error('Current URL:', page.url());

    // Take a screenshot
    await page.screenshot({ path: 'test-results/admin-login-failed.png' });
    console.log('📸 Screenshot saved to test-results/admin-login-failed.png');
  }

  await browser.close();
})();
