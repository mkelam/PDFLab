# Quick Start - Running Tests on Staging

**Status**: ✅ Smoke tests passed - Staging is ready!
**Date**: 2025-11-15

---

## ✅ Staging Status

All services verified and running:
- ✅ Backend API: http://141.136.44.168:3007 (Healthy)
- ✅ Main App: http://141.136.44.168:3002 (200 OK)
- ✅ Partner Portal: http://141.136.44.168:3003 (200 OK)

---

## 🚀 Quick Start (3 Steps)

### Step 1: Verify Dependencies Installed
```bash
# Make sure you're in the PDFLab directory
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Check if node_modules exists
npm list --depth=0
```

### Step 2: Run Your First Test
```bash
# Run integration tests against staging (fastest, no browser needed)
npm run test:staging:integration
```

**Expected Output**:
```
Running 63 tests using 2 workers

  ✓ API Health Endpoint Test (234ms)
  ✓ User Registration Test (567ms)
  ✓ User Login Test (345ms)
  ...

63 passed (45s)
```

### Step 3: Run E2E Tests (if integration tests pass)
```bash
# Run end-to-end tests (opens browser, simulates real users)
npm run test:staging:e2e
```

---

## 📋 All Available Commands

### Quick Commands
```bash
# Run ALL staging tests (integration + E2E)
npm run test:staging

# Run ONLY integration tests (API, no browser)
npm run test:staging:integration

# Run ONLY E2E tests (browser automation)
npm run test:staging:e2e

# Run ONLY API tests
npm run test:staging:api

# View test report (after running tests)
npm run test:staging:report
```

### Performance Tests (Optional)
```bash
# Load test - 50 concurrent users
npm run test:staging:performance

# Stress test - up to 300 users (requires k6 installed)
k6 run tests/performance/stress-test.js --env API_URL=http://141.136.44.168:3007
```

---

## 🎯 What Gets Tested?

### Integration Tests (~63 tests) - **Start Here!**
- ✅ Backend API endpoints
- ✅ Authentication (login/register/logout)
- ✅ File upload validation
- ✅ Database operations
- ✅ Error handling
- ✅ Rate limiting
- ✅ Security measures

**Why start here?**: These are fast (no browser), test core functionality, and catch most issues.

### E2E Tests (~15 tests) - **Run After Integration**
- ✅ User registration flow
- ✅ Login/logout flow
- ✅ PDF conversions (all formats)
- ✅ Payment flow
- ✅ Partner portal
- ✅ Admin panel
- ✅ Batch processing

**Why second?**: These simulate real users, take longer, but test complete workflows.

---

## 🐛 If Tests Fail

### Common Issues & Quick Fixes

**Issue 1**: `cross-env: command not found`
```bash
# Solution: Install cross-env
npm install --save-dev cross-env
```

**Issue 2**: `Timeout waiting for http://141.136.44.168:3002`
```bash
# Solution: Verify staging is running
curl http://141.136.44.168:3002
ssh root@141.136.44.168 "docker ps | grep staging"
```

**Issue 3**: `Test user not found` or authentication fails
- **Cause**: Test users don't exist in staging database
- **Solution**: See [STAGING_TESTING_GUIDE.md](STAGING_TESTING_GUIDE.md#1-create-test-users-in-staging-database) for creating test users

**Issue 4**: Tests pass locally but fail on staging
- **Likely**: Database differences or missing data
- **Solution**: Check staging database and logs:
  ```bash
  ssh root@141.136.44.168 "docker logs pdflab-backend-staging"
  ```

---

## 📊 Expected Test Times

| Test Suite | Duration | Tests |
|------------|----------|-------|
| Integration | ~45 seconds | 63 tests |
| E2E | ~2-3 minutes | 15 tests |
| Full Suite | ~4 minutes | 78 tests |

---

## 💡 Pro Tips

1. **Start small**: Run integration tests first, they're faster and catch most issues

2. **Watch in real-time**: Run E2E tests in headed mode to see what's happening:
   ```bash
   npx playwright test -c tests/e2e/playwright.config.staging.ts --headed
   ```

3. **Debug single test**: Run just one test file:
   ```bash
   npx playwright test tests/e2e/auth-flow.spec.ts -c tests/e2e/playwright.config.staging.ts
   ```

4. **Monitor logs**: While tests run, watch staging logs:
   ```bash
   ssh root@141.136.44.168 "docker logs -f pdflab-backend-staging"
   ```

5. **Check screenshots**: If a test fails, Playwright saves screenshots in `test-results/`

---

## 📚 More Information

- **Full Testing Guide**: [STAGING_TESTING_GUIDE.md](STAGING_TESTING_GUIDE.md)
- **Staging Setup**: [STAGING_COMPLETE_WITH_PARTNERS.md](STAGING_COMPLETE_WITH_PARTNERS.md)
- **Test Coverage**: [docs/testing/100_PERCENT_COVERAGE_COMPLETE_2025-11-15.md](docs/testing/100_PERCENT_COVERAGE_COMPLETE_2025-11-15.md)

---

## ✅ Success Checklist

Before deploying to production, make sure:
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] No critical errors in staging logs
- [ ] Manual smoke test of key features works
- [ ] Performance is acceptable

---

**Ready to start?** Run this now:
```bash
npm run test:staging:integration
```

That's it! If that passes, you have confidence staging is working. Then run E2E tests for full coverage.

---

**Created**: 2025-11-15
**Status**: ✅ Ready to use
