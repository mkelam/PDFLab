/**
 * PDFLab Staging Test Runner
 *
 * Runs all 52 staging-compatible tests against staging environment
 * Staging Server: http://141.136.44.168
 * - Main App: :3002
 * - Partner Portal: :3003
 * - Backend API: :3007
 *
 * Usage:
 *   node scripts/run-staging-tests.js                    # Run all tests
 *   node scripts/run-staging-tests.js --quick            # P0 only (critical)
 *   node scripts/run-staging-tests.js --e2e              # E2E only
 *   node scripts/run-staging-tests.js --api              # API integration only
 *   node scripts/run-staging-tests.js --skip-performance # Skip k6 tests
 *   node scripts/run-staging-tests.js --report           # Generate HTML report
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  quick: args.includes('--quick'),
  e2eOnly: args.includes('--e2e'),
  apiOnly: args.includes('--api'),
  skipPerformance: args.includes('--skip-performance'),
  generateReport: args.includes('--report'),
  verbose: args.includes('--verbose') || args.includes('-v'),
};

// Test suite configuration
const TEST_SUITES = {
  p0_critical: {
    name: 'P0: Critical Security & Payments',
    priority: 0,
    enabled: true,
    tests: [
      { name: 'Security Tests', command: 'npx playwright test tests/integration/api/security.test.ts --config=tests/e2e/playwright.config.staging.ts', estimatedTime: 3 },
      { name: 'Payment Integration', command: 'npx playwright test tests/integration/payments --config=tests/e2e/playwright.config.staging.ts', estimatedTime: 2 },
      { name: 'CloudConvert Service', command: 'npx playwright test tests/integration/services/cloudconvert.test.ts --config=tests/e2e/playwright.config.staging.ts', estimatedTime: 2 },
    ],
  },
  p1_high: {
    name: 'P1: High Priority API Tests',
    priority: 1,
    enabled: !options.quick,
    tests: [
      { name: 'Backend Endpoints', command: 'npx playwright test tests/integration/api/backend-endpoints.test.ts --config=tests/e2e/playwright.config.staging.ts', estimatedTime: 4 },
      { name: 'Error Handling', command: 'npx playwright test tests/integration/api/error-handling.test.ts --config=tests/e2e/playwright.config.staging.ts', estimatedTime: 2 },
      { name: 'Refresh Token Flow', command: 'npx playwright test tests/integration/api/refresh-token.test.ts --config=tests/e2e/playwright.config.staging.ts', estimatedTime: 2 },
      { name: 'Email Service', command: 'npx playwright test tests/integration/services/email.test.ts --config=tests/e2e/playwright.config.staging.ts', estimatedTime: 1 },
    ],
  },
  p2_medium: {
    name: 'P2: Medium Priority Features',
    priority: 2,
    enabled: !options.quick,
    tests: [
      { name: 'Beta User System', command: 'npx playwright test tests/integration/api/beta-user-system.test.ts --config=tests/e2e/playwright.config.staging.ts', estimatedTime: 2 },
      { name: 'Batch Processing API', command: 'npx playwright test tests/integration/api/batch-processing-api.test.ts --config=tests/e2e/playwright.config.staging.ts', estimatedTime: 3 },
      { name: 'Feedback System', command: 'npx playwright test tests/integration/api/feedback-system.test.ts --config=tests/e2e/playwright.config.staging.ts', estimatedTime: 2 },
    ],
  },
  e2e: {
    name: 'E2E: User Flows',
    priority: 3,
    enabled: !options.apiOnly,
    tests: [
      { name: 'Authentication Flow', command: 'npx playwright test e2e/auth.spec.ts --config=tests/e2e/playwright.config.staging.ts', estimatedTime: 2 },
      { name: 'Conversion Interface', command: 'npx playwright test e2e/conversion.spec.ts --config=tests/e2e/playwright.config.staging.ts', estimatedTime: 3 },
      { name: 'Batch Processing UI', command: 'npx playwright test e2e/batch-processing.spec.ts --config=tests/e2e/playwright.config.staging.ts', estimatedTime: 2 },
    ],
  },
  accessibility: {
    name: 'Accessibility: WCAG Compliance',
    priority: 4,
    enabled: !options.quick && !options.apiOnly,
    tests: [
      { name: 'WCAG 2.1 AA Compliance', command: 'npx playwright test tests/accessibility --config=tests/e2e/playwright.config.staging.ts', estimatedTime: 2 },
    ],
  },
  performance: {
    name: 'Performance: Load & Stress Tests',
    priority: 5,
    enabled: !options.quick && !options.skipPerformance && !options.e2eOnly && !options.apiOnly,
    requiresK6: true,
    tests: [
      { name: 'Load Test (100 VUs)', command: 'k6 run tests/performance/load-test.js --env API_URL=http://141.136.44.168:3007', estimatedTime: 5 },
      { name: 'Stress Test (500 VUs)', command: 'k6 run tests/performance/stress-test.js --env API_URL=http://141.136.44.168:3007', estimatedTime: 8 },
      { name: 'Spike Test', command: 'k6 run tests/performance/spike-test.js --env API_URL=http://141.136.44.168:3007', estimatedTime: 3 },
      { name: 'Soak Test (30 min)', command: 'k6 run tests/performance/soak-test.js --env API_URL=http://141.136.44.168:3007', estimatedTime: 30 },
    ],
  },
};

// Test results tracking
const results = {
  startTime: Date.now(),
  suites: [],
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  skippedTests: 0,
  totalDuration: 0,
};

/**
 * Run a shell command and return promise
 */
function runCommand(command, testName) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    console.log(`${colors.blue}▶${colors.reset} Running: ${colors.cyan}${testName}${colors.reset}`);

    if (options.verbose) {
      console.log(`  Command: ${colors.yellow}${command}${colors.reset}`);
    }

    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd.exe' : '/bin/bash';
    const shellFlag = isWindows ? '/c' : '-c';

    const proc = spawn(shell, [shellFlag, command], {
      cwd: process.cwd(),
      env: { ...process.env, TEST_ENV: 'staging' },
      stdio: options.verbose ? 'inherit' : 'pipe',
    });

    let output = '';
    let errorOutput = '';

    if (!options.verbose) {
      proc.stdout?.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });
    }

    proc.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (code === 0) {
        console.log(`${colors.green}✓${colors.reset} ${testName} ${colors.green}PASSED${colors.reset} (${duration}s)`);
        resolve({ success: true, duration, output, testName });
      } else {
        console.log(`${colors.red}✗${colors.reset} ${testName} ${colors.red}FAILED${colors.reset} (${duration}s)`);
        if (!options.verbose && errorOutput) {
          console.log(`${colors.red}Error output:${colors.reset}\n${errorOutput.slice(0, 500)}`);
        }
        resolve({ success: false, duration, output, errorOutput, testName, exitCode: code });
      }
    });

    proc.on('error', (error) => {
      console.log(`${colors.red}✗${colors.reset} ${testName} ${colors.red}ERROR${colors.reset}: ${error.message}`);
      reject(error);
    });
  });
}

/**
 * Check if k6 is installed
 */
function isK6Installed() {
  return new Promise((resolve) => {
    const proc = spawn('k6', ['version'], { stdio: 'pipe' });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

/**
 * Print header
 */
function printHeader() {
  console.log('\n' + colors.bright + '═'.repeat(80) + colors.reset);
  console.log(colors.bright + colors.cyan + '  PDFLab Staging Test Runner' + colors.reset);
  console.log(colors.bright + '═'.repeat(80) + colors.reset);
  console.log(`  ${colors.yellow}Staging Environment:${colors.reset} http://141.136.44.168`);
  console.log(`  ${colors.yellow}Test Mode:${colors.reset} ${options.quick ? 'Quick (P0 only)' : 'Full Suite'}`);
  console.log(`  ${colors.yellow}Started:${colors.reset} ${new Date().toLocaleString()}`);
  console.log(colors.bright + '─'.repeat(80) + colors.reset + '\n');
}

/**
 * Print summary
 */
function printSummary() {
  const duration = ((Date.now() - results.startTime) / 1000 / 60).toFixed(2);
  const passRate = results.totalTests > 0
    ? ((results.passedTests / results.totalTests) * 100).toFixed(1)
    : 0;

  console.log('\n' + colors.bright + '═'.repeat(80) + colors.reset);
  console.log(colors.bright + colors.cyan + '  Test Summary' + colors.reset);
  console.log(colors.bright + '═'.repeat(80) + colors.reset);
  console.log(`  ${colors.yellow}Total Tests:${colors.reset} ${results.totalTests}`);
  console.log(`  ${colors.green}✓ Passed:${colors.reset} ${results.passedTests}`);
  console.log(`  ${colors.red}✗ Failed:${colors.reset} ${results.failedTests}`);
  console.log(`  ${colors.blue}⊘ Skipped:${colors.reset} ${results.skippedTests}`);
  console.log(`  ${colors.yellow}Pass Rate:${colors.reset} ${passRate}%`);
  console.log(`  ${colors.yellow}Duration:${colors.reset} ${duration} minutes`);
  console.log(colors.bright + '─'.repeat(80) + colors.reset);

  // Print failed tests
  if (results.failedTests > 0) {
    console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
    results.suites.forEach(suite => {
      suite.tests.forEach(test => {
        if (!test.result.success) {
          console.log(`  ${colors.red}✗${colors.reset} ${suite.name} → ${test.name}`);
          if (test.result.exitCode) {
            console.log(`    Exit code: ${test.result.exitCode}`);
          }
        }
      });
    });
  }

  console.log(colors.bright + '═'.repeat(80) + colors.reset + '\n');

  // Generate JSON report
  const reportPath = path.join(process.cwd(), 'test-results', 'staging-test-results.json');
  const reportDir = path.dirname(reportPath);

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify({
    ...results,
    endTime: Date.now(),
    duration: duration,
    passRate: parseFloat(passRate),
    environment: 'staging',
    stagingUrl: 'http://141.136.44.168',
  }, null, 2));

  console.log(`${colors.green}✓${colors.reset} Test results saved to: ${colors.cyan}${reportPath}${colors.reset}\n`);
}

/**
 * Main test execution
 */
async function runTests() {
  printHeader();

  // Check k6 installation if performance tests are enabled
  if (!options.skipPerformance) {
    const k6Available = await isK6Installed();
    if (!k6Available) {
      console.log(`${colors.yellow}⚠${colors.reset} k6 not installed. Skipping performance tests.`);
      console.log(`  Install k6: ${colors.cyan}https://k6.io/docs/getting-started/installation/${colors.reset}\n`);
      TEST_SUITES.performance.enabled = false;
    }
  }

  // Run test suites in priority order
  const suites = Object.values(TEST_SUITES).sort((a, b) => a.priority - b.priority);

  for (const suite of suites) {
    if (!suite.enabled) {
      console.log(`${colors.blue}⊘${colors.reset} Skipping: ${colors.yellow}${suite.name}${colors.reset}\n`);
      results.skippedTests += suite.tests.length;
      continue;
    }

    console.log(`\n${colors.bright}${colors.magenta}▶ Test Suite:${colors.reset} ${colors.bright}${suite.name}${colors.reset}`);
    console.log(`  ${suite.tests.length} test(s) | Est. ${suite.tests.reduce((sum, t) => sum + t.estimatedTime, 0)} min\n`);

    const suiteResult = {
      name: suite.name,
      tests: [],
      startTime: Date.now(),
    };

    for (const test of suite.tests) {
      results.totalTests++;

      try {
        const result = await runCommand(test.command, test.name);
        suiteResult.tests.push({ ...test, result });

        if (result.success) {
          results.passedTests++;
        } else {
          results.failedTests++;
        }
      } catch (error) {
        console.log(`${colors.red}✗${colors.reset} ${test.name} ${colors.red}CRASHED${colors.reset}: ${error.message}`);
        results.failedTests++;
        suiteResult.tests.push({
          ...test,
          result: { success: false, error: error.message }
        });
      }
    }

    suiteResult.endTime = Date.now();
    suiteResult.duration = ((suiteResult.endTime - suiteResult.startTime) / 1000).toFixed(2);
    results.suites.push(suiteResult);
  }

  printSummary();

  // Generate HTML report if requested
  if (options.generateReport) {
    console.log(`${colors.cyan}ℹ${colors.reset} Generating HTML report...`);
    const reportProc = spawn('npx', ['playwright', 'show-report', 'playwright-report-staging'], {
      stdio: 'inherit',
    });
    reportProc.on('close', () => {
      console.log(`${colors.green}✓${colors.reset} HTML report opened in browser\n`);
    });
  }

  // Exit with appropriate code
  process.exit(results.failedTests > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
