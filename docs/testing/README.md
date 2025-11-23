# PDFLab Testing Documentation

Complete testing documentation, guides, and reports for the PDFLab platform.

---

## 📁 Directory Structure

```
docs/testing/
├── reports/                    # Test analysis and review reports
├── guides/                     # Testing guides and procedures
├── payment/                    # Payment integration test documentation
├── archived/                   # Historical test reports
└── README.md                   # This file
```

---

## 🎯 Quick Links

### Current Status
- **[P0 Tests Implementation Summary](P0_TESTS_IMPLEMENTATION_SUMMARY.md)** - Latest test implementation (2025-11-15)
- **[BMAD Test Review](reports/BMAD_TEST_REVIEW_2025-11-15.md)** - Comprehensive test analysis by BMAD agents

### Testing Guides
- **[Manual Test Guide](guides/MANUAL_TEST_GUIDE.md)** - Manual testing procedures
- **[Quick Test Without Backend](guides/QUICK_TEST_WITHOUT_BACKEND.md)** - Frontend-only testing

### Payment Testing
- **[PayFast Testing Guide](payment/PAYFAST_TESTING_GUIDE.md)** - PayFast integration testing
- **[PayFast ITN Testing](payment/PAYFAST_ITN_TESTING_GUIDE.md)** - ITN webhook testing
- **[Multi-currency Test Results](payment/MULTICURRENCY_TEST_RESULTS.md)** - USD/ZAR testing
- **[E2E Payment Test Results](payment/E2E_PAYMENT_TEST_RESULTS.md)** - End-to-end payment flow

---

## 📊 Test Coverage Summary

| Category | Tests | Coverage | Priority |
|----------|-------|----------|----------|
| **E2E Tests** | 66 | 42% | ✅ Good |
| **Payment Flow** | 15 | 100% | ✅ Complete |
| **CloudConvert** | 12 | 100% | ✅ Complete |
| **Security** | 10 | 70% | ✅ Good |
| **Backend API** | 0 | 40% | ⚠️ Needs work |
| **Overall** | **103** | **65%** | ⚠️ Improving |

**Target**: 150+ tests, 80% coverage

---

## 🧪 Test Suites

### E2E Tests (Playwright)
Located in: `tests/e2e/`

- **Authentication** (5 tests) - Login, signup, session persistence
- **Conversion** (5 tests) - PDF conversion UI and workflows
- **Batch Processing** (5 tests) - Multi-file processing (Pro feature)
- **Partner Flow** (7 tests) - Partner application and approval

### Integration Tests (Playwright)
Located in: `tests/integration/`

- **Payment Integration** (15 tests) - PayFast payment processing
- **CloudConvert Integration** (12 tests) - PDF conversion service
- **Security & Authorization** (10 tests) - OWASP security testing

---

## 🚀 Running Tests

### Quick Start

```bash
# Run all tests
npm test

# Run E2E tests
npm run test:e2e

# Run integration tests
npm run test:integration

# Run P0 critical tests
npm run test:p0
```

### Specific Test Suites

```bash
# Payment tests
npm run test:integration:payments

# CloudConvert tests
npm run test:integration:services

# Security tests
npm run test:integration:api
```

### View Results

```bash
# Open test report
npm run test:e2e:report

# Run with UI
npm run test:e2e:ui
```

---

## 📋 Recent Updates

### 2025-11-15: P0 Tests Implementation ✅
- Added 37 integration tests (payment, CloudConvert, security)
- Created test helpers and utilities
- Organized test documentation
- Coverage: 42% → 65%

### 2025-11-15: BMAD Test Review
- Comprehensive multi-agent analysis (QA, Architect, Dev)
- Identified critical gaps (0% backend coverage)
- Created priority matrix for test implementation
- Established coverage goals (target 80%)

### 2025-11-12: Feedback System Tests
- Added feedback widget E2E tests
- Tested guest and authenticated flows

### 2025-11-10: Beta User E2E Tests
- Partner application workflow (7 steps)
- Admin approval flow
- Partner portal access

---

## 🎯 Test Priorities

### P0 - Critical (✅ Complete)
- [x] Payment flow (PayFast integration)
- [x] CloudConvert integration (all formats)
- [x] Security & authorization (OWASP Top 10)

### P1 - High Priority (🔄 In Progress)
- [ ] Error handling scenarios
- [ ] Email service integration
- [ ] Backend API coverage (25 endpoints)
- [ ] Refresh token mechanism

### P2 - Medium Priority
- [ ] Beta user system
- [ ] Feedback system
- [ ] Performance testing (load, stress)

### P3 - Low Priority
- [ ] Unit tests (components, functions)
- [ ] Visual regression tests
- [ ] Accessibility tests

---

## 📚 Documentation Index

### Reports & Analysis

| Document | Date | Description |
|----------|------|-------------|
| [BMAD Test Review](reports/BMAD_TEST_REVIEW_2025-11-15.md) | 2025-11-15 | Multi-agent test analysis |
| [P0 Implementation Summary](P0_TESTS_IMPLEMENTATION_SUMMARY.md) | 2025-11-15 | P0 tests implementation |

### Guides & Procedures

| Document | Purpose |
|----------|---------|
| [Manual Test Guide](guides/MANUAL_TEST_GUIDE.md) | Manual testing procedures |
| [Quick Test Without Backend](guides/QUICK_TEST_WITHOUT_BACKEND.md) | Frontend-only testing |
| [PayFast Testing Guide](payment/PAYFAST_TESTING_GUIDE.md) | Payment integration testing |
| [PayFast ITN Testing](payment/PAYFAST_ITN_TESTING_GUIDE.md) | Webhook testing |

### Test Results

| Document | Date | Coverage |
|----------|------|----------|
| [Multi-currency Test Results](payment/MULTICURRENCY_TEST_RESULTS.md) | 2025-11-06 | USD/ZAR testing |
| [E2E Payment Results](payment/E2E_PAYMENT_TEST_RESULTS.md) | 2025-11-04 | Payment flow |

### Archived Reports

Historical test reports from development phases are in the `archived/` directory:

- Comprehensive Docker Test Report
- Conversion Test Report
- E2E Testing Success Report
- Integration Test Report
- Product Owner Test Report
- Visual Test Report
- And 9 more historical reports

---

## 🛠️ Test Infrastructure

### Test Helpers
Located in: `tests/helpers/`

- **auth.helper.ts** - Authentication utilities (login, logout, tokens)
- **fixtures.ts** - Test data and constants

### Test Data

**Test Users:**
- `testuser@pdflab.com` - Free plan user
- `mmkela@gmail.com` - Pro plan user
- `admin@pdflab.test` - Admin user

**Test Files:**
- `test-sample.pdf` (13KB) - Quick tests
- `test-medium.pdf` (5MB) - Quota tests
- `test-large.pdf` (100MB) - Limit tests

### Configuration

**Playwright Config:** `tests/e2e/playwright.config.ts`
- **Browsers:** Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Timeout:** 30s per test
- **Retries:** 2 in CI, 0 locally
- **Base URL:** http://localhost:3000

---

## 🐛 Debugging Tests

### View Test Results

```bash
# Open HTML report
npm run test:e2e:report

# View traces
npx playwright show-trace test-results/trace.zip

# View screenshots
ls test-results/**/*.png
```

### Debug Single Test

```bash
# Run with debugger
npx playwright test --debug auth.spec.ts

# Run specific test
npx playwright test -g "should login with valid credentials"
```

### Common Issues

**Tests timing out?**
- Increase timeout in test: `{ timeout: 60000 }`
- Check if backend/frontend are running
- Verify database containers are up

**Flaky tests?**
- Add retries: `test.describe.configure({ retries: 2 })`
- Use more reliable selectors (role-based)
- Add explicit waits for animations

**Authentication failing?**
- Verify test user exists in database
- Check JWT_SECRET in backend .env
- Clear browser storage before test

---

## 📈 Metrics & Goals

### Current Metrics (2025-11-15)

- **Total Tests**: 103
- **E2E Tests**: 66
- **Integration Tests**: 37
- **Coverage**: 65%
- **Test Execution**: ~4 minutes (integration), ~15 minutes (E2E)

### Target Metrics (Phase 2)

- **Total Tests**: 150+
- **Coverage**: 80%
- **Test Execution**: <10 minutes (E2E), <5 minutes (integration)
- **Flaky Rate**: <2%
- **Code Coverage**: >80% (backend), >70% (frontend)

---

## 🤝 Contributing

### Writing New Tests

1. **Check existing tests** to avoid duplication
2. **Use test helpers** from `tests/helpers/`
3. **Follow naming convention**: `{feature}.{type}.ts`
4. **Add to appropriate directory**: `e2e/` or `integration/`
5. **Update this README** if adding new test suite

### Test Checklist

- [ ] Uses semantic selectors (`getByRole`, `getByLabel`)
- [ ] Cleans up test data in `afterEach`
- [ ] Uses unique test data (timestamps, UUIDs)
- [ ] Includes comments for complex logic
- [ ] Handles timeouts appropriately
- [ ] Adds screenshots for debugging
- [ ] Updates documentation

---

## 📞 Support

- **Report test failures**: Create GitHub Issue with `[TEST FAILURE]` tag
- **Ask questions**: Discord #testing channel
- **Review test PRs**: Tag @qa-team

---

**Last Updated**: 2025-11-15
**Maintained by**: QA Team
**Next Review**: 2025-12-01
