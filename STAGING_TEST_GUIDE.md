# PDFLab Staging Test Guide

Complete guide for running all 52 staging-compatible tests against the PDFLab staging environment.

## 📊 Quick Summary

- **Total Tests**: 52 (out of 66 total)
- **Staging-Compatible**: 79%
- **Local-Only**: 14 tests (21%)
- **Staging Server**: http://141.136.44.168
- **Estimated Duration**: 25-70 minutes (depending on options)

---

## 🚀 Quick Commands

```bash
# Run all 52 tests (recommended)
npm run test:staging:all

# Run critical tests only (~7 min)
npm run test:staging:all:quick

# Run tests with HTML report
npm run test:staging:all:report

# Cleanup test data after run
npm run test:staging:cleanup
```

---

## 📋 Test Suite Breakdown

### ✅ Tests That Run on Staging (52 tests)

#### **E2E Tests** (3 tests) - ~7 min
- ✅ Authentication flow (login, signup, session)
- ✅ Conversion interface (file upload, format selection)
- ✅ Batch processing UI (Pro features)

**Command**: `npm run test:staging:e2e`

---

#### **API Integration Tests** (7 tests) - ~16 min
- ✅ Security tests (SQL injection, XSS, JWT, authorization, rate limiting)
- ✅ Backend endpoints (auth, upload, compress, merge, history)
- ✅ Error handling (invalid inputs, missing data, edge cases)
- ✅ Refresh token flow (token expiration, rotation)
- ✅ Batch processing API (upload, status, ZIP download)
- ✅ Beta user system (applications, approvals, expiration)
- ✅ Feedback system (submission, admin management)

**Command**: `npm run test:staging:api`

---

#### **Service Integration Tests** (2 tests) - ~3 min
- ✅ CloudConvert integration (costs API credits - run sparingly)
- ✅ Email service (sends real emails via SMTP)

**Command**: `npm run test:staging:integration`

---

#### **Payment Integration** (1 test) - ~2 min
- ✅ PayFast payment flow (use sandbox mode only)

**Command**: `npm run test:integration:payments`

---

#### **Accessibility Tests** (1 test) - ~2 min
- ✅ WCAG 2.1 AA compliance checks

**Command**: `npm run test:accessibility`

---

#### **Performance Tests** (4 tests) - ~46 min
- ✅ Load test (100 VUs, 5 min)
- ✅ Stress test (500 VUs, 8 min)
- ✅ Spike test (sudden traffic spikes, 3 min)
- ✅ Soak test (30 min endurance test)

**Requirements**: k6 must be installed
**Command**: `npm run test:staging:performance`

---

### ❌ Tests That Don't Run on Staging (14 tests)

#### **Frontend Unit Tests** (4 tests) - Local only
- ❌ Navigation component tests
- ❌ Conversion interface component tests
- ❌ AuthContext tests
- ❌ useRequireAuth hook tests

**Reason**: Unit tests run against local compiled components, not deployed app.

---

#### **Backend Unit Tests** (5 tests) - Local only
- ❌ Auth middleware tests
- ❌ Upload middleware tests
- ❌ Admin middleware tests
- ❌ Auth utility tests
- ❌ Error utility tests

**Reason**: Unit tests run against source code modules, not deployed services.

---

#### **Visual Regression Tests** (1 test) - Requires Percy
- ❌ Visual snapshot tests

**Reason**: Requires Percy API key and account setup.

---

#### **Sentry Test Routes** (8 endpoints) - Manual only
- ⚠️ Manual error triggers for Sentry alert verification

**Reason**: These are manual test endpoints, not automated tests.

---

## 🎯 Test Prioritization

### **P0: Critical Tests** (Must pass before deployment)
```bash
npm run test:staging:all:quick
```
**Duration**: ~7 minutes
**Includes**:
- Security tests (SQL injection, XSS, authorization)
- Payment integration
- CloudConvert service
- Core backend endpoints

**Pass Criteria**: 100% (all tests must pass)

---

### **P1: High Priority** (Run before major releases)
```bash
node scripts/run-staging-tests.js --skip-performance
```
**Duration**: ~25 minutes
**Includes**:
- All P0 tests
- E2E user flows
- API integration tests
- Accessibility checks

**Pass Criteria**: ≥95%

---

### **P2: Full Suite** (Weekly regression testing)
```bash
npm run test:staging:all
```
**Duration**: ~70 minutes (with performance tests)
**Includes**:
- All P0 and P1 tests
- Performance tests (load, stress, spike, soak)

**Pass Criteria**: ≥90%

---

## 📊 Test Results & Reports

### JSON Report
After each run, results are saved to:
```
test-results/staging-test-results.json
```

**Example**:
```json
{
  "startTime": "2025-11-19T10:00:00.000Z",
  "endTime": "2025-11-19T10:25:00.000Z",
  "duration": 25.3,
  "totalTests": 52,
  "passedTests": 50,
  "failedTests": 2,
  "skippedTests": 0,
  "passRate": 96.2,
  "environment": "staging",
  "stagingUrl": "http://141.136.44.168"
}
```

### HTML Report
View detailed Playwright report:
```bash
npm run test:staging:report
```

This opens an interactive HTML report with:
- Screenshots of failures
- Video recordings
- Step-by-step test execution
- Network logs

---

## ⚠️ Important Notes

### CloudConvert Tests
- **Cost**: Consumes API credits
- **Recommendation**: Run sparingly or mock in CI/CD
- **Alternative**: Skip with `--skip-performance` flag

### PayFast Tests
- **Mode**: Use sandbox mode only (`PAYFAST_MODE=sandbox`)
- **Never**: Run with real payment credentials on staging

### Rate Limiting Tests
- **Behavior**: Intentionally trigger rate limits
- **Side Effect**: May temporarily block IP
- **Recommendation**: Run during off-hours

### Test Data Cleanup
Always clean up after test runs:
```bash
npm run test:staging:cleanup
```

---

## 🔧 Advanced Usage

### Run Specific Test Suite
```bash
# Only E2E tests
node scripts/run-staging-tests.js --e2e

# Only API integration tests
node scripts/run-staging-tests.js --api

# Verbose output for debugging
node scripts/run-staging-tests.js --verbose
```

### PowerShell (Windows)
```powershell
# Full suite
.\scripts\run-staging-tests.ps1

# Quick mode
.\scripts\run-staging-tests.ps1 -Quick

# With HTML report
.\scripts\run-staging-tests.ps1 -Report
```

---

## 🚨 Troubleshooting

### Script Permission Denied (PowerShell)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### k6 Not Installed
**Option 1**: Install k6
```bash
# Windows
winget install k6

# macOS
brew install k6

# Linux
sudo apt install k6
```

**Option 2**: Skip performance tests
```bash
node scripts/run-staging-tests.js --skip-performance
```

### Tests Timing Out
Edit `tests/e2e/playwright.config.staging.ts`:
```javascript
timeout: 60000, // Increase to 60 seconds
navigationTimeout: 30000, // Increase to 30 seconds
```

### Staging Server Unreachable
Check server status:
```bash
curl http://141.136.44.168:3007/health
```

If down, contact DevOps team.

---

## 📅 Recommended Test Schedule

### **Daily** (Automated CI/CD)
```bash
npm run test:staging:all:quick
```
- Runs after every merge to staging branch
- Must pass before deployment
- ~7 minutes

### **Nightly** (Scheduled CI/CD)
```bash
node scripts/run-staging-tests.js --skip-performance
```
- Runs at 2 AM (off-hours)
- Full suite except performance tests
- ~25 minutes

### **Weekly** (Manual or scheduled)
```bash
npm run test:staging:all
```
- Runs every Sunday at 1 AM
- Includes performance tests
- ~70 minutes

---

## 📈 Test Coverage Goals

| Category | Current | Target | Status |
|----------|---------|--------|--------|
| **Overall** | 42% | 80% | 🟡 In Progress |
| **Backend API** | 65% | 90% | 🟢 Good |
| **Payment Flow** | 47% | 100% | 🟡 Needs Work |
| **Security** | 100% | 100% | 🟢 Complete |
| **Error Scenarios** | 80% | 85% | 🟢 Good |

---

## 🔗 Related Documentation

- [Test Suite README](tests/README.md) - Complete test documentation
- [BMAD Test Review](docs/testing/reports/BMAD_TEST_REVIEW_2025-11-15.md) - Comprehensive test analysis
- [Scripts README](scripts/TESTING_README.md) - Detailed script documentation
- [Playwright Config](tests/e2e/playwright.config.staging.ts) - Staging configuration

---

## 📞 Support

**For test failures:**
1. Check `test-results/staging-test-results.json`
2. View HTML report: `npm run test:staging:report`
3. Create GitHub Issue with `[Staging Test Failure]` tag

**For script issues:**
1. Run with `--verbose` flag
2. Check script output for error messages
3. Contact DevOps team if server issue

---

**Last Updated**: 2025-11-19
**Guide Version**: 1.0.0
**Staging Environment**: http://141.136.44.168
**Total Staging Tests**: 52/66 (79%)
