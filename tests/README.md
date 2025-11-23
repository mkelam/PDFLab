# PDFLab Test Suite

Comprehensive test suite for PDFLab platform covering E2E, integration, and unit tests.

## 📁 Test Structure

```
tests/
├── e2e/                    # End-to-end tests (Playwright)
│   ├── auth.spec.ts
│   ├── conversion.spec.ts
│   ├── batch-processing.spec.ts
│   └── partner-e2e-flow.spec.ts
├── integration/            # API integration tests
│   ├── api/               # Backend API endpoints
│   ├── services/          # External service integrations
│   └── payments/          # Payment flow tests
├── helpers/               # Test utilities and helpers
├── fixtures/              # Test data and sample files
└── README.md             # This file
```

## 🚀 Running Tests

### Prerequisites

1. **Start Backend Services**:
   ```bash
   # Start MySQL and Redis
   docker start pdflab-mysql pdflab-redis

   # Start backend (in backend/ directory)
   cd backend && npm run dev

   # Start frontend (in root directory)
   npm run dev
   ```

2. **Environment Variables**:
   Ensure `.env` files are configured for test environment.

### E2E Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run specific test file
npm run test:e2e -- auth

# Run specific browser
npm run test:e2e -- --project=chromium

# Generate test report
npm run test:e2e:report
```

### Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific test suite
npm run test:integration -- payments
npm run test:integration -- api
npm run test:integration -- services

# Watch mode
npm run test:integration:watch
```

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run with coverage
npm run test:unit:coverage

# Watch mode
npm run test:unit:watch
```

### Run All Tests

```bash
npm test
```

## 📊 Test Data

### Test Users

| Email | Password | Plan | Purpose |
|-------|----------|------|---------|
| `testuser@pdflab.com` | `TestPass123!` | Free | Basic E2E tests |
| `mmkela@gmail.com` | `TestPass123!` | Pro | Pro feature tests |
| `admin@pdflab.test` | `Admin123!` | Enterprise | Admin tests |

### Test Files

Located in `tests/fixtures/`:
- `test-sample.pdf` - Small PDF (13KB) for quick tests
- `test-medium.pdf` - Medium PDF (5MB) for quota tests
- `test-large.pdf` - Large PDF (100MB) for limit tests
- `test-malformed.pdf` - Invalid PDF for error handling

## 🛠️ Test Helpers

Import test helpers from `tests/helpers/`:

```typescript
import { loginAsUser, createTestUser } from './helpers/auth.helper'
import { uploadTestFile, waitForJobComplete } from './helpers/conversion.helper'
import { seedTestData, cleanupTestData } from './helpers/database.helper'
import { TEST_PDF, TEST_USERS } from './helpers/fixtures'
```

### Example Usage

```typescript
import { test } from '@playwright/test'
import { loginAsUser } from '../helpers/auth.helper'

test('should convert PDF to PPTX', async ({ page }) => {
  // Login as Pro user
  await loginAsUser(page, 'pro')

  // Upload file
  await uploadTestFile(page, TEST_PDF.small)

  // Select format
  await page.click('text=PowerPoint')

  // Convert
  await page.click('button:has-text("Convert")')

  // Wait for completion
  await waitForJobComplete(page)
})
```

## 📋 Test Coverage Goals

| Category | Current | Target |
|----------|---------|--------|
| **Overall** | 42% | 80% |
| **Backend API** | 0% | 90% |
| **Payment Flow** | 0% | 100% |
| **Error Scenarios** | 5% | 80% |
| **Security** | 0% | 70% |

## ✅ Test Checklist

When writing new tests:

- [ ] Use semantic selectors (`getByRole`, `getByLabel`)
- [ ] Clean up test data in `afterEach` hooks
- [ ] Use unique test data (timestamps, UUIDs)
- [ ] Add comments explaining complex test logic
- [ ] Follow naming: `{feature}.{type}.ts`
- [ ] Use test helpers from `tests/helpers/`
- [ ] Add screenshots for debugging (`page.screenshot()`)
- [ ] Handle timeouts appropriately (Safari needs 15-20s)

## 🐛 Debugging Tests

### View Test Report

```bash
npm run test:e2e:report
```

Opens the HTML report with screenshots and videos.

### Debug Single Test

```bash
# Run with --debug flag
npx playwright test --debug auth.spec.ts

# Or use VS Code debugger
# Set breakpoint and press F5
```

### Check Test Results

```bash
# View Playwright traces
npx playwright show-trace test-results/trace.zip

# View screenshots
ls test-results/**/*.png
```

## 🔧 Configuration

### Playwright Config

Location: `tests/e2e/playwright.config.ts`

- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Base URL**: `http://localhost:3000`
- **Retries**: 2 in CI, 0 locally
- **Timeout**: 30s per test
- **Workers**: 1 in CI, unlimited locally

### Test Environment Variables

```bash
# .env.test
NODE_ENV=test
API_URL=http://localhost:3006
DB_NAME=pdflab_test
REDIS_DB=1
```

## 📚 Documentation

Full test documentation in `docs/testing/`:

- [BMAD Test Review](docs/testing/reports/BMAD_TEST_REVIEW_2025-11-15.md) - Comprehensive test analysis
- [Manual Test Guide](docs/testing/guides/MANUAL_TEST_GUIDE.md) - Manual testing procedures
- [Payment Testing Guide](docs/testing/payment/PAYFAST_TESTING_GUIDE.md) - PayFast integration testing

## 🚨 Flaky Tests

If a test is flaky:

1. Add retry logic: `test.describe.configure({ retries: 2 })`
2. Increase timeouts for specific assertions
3. Use more reliable selectors
4. Report in GitHub Issues with `[FLAKY TEST]` tag

## 🎯 Priority Tests (P0)

Must pass before deployment:

- [ ] Authentication flow (login, signup, logout)
- [ ] PDF conversion (all formats)
- [ ] Payment subscription flow
- [ ] Admin partner approval
- [ ] Beta user expiration

## 📞 Support

- **Report test failures**: Create GitHub Issue
- **Ask questions**: Discord #testing channel
- **Review test PRs**: Tag @qa-team

---

**Last Updated**: 2025-11-15
**Test Coverage**: 42% → Target 80%
**Total Tests**: 66 → Target 150+
