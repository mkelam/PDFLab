const fs = require('fs');
const results = JSON.parse(fs.readFileSync('./test-results/results.json', 'utf-8'));

const failures = [];

results.suites.forEach(suite => {
  suite.suites?.forEach(subsuite => {
    subsuite.specs?.forEach(spec => {
      spec.tests.forEach(test => {
        test.results?.forEach(result => {
          if (result.status === 'failed') {
            failures.push({
              file: suite.file,
              suite: subsuite.title,
              test: spec.title,
              project: test.projectName,
              line: result.error?.location?.line,
              errorFirstLine: result.error?.message?.split('\n')[0] || 'Unknown error',
              fullError: result.error?.message
            });
          }
        });
      });
    });
  });
});

const failuresByFile = failures.reduce((acc, f) => {
  acc[f.file] = (acc[f.file] || 0) + 1;
  return acc;
}, {});

const uniqueTests = new Set(failures.map(f => `${f.file}::${f.test}`)).size;

console.log(JSON.stringify({
  totalFailures: failures.length,
  uniqueTests: uniqueTests,
  failuresByFile: failuresByFile,
  summary: failures.map((f, i) => ({
    id: i + 1,
    file: f.file,
    test: f.test,
    project: f.project,
    line: f.line,
    error: f.errorFirstLine
  })),
  detailed: failures
}, null, 2));
