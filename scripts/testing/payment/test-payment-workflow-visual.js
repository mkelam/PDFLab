/**
 * Comprehensive Payment Workflow E2E Testing with Screenshots
 * Uses Playwright to capture every step of the payment flow
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Test configuration
const baseUrl = 'http://localhost:3000';
const apiUrl = 'http://localhost:3006';
const screenshotsDir = path.join(__dirname, 'test-screenshots-payment');

// Test user credentials
const testUser = {
  email: `payment-test-${Date.now()}@pdflab.com`,
  password: 'TestPass123!',
  firstName: 'Payment',
  lastName: 'Test'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, description) {
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}[STEP ${step}]${colors.reset} ${colors.magenta}${description}${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
}

function logSuccess(message) {
  console.log(`  ${colors.green}✓${colors.reset} ${message}`);
}

function logError(message) {
  console.log(`  ${colors.red}✗${colors.reset} ${message}`);
}

function logInfo(message) {
  console.log(`  ${colors.blue}ℹ${colors.reset} ${message}`);
}

function logScreenshot(filename) {
  console.log(`  ${colors.yellow}📸 Screenshot:${colors.reset} ${filename}`);
}

// Test results
const testResults = {
  passed: 0,
  failed: 0,
  screenshots: [],
  errors: []
};

// Create screenshots directory
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function takeScreenshot(page, name, description) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const filename = `${String(testResults.screenshots.length + 1).padStart(2, '0')}-${name}-${timestamp}.png`;
  const filepath = path.join(screenshotsDir, filename);

  await page.screenshot({ path: filepath, fullPage: true });

  testResults.screenshots.push({ filename, description, timestamp });
  logScreenshot(filename);
  logInfo(description);

  return filepath;
}

async function recordTest(name, passed, details = '') {
  if (passed) {
    testResults.passed++;
    logSuccess(`${name}`);
  } else {
    testResults.failed++;
    logError(`${name}`);
    testResults.errors.push({ test: name, details });
  }
  if (details) {
    logInfo(details);
  }
}

async function testPricingPage(page) {
  logStep(1, 'Testing Pricing Page');

  try {
    await page.goto(`${baseUrl}/pricing`, { waitUntil: 'networkidle' });
    await takeScreenshot(page, 'pricing-page-loaded', 'Pricing page loaded');

    // Check page title - accept any reasonable pricing page title
    const title = await page.title();
    await recordTest('Pricing page title correct', title.includes('Pricing') || title.includes('PDFLab') || title.includes('PDF Lab'), `Title: ${title}`);

    // Check if plans are visible
    const freeVisible = await page.locator('text=Free').first().isVisible().catch(() => false);
    await recordTest('Free plan visible', freeVisible);

    const starterVisible = await page.locator('text=Starter').first().isVisible().catch(() => false);
    await recordTest('Starter plan visible', starterVisible);

    const proVisible = await page.locator('text=Pro').first().isVisible().catch(() => false);
    await recordTest('Pro plan visible', proVisible);

    // Check for pricing
    const starterPrice = await page.locator('text=$4.55').first().isVisible().catch(() => false);
    await recordTest('Starter price ($4.55) displayed', starterPrice);

    // Pro price might be displayed in different formats ($13.50 or $13.5 or 13.50)
    const proPriceVisible = await page.locator('text=/\\$?13\\.5/').first().isVisible().catch(() => false);
    await recordTest('Pro price ($13.50) displayed', proPriceVisible);

    // Check for discount badges
    await page.waitForTimeout(1000); // Let page fully render
    await takeScreenshot(page, 'pricing-with-discounts', 'Pricing page showing discount badges');

    return true;
  } catch (error) {
    await recordTest('Pricing page loads', false, error.message);
    await takeScreenshot(page, 'pricing-page-error', 'Error loading pricing page');
    return false;
  }
}

async function testClickChooseStarter(page) {
  logStep(2, 'Testing "Choose Starter" Button Click');

  try {
    await page.goto(`${baseUrl}/pricing`, { waitUntil: 'networkidle' });

    // Find and click "Choose Starter" button
    const starterButton = page.locator('button, a').filter({ hasText: /Choose.*Starter|Get.*Starter/i }).first();

    const buttonVisible = await starterButton.isVisible().catch(() => false);
    await recordTest('Choose Starter button visible', buttonVisible);

    if (buttonVisible) {
      await takeScreenshot(page, 'before-click-starter', 'Before clicking Choose Starter');

      await starterButton.click();
      await page.waitForTimeout(2000); // Wait for navigation
      await takeScreenshot(page, 'after-click-starter', 'After clicking Choose Starter');

      const currentUrl = page.url();
      const redirectedCorrectly = currentUrl.includes('/get-started') && currentUrl.includes('plan=starter');
      await recordTest('Redirected to /get-started?plan=starter', redirectedCorrectly, `URL: ${currentUrl}`);

      return redirectedCorrectly;
    }

    return false;
  } catch (error) {
    await recordTest('Choose Starter button click', false, error.message);
    await takeScreenshot(page, 'starter-click-error', 'Error clicking Choose Starter');
    return false;
  }
}

async function testGetStartedPage(page) {
  logStep(3, 'Testing Get-Started Page');

  try {
    await page.goto(`${baseUrl}/get-started?plan=starter`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'get-started-page', 'Get-Started page loaded with plan=starter');

    // Check for plan sidebar
    const planSidebarVisible = await page.locator('text=Starter').first().isVisible().catch(() => false);
    await recordTest('Plan sidebar visible', planSidebarVisible);

    // Check for auth tabs
    const signupTabVisible = await page.locator('text=Sign Up').first().isVisible().catch(() => false);
    await recordTest('Sign Up tab visible', signupTabVisible);

    const loginTabVisible = await page.locator('text=Log In').first().isVisible().catch(() => false);
    await recordTest('Log In tab visible', loginTabVisible);

    // Check for form fields
    const emailField = page.locator('input[type="email"]').first();
    const emailVisible = await emailField.isVisible().catch(() => false);
    await recordTest('Email field visible', emailVisible);

    const passwordField = page.locator('input[type="password"]').first();
    const passwordVisible = await passwordField.isVisible().catch(() => false);
    await recordTest('Password field visible', passwordVisible);

    return true;
  } catch (error) {
    await recordTest('Get-Started page loads', false, error.message);
    await takeScreenshot(page, 'get-started-error', 'Error loading Get-Started page');
    return false;
  }
}

async function testSignupFlow(page) {
  logStep(4, 'Testing Signup Flow');

  try {
    await page.goto(`${baseUrl}/get-started?plan=starter`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Check if Sign Up tab is active, if not click it
    const signupTab = page.locator('text=Sign Up').first();
    await signupTab.click().catch(() => {});
    await page.waitForTimeout(500);

    await takeScreenshot(page, 'signup-form-empty', 'Signup form empty');

    // Fill signup form
    logInfo('Filling signup form...');

    // Fill First Name - uses id="firstName"
    const firstNameInput = page.locator('#firstName');
    await firstNameInput.fill(testUser.firstName);
    await page.waitForTimeout(300);

    // Fill Last Name - uses id="lastName"
    const lastNameInput = page.locator('#lastName');
    await lastNameInput.fill(testUser.lastName);
    await page.waitForTimeout(300);

    // Fill Email - uses id="signup-email"
    const emailInput = page.locator('#signup-email');
    await emailInput.fill(testUser.email);
    await page.waitForTimeout(300);

    // Fill Password - uses id="signup-password"
    const passwordInput = page.locator('#signup-password');
    await passwordInput.fill(testUser.password);
    await page.waitForTimeout(300);

    // Fill Confirm Password - uses id="confirmPassword"
    const confirmPasswordInput = page.locator('#confirmPassword');
    await confirmPasswordInput.fill(testUser.password);
    await page.waitForTimeout(300);

    // Check terms checkbox - uses id="acceptTerms"
    const termsCheckbox = page.locator('#acceptTerms');
    const checkboxVisible = await termsCheckbox.isVisible().catch(() => false);
    if (checkboxVisible) {
      await termsCheckbox.check();
      await page.waitForTimeout(300);
    }

    await takeScreenshot(page, 'signup-form-filled', 'Signup form filled with test data');

    // Submit form - button text is "Continue to Payment"
    logInfo('Submitting signup form...');
    const submitButton = page.locator('button[type="submit"]').filter({ hasText: /Continue to Payment/i }).first();
    await submitButton.click();

    // Wait for response
    await page.waitForTimeout(3000);
    await takeScreenshot(page, 'after-signup-submit', 'After signup submission');

    const currentUrl = page.url();
    logInfo(`Current URL: ${currentUrl}`);

    // Check if redirected to payment page or login page (both indicate success)
    if (currentUrl.includes('/payment')) {
      await recordTest('Signup successful - redirected to payment', true, `URL: ${currentUrl}`);
      return true;
    } else if (currentUrl.includes('/login')) {
      // Signup succeeded but redirected to old login page instead of payment
      await recordTest('Signup created user but redirected to /login (should be /payment)', false, `URL: ${currentUrl} - User was created successfully but wrong redirect`);
      logInfo('Note: User was created successfully, just wrong redirect page');
      return 'wrong_redirect';
    } else if (currentUrl.includes('already exists')) {
      logInfo('User already exists, will try login instead');
      return 'user_exists';
    } else {
      // Check for error messages
      const errorVisible = await page.locator('text=/error|invalid|failed/i').first().isVisible({ timeout: 1000 }).catch(() => false);
      if (errorVisible) {
        const errorText = await page.locator('text=/error|invalid|failed/i').first().textContent().catch(() => 'Unknown error');
        await recordTest('Signup form validation', false, `Error: ${errorText}`);
      } else {
        await recordTest('Signup form submission', false, 'Did not redirect to payment page');
      }
      return false;
    }
  } catch (error) {
    await recordTest('Signup flow', false, error.message);
    await takeScreenshot(page, 'signup-error', 'Error during signup');
    return false;
  }
}

async function testLoginFlow(page) {
  logStep(5, 'Testing Login Flow (Alternative)');

  try {
    await page.goto(`${baseUrl}/get-started?plan=pro`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Click Login tab
    const loginTab = page.locator('text=Log In').first();
    await loginTab.click();
    await page.waitForTimeout(500);

    await takeScreenshot(page, 'login-form-empty', 'Login form empty');

    // Fill login form
    logInfo('Filling login form...');

    // Login form uses id="login-email" and id="login-password"
    const emailInput = page.locator('#login-email');
    await emailInput.fill(testUser.email);
    await page.waitForTimeout(300);

    const passwordInput = page.locator('#login-password');
    await passwordInput.fill(testUser.password);
    await page.waitForTimeout(300);

    await takeScreenshot(page, 'login-form-filled', 'Login form filled');

    // Submit form - button text is "Continue to Payment"
    logInfo('Submitting login form...');
    const submitButton = page.locator('button[type="submit"]').filter({ hasText: /Continue to Payment/i }).first();
    await submitButton.click();

    // Wait for response
    await page.waitForTimeout(3000);
    await takeScreenshot(page, 'after-login-submit', 'After login submission');

    const currentUrl = page.url();
    logInfo(`Current URL: ${currentUrl}`);

    if (currentUrl.includes('/payment')) {
      await recordTest('Login successful - redirected to payment', true, `URL: ${currentUrl}`);
      return true;
    } else {
      await recordTest('Login flow', false, 'Did not redirect to payment page');
      return false;
    }
  } catch (error) {
    await recordTest('Login flow', false, error.message);
    await takeScreenshot(page, 'login-error', 'Error during login');
    return false;
  }
}

async function testPaymentPage(page) {
  logStep(6, 'Testing Payment Page');

  try {
    // Check if we're already on payment page, if not navigate
    const currentUrl = page.url();
    if (!currentUrl.includes('/payment')) {
      await page.goto(`${baseUrl}/payment?plan=starter`, { waitUntil: 'networkidle' });
    }

    await page.waitForTimeout(2000);
    await takeScreenshot(page, 'payment-page', 'Payment page loaded');

    // Check for plan summary
    const planSummaryVisible = await page.locator('text=/Starter|Pro|Plan/i').first().isVisible().catch(() => false);
    await recordTest('Plan summary visible', planSummaryVisible);

    // Check for price (might be in different formats)
    const priceVisible = await page.locator('text=/\\$?[0-9]+\\.?[0-9]{0,2}/').first().isVisible().catch(() => false);
    await recordTest('Price displayed', priceVisible, priceVisible ? 'Found price element' : 'Price not found - may need to update selector');

    // Check for discount badge (optional, some plans may not have discounts)
    const discountVisible = await page.locator('text=/54%|55%|Save|discount/i').first().isVisible({ timeout: 2000 }).catch(() => false);
    await recordTest('Discount badge visible (optional)', discountVisible, discountVisible ? 'Discount found' : 'No discount badge (may be optional)');

    // Check for payment button - more flexible search
    const paymentButton = page.locator('button, a').filter({ hasText: /Proceed|Payment|Pay|Complete|Checkout/i }).first();
    const buttonVisible = await paymentButton.isVisible().catch(() => false);
    await recordTest('Payment/Checkout button visible', buttonVisible, buttonVisible ? 'Payment button found' : 'Payment button not found');

    // Scroll to see full page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(500);
    await takeScreenshot(page, 'payment-page-scrolled', 'Payment page scrolled view');

    return true;
  } catch (error) {
    await recordTest('Payment page loads', false, error.message);
    await takeScreenshot(page, 'payment-page-error', 'Error loading payment page');
    return false;
  }
}

async function testPaymentSuccessPage(page) {
  logStep(7, 'Testing Payment Success Page');

  try {
    await page.goto(`${baseUrl}/payment/success?pf_payment_id=test123&m_payment_id=test-uuid`, { waitUntil: 'networkidle' });

    // Wait for verifying animation
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'success-verifying', 'Success page - verifying state');

    // Wait for success state
    await page.waitForTimeout(3000);
    await takeScreenshot(page, 'success-complete', 'Success page - complete state');

    // Check for success elements
    const successVisible = await page.locator('text=/Success|Successful|Payment.*complete/i').first().isVisible().catch(() => false);
    await recordTest('Success message visible', successVisible);

    const checkmarkVisible = await page.locator('svg, [class*="check"]').first().isVisible().catch(() => false);
    await recordTest('Success checkmark visible', checkmarkVisible);

    // Check for action buttons
    const dashboardButton = await page.locator('button, a').filter({ hasText: /Dashboard|Start/i }).first().isVisible().catch(() => false);
    await recordTest('Action buttons visible', dashboardButton);

    return true;
  } catch (error) {
    await recordTest('Success page loads', false, error.message);
    await takeScreenshot(page, 'success-error', 'Error loading success page');
    return false;
  }
}

async function testPaymentCancelPage(page) {
  logStep(8, 'Testing Payment Cancel Page');

  try {
    await page.goto(`${baseUrl}/payment/cancel?plan=starter`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'cancel-page', 'Cancel page loaded');

    // Check for cancel message
    const cancelVisible = await page.locator('text=/Cancel|Cancelled|Not.*complete/i').first().isVisible().catch(() => false);
    await recordTest('Cancel message visible', cancelVisible);

    // Check for retry button
    const retryButton = await page.locator('button, a').filter({ hasText: /Try.*Again|Retry/i }).first().isVisible().catch(() => false);
    await recordTest('Retry button visible', retryButton);

    // Check for back to pricing
    const backButton = await page.locator('button, a').filter({ hasText: /Back|Pricing/i}).first().isVisible().catch(() => false);
    await recordTest('Back to pricing button visible', backButton);

    return true;
  } catch (error) {
    await recordTest('Cancel page loads', false, error.message);
    await takeScreenshot(page, 'cancel-error', 'Error loading cancel page');
    return false;
  }
}

async function generateTestReport() {
  logStep('FINAL', 'Generating Test Report');

  const report = {
    testRun: {
      timestamp: new Date().toISOString(),
      duration: 'N/A',
      environment: {
        frontend: baseUrl,
        backend: apiUrl
      }
    },
    results: {
      total: testResults.passed + testResults.failed,
      passed: testResults.passed,
      failed: testResults.failed,
      passRate: testResults.passed + testResults.failed > 0
        ? ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1) + '%'
        : '0%'
    },
    screenshots: testResults.screenshots,
    errors: testResults.errors,
    testUser: {
      email: testUser.email,
      note: 'Generated for this test run'
    }
  };

  const reportPath = path.join(screenshotsDir, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Also create HTML report
  const htmlReport = generateHTMLReport(report);
  const htmlPath = path.join(screenshotsDir, 'test-report.html');
  fs.writeFileSync(htmlPath, htmlReport);

  logSuccess(`Test report saved to: ${reportPath}`);
  logSuccess(`HTML report saved to: ${htmlPath}`);

  return report;
}

function generateHTMLReport(report) {
  const screenshotHTML = report.screenshots.map((ss, idx) => `
    <div class="screenshot-item">
      <div class="screenshot-number">${idx + 1}</div>
      <img src="${ss.filename}" alt="${ss.description}">
      <div class="screenshot-info">
        <div class="screenshot-desc">${ss.description}</div>
        <div class="screenshot-time">${new Date(ss.timestamp).toLocaleString()}</div>
      </div>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Workflow Test Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
            padding: 40px 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        h1 {
            font-size: 2.5em;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .summary {
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .stat-card {
            background: #0f0f0f;
            border: 1px solid #444;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        .stat-label { font-size: 0.9em; color: #888; margin-bottom: 8px; }
        .stat-value { font-size: 2em; font-weight: bold; }
        .stat-value.passed { color: #10b981; }
        .stat-value.failed { color: #ef4444; }
        .stat-value.total { color: #667eea; }
        .screenshots {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
            gap: 30px;
            margin-top: 30px;
        }
        .screenshot-item {
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 12px;
            overflow: hidden;
            transition: transform 0.2s;
        }
        .screenshot-item:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(102, 126, 234, 0.2); }
        .screenshot-number {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 8px 16px;
            font-weight: bold;
            font-size: 1.1em;
        }
        .screenshot-item img {
            width: 100%;
            height: auto;
            display: block;
            border-top: 1px solid #333;
            border-bottom: 1px solid #333;
        }
        .screenshot-info {
            padding: 16px;
        }
        .screenshot-desc {
            font-weight: 600;
            margin-bottom: 8px;
            color: #e0e0e0;
        }
        .screenshot-time {
            font-size: 0.85em;
            color: #666;
        }
        .errors {
            background: #1a0f0f;
            border: 1px solid #441111;
            border-radius: 12px;
            padding: 20px;
            margin-top: 30px;
        }
        .error-item {
            background: #0f0a0a;
            border-left: 4px solid #ef4444;
            padding: 16px;
            margin-bottom: 12px;
            border-radius: 4px;
        }
        .error-title { font-weight: bold; color: #ef4444; margin-bottom: 8px; }
        .error-details { color: #999; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>💳 Payment Workflow Test Report</h1>

        <div class="summary">
            <h2>Test Summary</h2>
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-label">Total Tests</div>
                    <div class="stat-value total">${report.results.total}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Passed</div>
                    <div class="stat-value passed">${report.results.passed}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Failed</div>
                    <div class="stat-value failed">${report.results.failed}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Pass Rate</div>
                    <div class="stat-value">${report.results.passRate}</div>
                </div>
            </div>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #333;">
                <p><strong>Test Run:</strong> ${new Date(report.testRun.timestamp).toLocaleString()}</p>
                <p><strong>Test User:</strong> ${report.testUser.email}</p>
                <p><strong>Frontend:</strong> ${report.testRun.environment.frontend}</p>
                <p><strong>Backend:</strong> ${report.testRun.environment.backend}</p>
            </div>
        </div>

        ${report.errors.length > 0 ? `
        <div class="errors">
            <h2>❌ Failed Tests</h2>
            ${report.errors.map(err => `
                <div class="error-item">
                    <div class="error-title">${err.test}</div>
                    <div class="error-details">${err.details}</div>
                </div>
            `).join('')}
        </div>
        ` : ''}

        <h2 style="margin-top: 40px; margin-bottom: 20px;">📸 Test Screenshots (${report.screenshots.length})</h2>
        <div class="screenshots">
            ${screenshotHTML}
        </div>
    </div>
</body>
</html>
  `;
}

async function runAllTests() {
  log('', 'reset');
  log('╔═══════════════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                   PAYMENT WORKFLOW E2E VISUAL TESTING                         ║', 'cyan');
  log('║                        Powered by Playwright                                  ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════════════════════════╝', 'cyan');
  log('', 'reset');

  logInfo(`Frontend: ${baseUrl}`);
  logInfo(`Backend: ${apiUrl}`);
  logInfo(`Screenshots: ${screenshotsDir}`);
  logInfo(`Test User: ${testUser.email}`);
  log('', 'reset');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  try {
    // Run tests sequentially
    await testPricingPage(page);
    await testClickChooseStarter(page);
    await testGetStartedPage(page);

    const signupResult = await testSignupFlow(page);
    if (signupResult === 'user_exists' || !signupResult) {
      await testLoginFlow(page);
    }

    await testPaymentPage(page);
    await testPaymentSuccessPage(page);
    await testPaymentCancelPage(page);

    // Generate report
    const report = await generateTestReport();

    // Print final summary
    log('', 'reset');
    log('╔═══════════════════════════════════════════════════════════════════════════════╗', 'cyan');
    log('║                           TEST RESULTS SUMMARY                                ║', 'cyan');
    log('╚═══════════════════════════════════════════════════════════════════════════════╝', 'cyan');
    log('', 'reset');

    log(`Total Tests:     ${report.results.total}`, 'blue');
    log(`Passed:          ${report.results.passed}`, 'green');
    log(`Failed:          ${report.results.failed}`, report.results.failed > 0 ? 'red' : 'green');
    log(`Pass Rate:       ${report.results.passRate}`, report.results.passRate >= '80%' ? 'green' : 'red');
    log(`Screenshots:     ${report.screenshots.length}`, 'yellow');

    log('', 'reset');
    log(`📂 Test artifacts saved to: ${screenshotsDir}`, 'blue');
    log(`📄 HTML Report: test-screenshots-payment/test-report.html`, 'blue');
    log('', 'reset');

    if (report.results.failed === 0) {
      log('✅ ALL TESTS PASSED!', 'green');
    } else {
      log(`⚠️  ${report.results.failed} TEST(S) FAILED`, 'red');
    }

    log('', 'reset');

  } catch (error) {
    logError(`Fatal error: ${error.message}`);
    await takeScreenshot(page, 'fatal-error', 'Fatal error occurred');
  } finally {
    await browser.close();
  }

  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('\n' + colors.red + '❌ Fatal error during testing:' + colors.reset);
  console.error(error);
  process.exit(1);
});
