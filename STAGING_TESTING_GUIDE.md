# Staging Environment Testing Guide

**Date**: 2025-11-15
**Environment**: Staging on VPS (141.136.44.168)
**Purpose**: Complete guide to running all tests against staging

---

## 🎯 Quick Start

### Prerequisites
- ✅ Staging environment running (see [STAGING_COMPLETE_WITH_PARTNERS.md](STAGING_COMPLETE_WITH_PARTNERS.md))
- ✅ Node.js and npm installed locally
- ✅ Dependencies installed (`npm install`)

### Run All Staging Tests
```bash
npm run test:staging
```

---

## 📋 Available Test Commands

### E2E Tests (End-to-End)
```bash
# Run all E2E tests against staging
npm run test:staging:e2e

# Run specific E2E test file
npx playwright test tests/e2e/auth-flow.spec.ts -c tests/e2e/playwright.config.staging.ts

# Run E2E tests with UI mode (interactive)
npx playwright test -c tests/e2e/playwright.config.staging.ts --ui

# Run E2E tests in headed mode (see browser)
npx playwright test -c tests/e2e/playwright.config.staging.ts --headed
```

### Integration Tests
```bash
# Run all integration tests
npm run test:staging:integration

# Run API integration tests only
npm run test:staging:api

# Run specific integration test
npx playwright test tests/integration/api/backend-endpoints.test.ts --config=tests/e2e/playwright.config.staging.ts
```

### Performance Tests (k6)
```bash
# Load test (50 concurrent users)
npm run test:staging:performance

# Stress test (up to 300 users)
k6 run tests/performance/stress-test.js --env API_URL=http://141.136.44.168:3007

# Spike test (sudden traffic spike)
k6 run tests/performance/spike-test.js --env API_URL=http://141.136.44.168:3007

# Soak test (30-minute stability)
k6 run tests/performance/soak-test.js --env API_URL=http://141.136.44.168:3007
```

### View Test Reports
```bash
# Open HTML report
npm run test:staging:report

# Or manually
npx playwright show-report playwright-report-staging
```

---

## 🌐 Staging Environment URLs

| Service | URL | Port |
|---------|-----|------|
| Main App | http://141.136.44.168:3002 | 3002 |
| Partner Portal | http://141.136.44.168:3003 | 3003 |
| Backend API | http://141.136.44.168:3007 | 3007 |
| MySQL | Internal (via SSH tunnel) | 3307 |
| Redis | Internal (via SSH tunnel) | 6380 |

---

## 🔧 Configuration Files

### Test Configs Created
1. **tests/e2e/playwright.config.staging.ts** - Playwright config for staging
2. **tests/config/staging.config.ts** - Environment-specific settings

### Key Settings
```typescript
// Staging URLs
mainAppUrl: 'http://141.136.44.168:3002'
partnerPortalUrl: 'http://141.136.44.168:3003'
apiUrl: 'http://141.136.44.168:3007'

// Increased timeouts for remote server
pageLoad: 30000ms
apiRequest: 15000ms
fileUpload: 60000ms
```

---

## 📝 Test Setup Requirements

### 1. Create Test Users in Staging Database

Before running tests, you need to create test users in the staging database:

```bash
# SSH into VPS
ssh root@141.136.44.168

# Connect to staging MySQL
docker exec -it pdflab-mysql-staging mysql -u root -p pdflab_staging
```

**Create test users**:
```sql
-- Regular test user
INSERT INTO users (id, email, password_hash, name, plan, conversions_used, conversions_limit, created_at)
VALUES (
  UUID(),
  'test.staging@pdflab.pro',
  '$2a$10$hashed_password_here', -- Use bcrypt to hash 'StagingTest123!'
  'Test User Staging',
  'free',
  0,
  3,
  NOW()
);

-- Admin test user
INSERT INTO users (id, email, password_hash, name, plan, role, created_at)
VALUES (
  UUID(),
  'admin.staging@pdflab.pro',
  '$2a$10$hashed_password_here', -- Use bcrypt to hash 'AdminStaging123!'
  'Admin User Staging',
  'enterprise',
  'admin',
  NOW()
);

-- Partner test user
INSERT INTO users (id, email, password_hash, name, plan, role, partner_code, created_at)
VALUES (
  UUID(),
  'partner.staging@pdflab.pro',
  '$2a$10$hashed_password_here', -- Use bcrypt to hash 'PartnerStaging123!'
  'Partner User Staging',
  'pro',
  'partner',
  'STAGING-PARTNER-001',
  NOW()
);
```

**Generate password hashes** (on your local machine):
```bash
# Install bcryptjs if not installed
npm install bcryptjs

# Generate hashes
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('StagingTest123!', 10));"
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('AdminStaging123!', 10));"
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('PartnerStaging123!', 10));"
```

### 2. Verify Backend is Accessible

```bash
# Test health endpoint
curl http://141.136.44.168:3007/health

# Should return:
# {"status":"OK","checks":{"database":"OK","redis":"OK"}}
```

### 3. Verify Frontend is Accessible

```bash
# Test main app
curl -I http://141.136.44.168:3002

# Test partner portal
curl -I http://141.136.44.168:3003

# Both should return HTTP/1.1 200 OK
```

---

## 🧪 Running Tests - Step by Step

### Step 1: Run a Smoke Test First

Before running the full test suite, run a quick smoke test to ensure staging is working:

```bash
# Test backend health
curl http://141.136.44.168:3007/health

# Test main app homepage
curl -I http://141.136.44.168:3002

# Test partner portal homepage
curl -I http://141.136.44.168:3003
```

**Expected Results**:
- Backend: `{"status":"OK",...}`
- Main app: `HTTP/1.1 200 OK`
- Partner portal: `HTTP/1.1 200 OK`

### Step 2: Run Integration Tests

Integration tests don't require browser automation and run faster:

```bash
npm run test:staging:integration
```

**These test**:
- API endpoints
- Authentication flows
- Database operations
- Error handling
- Security measures

### Step 3: Run E2E Tests

End-to-end tests simulate real user interactions:

```bash
npm run test:staging:e2e
```

**These test**:
- User registration
- Login/logout flows
- PDF conversions
- Payment flows (PayFast sandbox)
- Partner application process
- Admin panel operations

### Step 4: Run Performance Tests (Optional)

Performance tests measure how staging handles load:

```bash
# Start with load test (50 users)
npm run test:staging:performance

# If that passes, try stress test (300 users)
k6 run tests/performance/stress-test.js --env API_URL=http://141.136.44.168:3007
```

---

## 📊 Understanding Test Results

### Successful Test Run

```
✓ tests/e2e/auth-flow.spec.ts:5:1 › User can register new account (5.2s)
✓ tests/e2e/auth-flow.spec.ts:15:1 › User can login (3.1s)
✓ tests/e2e/conversion-flow.spec.ts:8:1 › User can convert PDF (12.5s)

3 passed (20.8s)
```

### Failed Test Example

```
✗ tests/e2e/auth-flow.spec.ts:5:1 › User can register new account (5.2s)

  Error: expect(received).toBeVisible()
  Expected: visible
  Received: hidden

  at tests/e2e/auth-flow.spec.ts:12:5
```

**Common Failure Reasons**:
1. **Timeout**: Increase timeouts in config (network latency)
2. **Selector not found**: Element might not exist on staging
3. **API error**: Check backend logs (`docker logs pdflab-backend-staging`)
4. **Database issue**: Verify test users exist

---

## 🐛 Troubleshooting

### Tests Timing Out

**Problem**: Tests fail with timeout errors

**Solutions**:
1. Increase timeout in [playwright.config.staging.ts](tests/e2e/playwright.config.staging.ts:13):
   ```typescript
   timeout: 90000, // 90 seconds instead of 60
   ```

2. Check network connection to VPS:
   ```bash
   ping 141.136.44.168
   ```

3. Verify staging containers are running:
   ```bash
   ssh root@141.136.44.168 "docker ps | grep staging"
   ```

### Authentication Tests Failing

**Problem**: Login/register tests fail

**Solutions**:
1. Verify test users exist in database:
   ```bash
   ssh root@141.136.44.168
   docker exec -it pdflab-mysql-staging mysql -u root -p pdflab_staging
   SELECT email, plan FROM users WHERE email LIKE '%staging%';
   ```

2. Check backend authentication:
   ```bash
   curl -X POST http://141.136.44.168:3007/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test.staging@pdflab.pro","password":"StagingTest123!"}'
   ```

3. Review backend logs:
   ```bash
   ssh root@141.136.44.168 "docker logs --tail 50 pdflab-backend-staging"
   ```

### File Upload Tests Failing

**Problem**: PDF conversion/upload tests fail

**Solutions**:
1. Check file size limits match user plan
2. Verify CloudConvert API key is valid:
   ```bash
   ssh root@141.136.44.168
   docker exec pdflab-backend-staging env | grep CLOUDCONVERT
   ```

3. Check backend storage permissions:
   ```bash
   ssh root@141.136.44.168 "docker exec pdflab-backend-staging ls -la storage/uploads"
   ```

### Database Connection Errors

**Problem**: Tests fail with database errors

**Solutions**:
1. Verify MySQL is running:
   ```bash
   ssh root@141.136.44.168 "docker ps | grep mysql-staging"
   ```

2. Test MySQL connection:
   ```bash
   ssh root@141.136.44.168 "docker exec pdflab-mysql-staging mysqladmin -u root -p ping"
   ```

3. Check database logs:
   ```bash
   ssh root@141.136.44.168 "docker logs pdflab-mysql-staging"
   ```

---

## 📈 Test Coverage Breakdown

### E2E Tests (~15 tests)
- ✅ User registration
- ✅ User login/logout
- ✅ PDF to PowerPoint conversion
- ✅ PDF to Word conversion
- ✅ PDF to Excel conversion
- ✅ PDF to Images conversion
- ✅ PDF compression
- ✅ PDF merging
- ✅ Batch processing
- ✅ Payment flow (PayFast sandbox)
- ✅ Partner application
- ✅ Partner dashboard access
- ✅ Admin panel access
- ✅ Beta user system
- ✅ Feedback submission

### Integration Tests (~63 tests)
- ✅ Backend API endpoints (all routes)
- ✅ Authentication middleware
- ✅ File upload validation
- ✅ Database operations
- ✅ Redis caching
- ✅ Error handling
- ✅ Rate limiting
- ✅ Security measures
- ✅ Payment processing (PayFast ITN)
- ✅ Email service
- ✅ Refresh token mechanism

### Performance Tests (4 suites)
- ✅ Load test (50 users, 5 minutes)
- ✅ Stress test (up to 300 users)
- ✅ Spike test (sudden traffic)
- ✅ Soak test (30 minutes stability)

**Total Tests**: ~82 tests against staging

---

## 🎯 Testing Checklist

Before deploying to production, verify all these pass on staging:

### Pre-Deployment Checklist
- [ ] All staging containers running and healthy
- [ ] Test users created in staging database
- [ ] Smoke tests pass (curl commands)
- [ ] Integration tests pass (npm run test:staging:integration)
- [ ] E2E tests pass (npm run test:staging:e2e)
- [ ] Main app accessible and functional
- [ ] Partner portal accessible and functional
- [ ] Backend API responding correctly
- [ ] PayFast sandbox payments working
- [ ] File uploads/conversions working
- [ ] Admin panel accessible
- [ ] No critical errors in logs
- [ ] Performance tests acceptable (optional)

---

## 📚 Additional Resources

### Documentation
- **Staging Setup**: [STAGING_COMPLETE_WITH_PARTNERS.md](STAGING_COMPLETE_WITH_PARTNERS.md)
- **Verification**: [STAGING_VERIFICATION_COMPLETE.md](STAGING_VERIFICATION_COMPLETE.md)
- **Partner Portal**: [PARTNER_PORTAL_STAGING_VERIFIED.md](PARTNER_PORTAL_STAGING_VERIFIED.md)
- **Test Coverage**: [docs/testing/100_PERCENT_COVERAGE_COMPLETE_2025-11-15.md](docs/testing/100_PERCENT_COVERAGE_COMPLETE_2025-11-15.md)

### Playwright Resources
- [Playwright Docs](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)

### k6 Performance Testing
- [k6 Docs](https://k6.io/docs/)
- [Metrics Reference](https://k6.io/docs/using-k6/metrics/)
- [Thresholds](https://k6.io/docs/using-k6/thresholds/)

---

## 🚀 Next Steps After Testing

### If All Tests Pass ✅
1. Review test results and metrics
2. Document any issues found
3. Deploy to production with confidence
4. Monitor production after deployment

### If Tests Fail ❌
1. Review failure logs and screenshots
2. Fix issues in codebase
3. Deploy fixes to staging
4. Re-run test suite
5. Repeat until all tests pass

---

## 💡 Tips for Efficient Testing

1. **Run tests incrementally**:
   - Start with smoke tests
   - Then integration tests
   - Finally E2E tests

2. **Use headed mode for debugging**:
   ```bash
   npx playwright test -c tests/e2e/playwright.config.staging.ts --headed --debug
   ```

3. **Run specific tests during development**:
   ```bash
   npx playwright test tests/e2e/auth-flow.spec.ts -c tests/e2e/playwright.config.staging.ts
   ```

4. **Review screenshots on failures**:
   - Located in `test-results/`
   - Automatically captured on failure

5. **Monitor staging logs during tests**:
   ```bash
   ssh root@141.136.44.168 "docker logs -f pdflab-backend-staging"
   ```

---

**Created**: 2025-11-15
**Status**: Ready for use
**Staging Environment**: ✅ Verified and operational
