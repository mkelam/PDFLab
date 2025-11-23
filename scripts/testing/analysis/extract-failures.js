const fs = require('fs');
const path = require('path');

// Read the staging results
const resultsPath = 'test-results/staging-results.json';
const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

console.log('\n' + '='.repeat(80));
console.log('STAGING TEST FAILURE ANALYSIS');
console.log('='.repeat(80));

console.log('\n📊 OVERALL STATISTICS');
console.log('─'.repeat(80));
console.log(`Total Tests:    ${data.stats.expected + data.stats.unexpected}`);
console.log(`✅ Passed:      ${data.stats.expected} (${((data.stats.expected / (data.stats.expected + data.stats.unexpected)) * 100).toFixed(1)}%)`);
console.log(`❌ Failed:      ${data.stats.unexpected} (${((data.stats.unexpected / (data.stats.expected + data.stats.unexpected)) * 100).toFixed(1)}%)`);
console.log(`⏭️  Skipped:     ${data.stats.skipped}`);
console.log(`🔄 Flaky:       ${data.stats.flaky}`);

// Try to find test result files
const testResultsDir = 'test-results';
const files = fs.readdirSync(testResultsDir).filter(f =>
  f.endsWith('.xml') || f.includes('results') && f.endsWith('.json')
);

console.log('\n📁 TEST RESULT FILES FOUND');
console.log('─'.repeat(80));
files.forEach(f => {
  const stats = fs.statSync(path.join(testResultsDir, f));
  console.log(`  ${f} (${(stats.size / 1024).toFixed(1)} KB)`);
});

// Check the .last-run.json for failed test IDs
const lastRunPath = 'test-results/.last-run.json';
if (fs.existsSync(lastRunPath)) {
  const lastRun = JSON.parse(fs.readFileSync(lastRunPath, 'utf8'));

  console.log('\n❌ FAILED TEST IDs (from .last-run.json)');
  console.log('─'.repeat(80));
  console.log(`Total: ${lastRun.failedTests.length} tests failed\n`);

  // Try to map test IDs to names by reading test files
  const testFile = 'tests/integration/api/security.test.ts';
  if (fs.existsSync(testFile)) {
    const content = fs.readFileSync(testFile, 'utf8');
    const testMatches = content.match(/test\(['"]([^'"]+)['"]/g);

    if (testMatches) {
      console.log('📋 SECURITY TESTS (20 total)');
      console.log('─'.repeat(80));
      testMatches.forEach((match, idx) => {
        const testName = match.match(/test\(['"]([^'"]+)['"]/)[1];
        console.log(`${idx + 1}. ${testName}`);
      });
    }
  }
}

console.log('\n' + '='.repeat(80));
console.log('💡 RECOMMENDATIONS');
console.log('='.repeat(80));
console.log('1. View detailed report: npx playwright show-report playwright-report-staging');
console.log('2. The report will show exact failures, expected vs actual values');
console.log('3. Common failure patterns to check:');
console.log('   - Missing test data (users, files)');
console.log('   - Database state issues');
console.log('   - Timing/async issues');
console.log('   - Environment configuration differences');
console.log('='.repeat(80) + '\n');
