/**
 * PayFast Sandbox Payment Flow Test
 *
 * This test executes a complete payment workflow through PayFast sandbox:
 * 1. Navigate to pricing page
 * 2. Select a plan (Starter)
 * 3. Sign up new user
 * 4. Complete payment form
 * 5. Verify ITN webhook callback
 * 6. Verify database updates
 */

const { chromium } = require('playwright');
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:3006';
const SCREENSHOT_DIR = path.join(__dirname, 'test-screenshots-payfast-sandbox');
const TEST_PLAN = 'starter'; // 'starter' or 'pro' or 'enterprise'

// Database configuration (from backend/.env)
const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'pdflab',
  password: '***REMOVED***',
  database: 'pdflab'
};

// Test user credentials
const testUser = {
  firstName: 'PayFast',
  lastName: 'Sandbox',
  email: `payfast-test-${Date.now()}@pdflab.com`,
  password: 'TestPass123!'
};

let screenshotCounter = 1;
let testResults = [];
let db;

async function recordTest(name, passed, details = '') {
  const result = {
    name,
    passed,
    details,
    timestamp: new Date().toISOString()
  };
  testResults.push(result);

  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}${details ? ': ' + details : ''}`);

  return passed;
}

async function takeScreenshot(page, name) {
  const filename = `${String(screenshotCounter).padStart(2, '0')}-${name}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot: ${filename}`);
  screenshotCounter++;
  return filename;
}

async function setupDatabase() {
  console.log('\n🔌 Connecting to database...');
  db = await mysql.createConnection(DB_CONFIG);
  await recordTest('Database connection established', true, `Connected to ${DB_CONFIG.database}`);
}

async function queryDatabase(query, params = []) {
  const [rows] = await db.execute(query, params);
  return rows;
}

async function verifyDatabaseRecords(userEmail) {
  console.log('\n🔍 Verifying database records...');

  // Check user record
  const users = await queryDatabase('SELECT * FROM users WHERE email = ?', [userEmail]);
  if (users.length > 0) {
    const user = users[0];
    await recordTest('User record found in database', true,
      `ID: ${user.id}, Plan: ${user.plan}, Email: ${user.email}`);

    // Check payment logs
    const paymentLogs = await queryDatabase(
      'SELECT * FROM payment_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [user.id]
    );

    if (paymentLogs.length > 0) {
      const payment = paymentLogs[0];
      await recordTest('Payment log record created', true,
        `Transaction: ${payment.transaction_id}, Status: ${payment.status}, Amount: ${payment.amount_gross} ${payment.currency}`);
    } else {
      await recordTest('Payment log record created', false, 'No payment logs found');
    }

    // Check subscriptions
    const subscriptions = await queryDatabase(
      'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [user.id]
    );

    if (subscriptions.length > 0) {
      const subscription = subscriptions[0];
      await recordTest('Subscription record created', true,
        `ID: ${subscription.id}, Plan: ${subscription.plan}, Status: ${subscription.status}, Amount: ${subscription.amount} ${subscription.currency}`);
    } else {
      await recordTest('Subscription record created', false, 'No subscriptions found');
    }

    // Verify plan upgrade
    const expectedPlan = TEST_PLAN;
    await recordTest(`User plan upgraded to '${expectedPlan}'`,
      user.plan === expectedPlan,
      `Expected: ${expectedPlan}, Actual: ${user.plan}`);

  } else {
    await recordTest('User record found in database', false, `No user found with email: ${userEmail}`);
  }
}

async function generateHTMLReport() {
  const passedCount = testResults.filter(r => r.passed).length;
  const failedCount = testResults.filter(r => !r.passed).length;
  const passRate = ((passedCount / testResults.length) * 100).toFixed(1);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PayFast Sandbox Test Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            color: #1a202c;
            margin-bottom: 10px;
            font-size: 2.5em;
        }
        .timestamp {
            color: #718096;
            margin-bottom: 30px;
            font-size: 0.9em;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-card.success { background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); }
        .stat-card.error { background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%); }
        .stat-value {
            font-size: 3em;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .stat-label {
            font-size: 0.9em;
            opacity: 0.9;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .test-section {
            margin-bottom: 40px;
        }
        .test-section h2 {
            color: #2d3748;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
        }
        .test-item {
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 6px;
            border-left: 4px solid #48bb78;
            background: #f7fafc;
        }
        .test-item.failed {
            border-left-color: #f56565;
            background: #fff5f5;
        }
        .test-name {
            font-weight: 600;
            color: #1a202c;
            margin-bottom: 5px;
        }
        .test-details {
            color: #4a5568;
            font-size: 0.9em;
            font-family: 'Courier New', monospace;
        }
        .test-timestamp {
            color: #a0aec0;
            font-size: 0.8em;
            margin-top: 5px;
        }
        .user-info {
            background: #edf2f7;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .user-info h3 {
            color: #2d3748;
            margin-bottom: 10px;
        }
        .user-info code {
            background: #2d3748;
            color: #48bb78;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.9em;
        }
        .screenshot-gallery {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .screenshot-item {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
            background: white;
        }
        .screenshot-item img {
            width: 100%;
            height: auto;
            display: block;
        }
        .screenshot-caption {
            padding: 10px;
            background: #f7fafc;
            font-size: 0.85em;
            color: #4a5568;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>PayFast Sandbox Payment Test</h1>
        <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>

        <div class="summary">
            <div class="stat-card">
                <div class="stat-value">${testResults.length}</div>
                <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-card success">
                <div class="stat-value">${passedCount}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card error">
                <div class="stat-value">${failedCount}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${passRate}%</div>
                <div class="stat-label">Pass Rate</div>
            </div>
        </div>

        <div class="user-info">
            <h3>Test User Credentials</h3>
            <p><strong>Email:</strong> <code>${testUser.email}</code></p>
            <p><strong>Name:</strong> <code>${testUser.firstName} ${testUser.lastName}</code></p>
            <p><strong>Plan:</strong> <code>${TEST_PLAN}</code></p>
        </div>

        <div class="test-section">
            <h2>Test Results</h2>
            ${testResults.map(test => `
                <div class="test-item ${test.passed ? '' : 'failed'}">
                    <div class="test-name">${test.passed ? '✅' : '❌'} ${test.name}</div>
                    ${test.details ? `<div class="test-details">${test.details}</div>` : ''}
                    <div class="test-timestamp">${new Date(test.timestamp).toLocaleTimeString()}</div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;

  const reportPath = path.join(SCREENSHOT_DIR, 'payfast-sandbox-report.html');
  await fs.writeFile(reportPath, html);
  console.log(`\n📄 Report generated: ${reportPath}`);
}

async function runPayFastSandboxTest() {
  console.log('🚀 Starting PayFast Sandbox Payment Flow Test\n');
  console.log(`📧 Test User: ${testUser.email}`);
  console.log(`💳 Test Plan: ${TEST_PLAN}\n`);

  // Create screenshot directory
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });

  // Setup database connection
  await setupDatabase();

  const browser = await chromium.launch({
    headless: false, // Set to true for CI/CD
    slowMo: 500 // Slow down actions for better visibility
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
  });

  const page = await context.newPage();

  try {
    // Step 1: Navigate to pricing page
    console.log('\n📍 Step 1: Navigate to Pricing Page');
    await page.goto(`${FRONTEND_URL}/pricing`, { waitUntil: 'networkidle' });
    await takeScreenshot(page, 'pricing-page');

    const title = await page.title();
    await recordTest('Pricing page loaded',
      title.includes('Pricing') || title.includes('PDFLab') || title.includes('PDF'),
      `Title: ${title}`);

    // Step 2: Click "Choose Starter" button
    console.log('\n📍 Step 2: Select Starter Plan');
    const starterButton = page.locator('button:has-text("Choose Starter"), a:has-text("Choose Starter")').first();
    await starterButton.waitFor({ state: 'visible', timeout: 10000 });
    await takeScreenshot(page, 'before-choose-starter');
    await starterButton.click();

    // Wait for navigation
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    await takeScreenshot(page, 'after-choose-starter');

    await recordTest('Redirected to signup/login',
      currentUrl.includes('/get-started') || currentUrl.includes('/login') || currentUrl.includes('/payment'),
      `URL: ${currentUrl}`);

    // Step 3: Sign up new user
    if (currentUrl.includes('/get-started') || currentUrl.includes('/signup')) {
      console.log('\n📍 Step 3: Sign Up New User');

      // Fill signup form
      const firstNameInput = page.locator('#firstName');
      await firstNameInput.waitFor({ state: 'visible', timeout: 10000 });
      await firstNameInput.fill(testUser.firstName);

      const lastNameInput = page.locator('#lastName');
      await lastNameInput.fill(testUser.lastName);

      const emailInput = page.locator('#signup-email');
      await emailInput.fill(testUser.email);

      const passwordInput = page.locator('#signup-password');
      await passwordInput.fill(testUser.password);

      const confirmPasswordInput = page.locator('#confirmPassword');
      await confirmPasswordInput.fill(testUser.password);

      await takeScreenshot(page, 'signup-form-filled');

      // Accept terms
      const termsCheckbox = page.locator('#acceptTerms');
      await termsCheckbox.check();

      // Submit form
      const submitButton = page.locator('button[type="submit"]:has-text("Continue to Payment")');
      await takeScreenshot(page, 'before-signup-submit');
      await submitButton.click();

      // Wait for navigation
      await page.waitForTimeout(3000);
      const afterSignupUrl = page.url();
      await takeScreenshot(page, 'after-signup-submit');

      await recordTest('Signup successful - redirected to payment',
        afterSignupUrl.includes('/payment'),
        `URL: ${afterSignupUrl}`);
    }

    // Step 4: Fill payment form and submit
    console.log('\n📍 Step 4: Complete Payment Form');

    // Wait for payment page
    await page.waitForURL('**/payment**', { timeout: 10000 });
    await takeScreenshot(page, 'payment-page');

    // Verify user email is shown (authenticated state)
    const pageContent = await page.content();
    await recordTest('Payment page shows user email',
      pageContent.includes(testUser.email),
      `Found email: ${testUser.email}`);

    // Click "Proceed to Secure Payment" button
    const proceedButton = page.locator('button:has-text("Proceed to Secure Payment"), a:has-text("Proceed to Secure Payment")').first();
    await proceedButton.waitFor({ state: 'visible', timeout: 10000 });
    await takeScreenshot(page, 'before-proceed-payment');

    console.log('\n⚠️  About to redirect to PayFast sandbox...');
    console.log('📋 Manual Steps Required:');
    console.log('   1. PayFast sandbox page will open');
    console.log('   2. Use any test card details from PayFast docs');
    console.log('   3. Complete the payment');
    console.log('   4. Wait for redirect back to PDFLab\n');

    await proceedButton.click();

    // Wait for PayFast page to load
    await page.waitForTimeout(3000);
    const payfastUrl = page.url();
    await takeScreenshot(page, 'payfast-payment-page');

    await recordTest('Redirected to PayFast sandbox',
      payfastUrl.includes('payfast') || payfastUrl.includes('sandbox'),
      `URL: ${payfastUrl}`);

    console.log('\n⏳ Waiting for manual payment completion (120 seconds timeout)...');

    // Wait for return to success page (manual payment completion)
    try {
      await page.waitForURL('**/payment/success**', { timeout: 120000 });
      await takeScreenshot(page, 'payment-success-page');
      await recordTest('Payment completed - redirected to success page', true, page.url());

      // Wait a bit for ITN webhook to process
      console.log('\n⏳ Waiting for ITN webhook processing (10 seconds)...');
      await page.waitForTimeout(10000);

      // Verify database records
      await verifyDatabaseRecords(testUser.email);

    } catch (error) {
      await takeScreenshot(page, 'payment-timeout');
      await recordTest('Payment completed - redirected to success page', false,
        `Timeout waiting for payment completion: ${error.message}`);
    }

  } catch (error) {
    console.error('\n❌ Test error:', error);
    await takeScreenshot(page, 'error-state');
    await recordTest('Test execution', false, `Error: ${error.message}`);
  } finally {
    await browser.close();
    if (db) {
      await db.end();
      console.log('\n🔌 Database connection closed');
    }

    // Generate report
    await generateHTMLReport();

    // Print summary
    const passedCount = testResults.filter(r => r.passed).length;
    const failedCount = testResults.filter(r => !r.passed).length;
    const passRate = ((passedCount / testResults.length) * 100).toFixed(1);

    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${testResults.length}`);
    console.log(`Passed: ${passedCount} ✅`);
    console.log(`Failed: ${failedCount} ❌`);
    console.log(`Pass Rate: ${passRate}%`);
    console.log('='.repeat(60));
  }
}

// Run the test
runPayFastSandboxTest().catch(console.error);
