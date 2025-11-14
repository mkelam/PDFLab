const fs = require('fs');

const data = JSON.parse(fs.readFileSync('test-results/results.json', 'utf8'));

console.log('='.repeat(80));
console.log('PLAYWRIGHT TEST FAILURES ANALYSIS');
console.log('='.repeat(80));
console.log(`\nTotal Tests: ${data.stats.expected + data.stats.unexpected + data.stats.skipped}`);
console.log(`Passed: ${data.stats.expected}`);
console.log(`Failed: ${data.stats.unexpected}`);
console.log(`Skipped: ${data.stats.skipped}`);
console.log(`Pass Rate: ${((data.stats.expected / (data.stats.expected + data.stats.unexpected)) * 100).toFixed(1)}%\n`);

const failures = [];

function extractFailures(suites, parentFile = '') {
  for (const suite of suites) {
    const file = suite.file || parentFile;

    if (suite.specs) {
      for (const spec of suite.specs) {
        if (!spec.ok && spec.tests) {
          for (const test of spec.tests) {
            if (test.status === 'unexpected') {
              const result = test.results[0];
              failures.push({
                file: file,
                suite: suite.title,
                test: spec.title,
                project: test.projectName,
                line: spec.line,
                status: result.status,
                duration: result.duration,
                error: result.error?.message || 'Unknown error',
                errorLocation: result.errorLocation
              });
            }
          }
        }
      }
    }

    if (suite.suites) {
      extractFailures(suite.suites, file);
    }
  }
}

extractFailures(data.suites);

// Group by file
const byFile = {};
failures.forEach(f => {
  if (!byFile[f.file]) byFile[f.file] = [];
  byFile[f.file].push(f);
});

// Group by project (browser)
const byProject = {};
failures.forEach(f => {
  if (!byProject[f.project]) byProject[f.project] = [];
  byProject[f.project].push(f);
});

console.log('='.repeat(80));
console.log('FAILURES BY BROWSER');
console.log('='.repeat(80));
Object.keys(byProject).sort().forEach(project => {
  console.log(`\n${project}: ${byProject[project].length} failures`);
});

console.log('\n' + '='.repeat(80));
console.log('FAILURES BY FILE');
console.log('='.repeat(80));

Object.keys(byFile).sort().forEach(file => {
  const fileFailures = byFile[file];
  console.log(`\n📁 ${file} (${fileFailures.length} failures)`);
  console.log('-'.repeat(80));

  // Group by test name to avoid duplication across browsers
  const uniqueTests = {};
  fileFailures.forEach(f => {
    const key = `${f.test}:${f.line}`;
    if (!uniqueTests[key]) {
      uniqueTests[key] = {
        test: f.test,
        line: f.line,
        projects: [],
        error: f.error,
        status: f.status
      };
    }
    uniqueTests[key].projects.push(f.project);
  });

  Object.values(uniqueTests).forEach(t => {
    console.log(`\n  ❌ ${t.test} (line ${t.line})`);
    console.log(`     Browsers: ${t.projects.join(', ')}`);
    console.log(`     Status: ${t.status}`);

    // Extract key error info
    const errorLines = t.error.split('\n');
    const mainError = errorLines[0];
    console.log(`     Error: ${mainError}`);

    // Try to extract locator info
    const locatorMatch = t.error.match(/Locator: (.*)/);
    if (locatorMatch) {
      console.log(`     Locator: ${locatorMatch[1]}`);
    }

    // Try to extract expected/received
    const expectedMatch = t.error.match(/Expected: (.*)/);
    if (expectedMatch) {
      console.log(`     Expected: ${expectedMatch[1]}`);
    }
  });
});

console.log('\n' + '='.repeat(80));
console.log('ERROR PATTERNS');
console.log('='.repeat(80));

const errorPatterns = {};
failures.forEach(f => {
  const mainError = f.error.split('\n')[0];
  if (!errorPatterns[mainError]) errorPatterns[mainError] = 0;
  errorPatterns[mainError]++;
});

Object.entries(errorPatterns)
  .sort((a, b) => b[1] - a[1])
  .forEach(([error, count]) => {
    console.log(`\n  ${count}x: ${error.substring(0, 100)}${error.length > 100 ? '...' : ''}`);
  });

console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`\nUnique test failures: ${Object.keys(byFile).reduce((sum, file) => {
  const uniqueTests = {};
  byFile[file].forEach(f => {
    uniqueTests[`${f.test}:${f.line}`] = true;
  });
  return sum + Object.keys(uniqueTests).length;
}, 0)}`);
console.log(`Files affected: ${Object.keys(byFile).length}`);
console.log(`Browsers affected: ${Object.keys(byProject).length}`);

console.log('\n' + '='.repeat(80));
