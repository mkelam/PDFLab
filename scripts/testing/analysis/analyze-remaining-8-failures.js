const fs = require('fs');

const data = JSON.parse(fs.readFileSync('test-results/staging-results.json'));

console.log('\n' + '='.repeat(80));
console.log('ANALYZING REMAINING 8 FAILURES');
console.log('='.repeat(80));

console.log('\n📊 PROGRESS SUMMARY');
console.log('─'.repeat(80));
console.log('Starting:  32% (11/34 tests)');
console.log('After fix: 76.5% (26/34 tests)');
console.log('Fixed:     +15 tests');
console.log('Remaining: 8 failures');

console.log('\n❌ FAILED TESTS');
console.log('─'.repeat(80));

let count = 0;
for (const suite of data.suites) {
  for (const spec of suite.specs) {
    for (const test of spec.tests) {
      for (const result of test.results) {
        if (result.status === 'unexpected' || result.status === 'failed' || result.status === 'timedOut') {
          count++;
          console.log(`\n${count}. ${spec.title}`);
          console.log(`   Status: ${result.status}`);
          console.log(`   Duration: ${(result.duration / 1000).toFixed(1)}s`);

          if (result.errors && result.errors.length > 0) {
            const error = result.errors[0];
            const msg = error.message || '';

            // Extract key error information
            if (msg.includes('expected')) {
              const lines = msg.split('\n');
              const expectedLine = lines.find(l => l.includes('Expected:'));
              const receivedLine = lines.find(l => l.includes('Received:'));
              if (expectedLine) console.log(`   ${expectedLine.trim()}`);
              if (receivedLine) console.log(`   ${receivedLine.trim()}`);
            } else {
              console.log(`   Error: ${msg.substring(0, 200).replace(/\n/g, ' ')}`);
            }
          }
        }
      }
    }
  }
}

console.log('\n' + '='.repeat(80));
console.log('💡 NEXT STEPS');
console.log('='.repeat(80));
console.log('1. Review detailed failures above');
console.log('2. Common patterns: timing issues, missing data, env differences');
console.log('3. View full report: npx playwright show-report playwright-report-staging');
console.log('='.repeat(80) + '\n');
