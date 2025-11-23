const fs = require('fs');

const data = JSON.parse(fs.readFileSync('test-results/staging-results.json'));

console.log('\n=== Test Results Summary ===');
console.log('Total Tests:', data.stats.expected + data.stats.unexpected);
console.log('Passed:', data.stats.expected);
console.log('Failed:', data.stats.unexpected);
console.log('Pass Rate:', ((data.stats.expected / (data.stats.expected + data.stats.unexpected)) * 100).toFixed(1) + '%');

console.log('\n=== ANALYZING FAILED TESTS ===\n');

let failureCount = 0;
const failureCategories = {
  'Authentication/Token': [],
  'Rate Limiting': [],
  'Profile/User': [],
  'Feedback': [],
  'File Upload': [],
  'Payment': [],
  'Other': []
};

for (const suite of data.suites) {
  for (const spec of suite.specs) {
    for (const test of spec.tests) {
      for (const result of test.results) {
        if (result.status === 'unexpected' || result.status === 'failed' || result.status === 'timedOut') {
          failureCount++;

          const title = spec.title;
          const error = result.errors && result.errors.length > 0
            ? result.errors[0].message
            : 'No error message';

          // Categorize the failure
          let category = 'Other';
          if (title.includes('token') || title.includes('auth') || title.includes('login') || title.includes('register')) {
            category = 'Authentication/Token';
          } else if (title.includes('rate') || title.includes('429') || error.includes('429')) {
            category = 'Rate Limiting';
          } else if (title.includes('profile') || title.includes('user')) {
            category = 'Profile/User';
          } else if (title.includes('feedback')) {
            category = 'Feedback';
          } else if (title.includes('upload') || title.includes('file')) {
            category = 'File Upload';
          } else if (title.includes('payment') || title.includes('payfast')) {
            category = 'Payment';
          }

          failureCategories[category].push({
            title,
            error: error.substring(0, 300).replace(/\n/g, ' '),
            status: result.status
          });
        }
      }
    }
  }
}

console.log(`Total Failures Found: ${failureCount}\n`);

// Print by category
for (const [category, failures] of Object.entries(failureCategories)) {
  if (failures.length > 0) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`${category.toUpperCase()} (${failures.length} failures)`);
    console.log('='.repeat(70));

    failures.forEach((f, i) => {
      console.log(`\n${i + 1}. ${f.title}`);
      console.log(`   Status: ${f.status}`);
      console.log(`   Error: ${f.error}`);
    });
  }
}
