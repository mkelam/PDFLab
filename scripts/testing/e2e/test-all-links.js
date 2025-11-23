const playwright = require('playwright');

// Test configuration
const BASE_URL = 'http://localhost:3002';
const ADMIN_EMAIL = 'admin@pdflab.test';
const ADMIN_PASSWORD = 'Admin123!';

const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

async function logResult(status, message, details = '') {
  const timestamp = new Date().toISOString();
  const result = { timestamp, message, details };

  if (status === 'PASS') {
    testResults.passed.push(result);
    console.log(`✅ PASS: ${message}`);
  } else if (status === 'FAIL') {
    testResults.failed.push(result);
    console.error(`❌ FAIL: ${message}`);
    if (details) console.error(`   Details: ${details}`);
  } else if (status === 'WARN') {
    testResults.warnings.push(result);
    console.warn(`⚠️  WARN: ${message}`);
    if (details) console.warn(`   Details: ${details}`);
  }
}

async function testLink(page, linkText, expectedUrl, testName) {
  try {
    await page.waitForTimeout(500);
    const link = await page.$(`text="${linkText}"`);

    if (!link) {
      await logResult('FAIL', testName, `Link "${linkText}" not found on page`);
      return false;
    }

    await link.click();
    await page.waitForTimeout(1000);

    const currentUrl = page.url();
    if (currentUrl.includes(expectedUrl)) {
      await logResult('PASS', testName, `Navigated to ${currentUrl}`);
      return true;
    } else {
      await logResult('FAIL', testName, `Expected URL to contain "${expectedUrl}", got "${currentUrl}"`);
      return false;
    }
  } catch (error) {
    await logResult('FAIL', testName, error.message);
    return false;
  }
}

async function testButtonAction(page, buttonSelector, testName) {
  try {
    await page.waitForTimeout(500);
    const button = await page.$(buttonSelector);

    if (!button) {
      await logResult('FAIL', testName, `Button "${buttonSelector}" not found`);
      return false;
    }

    await button.click();
    await page.waitForTimeout(500);
    await logResult('PASS', testName);
    return true;
  } catch (error) {
    await logResult('FAIL', testName, error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting PDFLab Link Testing Suite\n');
  console.log('=' .repeat(60));

  const browser = await playwright.chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // ===== PUBLIC NAVIGATION TESTS =====
    console.log('\n📍 TESTING PUBLIC NAVIGATION\n');

    // Test 1: Home Page
    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);
    if (page.url() === `${BASE_URL}/`) {
      await logResult('PASS', 'Home page loads', page.url());
    } else {
      await logResult('FAIL', 'Home page loads', `Expected ${BASE_URL}/, got ${page.url()}`);
    }

    // Test 2: Login Link
    await testLink(page, 'Login', '/login', 'Login link from home');

    // Test 3: Back to Home
    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);

    // Test 4: Signup Link
    await testLink(page, 'Sign Up', '/signup', 'Signup link from home');

    // Test 5: Back to Home and Pricing
    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);
    await testLink(page, 'Pricing', '/pricing', 'Pricing link from home');

    // ===== AUTHENTICATION TESTS =====
    console.log('\n🔐 TESTING AUTHENTICATION\n');

    // Test 6: Login Flow
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1000);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    const urlAfterLogin = page.url();
    if (urlAfterLogin.includes('/dashboard') || urlAfterLogin.includes('/admin')) {
      await logResult('PASS', 'Login successful', urlAfterLogin);
    } else {
      await logResult('FAIL', 'Login successful', `Expected /dashboard or /admin, got ${urlAfterLogin}`);
    }

    // ===== ADMIN PANEL TESTS =====
    console.log('\n👑 TESTING ADMIN PANEL NAVIGATION\n');

    // Test 7: Navigate to Admin Dashboard
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForTimeout(2000);
    if (page.url().includes('/admin')) {
      await logResult('PASS', 'Admin dashboard loads');
    } else {
      await logResult('FAIL', 'Admin dashboard loads', page.url());
    }

    // Test 8: Admin Users Page
    await page.goto(`${BASE_URL}/admin/users`);
    await page.waitForTimeout(2000);
    if (page.url().includes('/admin/users')) {
      await logResult('PASS', 'Admin users page loads');
    } else {
      await logResult('FAIL', 'Admin users page loads', page.url());
    }

    // Test 9: Click View button on first user
    const viewButton = await page.$('button:has-text("View")');
    if (viewButton) {
      await viewButton.click();
      await page.waitForTimeout(1500);

      // Check if modal opened
      const modal = await page.$('text="User Details"');
      if (modal) {
        await logResult('PASS', 'User detail modal opens');

        // Test 10: Check modal tabs
        const tabs = ['Profile', 'Subscriptions', 'Conversions', 'Activity'];
        for (const tab of tabs) {
          const tabElement = await page.$(`button:has-text("${tab}")`);
          if (tabElement) {
            await logResult('PASS', `Modal tab "${tab}" exists`);
          } else {
            await logResult('FAIL', `Modal tab "${tab}" exists`);
          }
        }

        // Test 11: Check verification status display
        const verificationLabel = await page.$('text="Email Verification"');
        if (verificationLabel) {
          await logResult('PASS', 'Email verification status displayed in modal');
        } else {
          await logResult('FAIL', 'Email verification status displayed in modal');
        }

        // Close modal
        const closeButton = await page.$('button:has-text("×")');
        if (closeButton) {
          await closeButton.click();
          await page.waitForTimeout(500);
        }
      } else {
        await logResult('FAIL', 'User detail modal opens');
      }
    } else {
      await logResult('WARN', 'View button test', 'No users found in list');
    }

    // Test 12: Check verification column in users table
    const verifiedColumn = await page.$('th:has-text("Verified")');
    if (verifiedColumn) {
      await logResult('PASS', 'Verified column exists in users table');
    } else {
      await logResult('FAIL', 'Verified column exists in users table');
    }

    // ===== ADMIN NAVIGATION SIDEBAR TESTS =====
    console.log('\n📋 TESTING ADMIN SIDEBAR NAVIGATION\n');

    const adminNavLinks = [
      { text: 'Dashboard', url: '/admin' },
      { text: 'Users', url: '/admin/users' },
    ];

    for (const link of adminNavLinks) {
      await page.goto(`${BASE_URL}/admin`);
      await page.waitForTimeout(1000);
      await testLink(page, link.text, link.url, `Admin sidebar: ${link.text}`);
    }

    // ===== USER DASHBOARD TESTS =====
    console.log('\n👤 TESTING USER DASHBOARD\n');

    // Test: Navigate to Dashboard (if not admin-only user)
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(2000);
    const dashboardUrl = page.url();
    if (dashboardUrl.includes('/dashboard') || dashboardUrl.includes('/admin')) {
      await logResult('PASS', 'Dashboard/Admin area accessible');
    } else {
      await logResult('WARN', 'Dashboard access', 'Redirected to: ' + dashboardUrl);
    }

    // ===== CONVERSION INTERFACE TESTS =====
    console.log('\n📄 TESTING CONVERSION INTERFACE\n');

    // Test: Home page conversion form
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    const uploadButton = await page.$('input[type="file"]');
    if (uploadButton) {
      await logResult('PASS', 'File upload input exists on home page');
    } else {
      await logResult('FAIL', 'File upload input exists on home page');
    }

    const formatSelect = await page.$('select');
    if (formatSelect) {
      await logResult('PASS', 'Format selector exists on home page');
    } else {
      await logResult('FAIL', 'Format selector exists on home page');
    }

    // ===== PRICING PAGE TESTS =====
    console.log('\n💰 TESTING PRICING PAGE\n');

    await page.goto(`${BASE_URL}/pricing`);
    await page.waitForTimeout(2000);

    if (page.url().includes('/pricing')) {
      await logResult('PASS', 'Pricing page loads');

      // Check for plan cards
      const planNames = ['Free', 'Starter', 'Pro', 'Enterprise'];
      for (const plan of planNames) {
        const planCard = await page.$(`text="${plan}"`);
        if (planCard) {
          await logResult('PASS', `${plan} plan card exists`);
        } else {
          await logResult('FAIL', `${plan} plan card exists`);
        }
      }
    } else {
      await logResult('FAIL', 'Pricing page loads', page.url());
    }

    // ===== LOGOUT TEST =====
    console.log('\n🚪 TESTING LOGOUT\n');

    await page.goto(`${BASE_URL}/admin`);
    await page.waitForTimeout(2000);

    const logoutButton = await page.$('button:has-text("Logout")');
    if (logoutButton) {
      await logoutButton.click();
      await page.waitForTimeout(2000);

      const urlAfterLogout = page.url();
      if (urlAfterLogout.includes('/login') || urlAfterLogout === `${BASE_URL}/`) {
        await logResult('PASS', 'Logout redirects correctly', urlAfterLogout);
      } else {
        await logResult('FAIL', 'Logout redirects correctly', urlAfterLogout);
      }
    } else {
      await logResult('WARN', 'Logout button', 'Logout button not found');
    }

  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    await logResult('FAIL', 'Test suite execution', error.message);
  } finally {
    await browser.close();
  }

  // ===== FINAL REPORT =====
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY REPORT\n');
  console.log(`✅ Passed: ${testResults.passed.length}`);
  console.log(`❌ Failed: ${testResults.failed.length}`);
  console.log(`⚠️  Warnings: ${testResults.warnings.length}`);
  console.log(`📝 Total Tests: ${testResults.passed.length + testResults.failed.length + testResults.warnings.length}`);
  console.log('='.repeat(60));

  if (testResults.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:\n');
    testResults.failed.forEach((result, index) => {
      console.log(`${index + 1}. ${result.message}`);
      if (result.details) console.log(`   ${result.details}`);
    });
  }

  if (testResults.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:\n');
    testResults.warnings.forEach((result, index) => {
      console.log(`${index + 1}. ${result.message}`);
      if (result.details) console.log(`   ${result.details}`);
    });
  }

  console.log('\n✨ Test suite completed!\n');

  // Return exit code
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
