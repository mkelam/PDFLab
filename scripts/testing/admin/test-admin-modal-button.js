const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    // Login
    await page.goto('http://localhost:3001/login');
    await page.waitForTimeout(1000);
    await page.fill('input[type="email"]', 'admin@pdflab.test');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Navigate to admin users
    await page.goto('http://localhost:3001/admin/users');
    await page.waitForTimeout(2000);

    // Click first View button
    const viewButtons = await page.$$('button:has-text("View")');
    if (viewButtons.length > 0) {
      await viewButtons[0].click();
      await page.waitForTimeout(1500);
    }

    // Take screenshot
    await page.screenshot({
      path: 'admin-user-modal-verification.png',
      fullPage: true
    });

    console.log('Screenshot saved: admin-user-modal-verification.png');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();
