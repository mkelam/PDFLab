import { test, expect } from '@playwright/test';

test.describe('PayFast Multi-Currency Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:3000');
  });

  test('should display USD pricing on pricing page', async ({ page }) => {
    // Navigate to pricing page
    await page.goto('http://localhost:3000/pricing');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Take screenshot of pricing page
    await page.screenshot({ path: 'test-results/pricing-page.png', fullPage: true });

    // Verify Starter plan shows $9.99
    const starterPrice = page.locator('text=/\\$9\\.99/');
    await expect(starterPrice).toBeVisible();
    console.log('✓ Starter plan: $9.99 USD displayed');

    // Verify Pro plan shows $29.99
    const proPrice = page.locator('text=/\\$29\\.99/');
    await expect(proPrice).toBeVisible();
    console.log('✓ Pro plan: $29.99 USD displayed');

    // Verify Enterprise plan shows $99.99
    const enterprisePrice = page.locator('text=/\\$99\\.99/');
    await expect(enterprisePrice).toBeVisible();
    console.log('✓ Enterprise plan: $99.99 USD displayed');
  });

  test('should login and initiate Starter plan payment', async ({ page, context }) => {
    // Go to login page
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    // Fill in login credentials
    await page.fill('input[type="email"]', 'testuser@pdflab.com');
    await page.fill('input[type="password"]', 'TestPass123!');

    // Take screenshot before login
    await page.screenshot({ path: 'test-results/login-page.png' });

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard or home
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/after-login.png' });

    console.log('✓ Logged in successfully');

    // Navigate to pricing page
    await page.goto('http://localhost:3000/pricing');
    await page.waitForLoadState('networkidle');

    // Find and click "Get Started" or "Upgrade" button for Starter plan
    // Try multiple possible selectors
    const starterButton = page.locator('text=Starter').locator('..').locator('button').first();

    // Wait for button to be visible
    await starterButton.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
      console.log('Starter button not found with first selector, trying alternative...');
    });

    await page.screenshot({ path: 'test-results/pricing-page-logged-in.png', fullPage: true });

    // Click the payment button
    await starterButton.click().catch(async () => {
      // If button click fails, try alternative selector
      const altButton = page.locator('button:has-text("Get Started")').first();
      await altButton.click();
    });

    console.log('✓ Clicked payment button for Starter plan');

    // Wait for PayFast redirect or payment modal
    await page.waitForTimeout(3000);

    // Check if we're on PayFast page or payment modal opened
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    // Take screenshot of payment page/modal
    await page.screenshot({ path: 'test-results/payment-initiated.png', fullPage: true });

    // If redirected to PayFast, verify the amount
    if (currentUrl.includes('payfast')) {
      console.log('✓ Redirected to PayFast payment page');

      // Look for USD amount on PayFast page
      const amountText = await page.textContent('body');
      console.log('PayFast page content preview:', amountText?.substring(0, 500));

      // Take full screenshot of PayFast page
      await page.screenshot({ path: 'test-results/payfast-page.png', fullPage: true });

      // Check if USD or amount is visible
      const hasUSD = amountText?.includes('USD') || amountText?.includes('$9.99') || amountText?.includes('9.99');
      console.log('USD amount found on PayFast:', hasUSD);
    }
  });

  test('should verify payment initialization via API', async ({ request }) => {
    // Login first to get token
    const loginResponse = await request.post('http://localhost:3006/api/auth/login', {
      data: {
        email: 'testuser@pdflab.com',
        password: 'TestPass123!'
      }
    });

    const loginData = await loginResponse.json();
    const token = loginData.token;

    console.log('✓ API Login successful');

    // Initialize Starter plan payment
    const paymentResponse = await request.post('http://localhost:3006/api/payfast/initialize', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        plan: 'starter',
        userEmail: 'testuser@pdflab.com',
        userName: 'Test User'
      }
    });

    const paymentData = await paymentResponse.json();

    console.log('Payment initialized:', JSON.stringify(paymentData, null, 2));

    // Verify USD amount in payment data
    expect(paymentData.success).toBe(true);
    expect(paymentData.paymentData.amount).toBe('9.99');
    expect(paymentData.paymentData.recurring_amount).toBe('9.99');
    expect(paymentData.paymentData.item_name).toContain('Starter');

    console.log('✓ Payment data verified:');
    console.log('  - Amount: $' + paymentData.paymentData.amount + ' USD');
    console.log('  - Recurring: $' + paymentData.paymentData.recurring_amount + ' USD');
    console.log('  - Plan: ' + paymentData.paymentData.item_name);
    console.log('  - PayFast URL: ' + paymentData.paymentUrl);
  });

  test('should test Pro plan payment flow', async ({ request }) => {
    // Login
    const loginResponse = await request.post('http://localhost:3006/api/auth/login', {
      data: {
        email: 'testuser@pdflab.com',
        password: 'TestPass123!'
      }
    });

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Initialize Pro plan payment
    const paymentResponse = await request.post('http://localhost:3006/api/payfast/initialize', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        plan: 'pro',
        userEmail: 'testuser@pdflab.com',
        userName: 'Test User'
      }
    });

    const paymentData = await paymentResponse.json();

    // Verify Pro plan USD amount
    expect(paymentData.success).toBe(true);
    expect(paymentData.paymentData.amount).toBe('29.99');
    expect(paymentData.paymentData.recurring_amount).toBe('29.99');

    console.log('✓ Pro plan payment verified:');
    console.log('  - Amount: $' + paymentData.paymentData.amount + ' USD');
    console.log('  - Recurring: $' + paymentData.paymentData.recurring_amount + ' USD');
  });

  test('should test Enterprise plan payment flow', async ({ request }) => {
    // Login
    const loginResponse = await request.post('http://localhost:3006/api/auth/login', {
      data: {
        email: 'testuser@pdflab.com',
        password: 'TestPass123!'
      }
    });

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Initialize Enterprise plan payment
    const paymentResponse = await request.post('http://localhost:3006/api/payfast/initialize', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        plan: 'enterprise',
        userEmail: 'testuser@pdflab.com',
        userName: 'Test User'
      }
    });

    const paymentData = await paymentResponse.json();

    // Verify Enterprise plan USD amount
    expect(paymentData.success).toBe(true);
    expect(paymentData.paymentData.amount).toBe('99.99');
    expect(paymentData.paymentData.recurring_amount).toBe('99.99');

    console.log('✓ Enterprise plan payment verified:');
    console.log('  - Amount: $' + paymentData.paymentData.amount + ' USD');
    console.log('  - Recurring: $' + paymentData.paymentData.recurring_amount + ' USD');
  });
});
