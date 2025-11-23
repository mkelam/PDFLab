# Testing Documentation

This document outlines the testing strategy, infrastructure, and best practices for the PDFLab application.

## Table of Contents

- [Overview](#overview)
- [Jest Setup](#jest-setup)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)
- [Best Practices](#best-practices)
- [CI/CD Integration](#cicd-integration)

## Overview

PDFLab uses **Jest** with **TypeScript** (ts-jest) for backend testing. Our testing strategy includes:

- **Unit Tests**: Test individual functions and modules in isolation
- **Integration Tests**: Test interactions between components and services
- **Coverage Goals**: Progressive improvement from 30% → 80% coverage

## Jest Setup

### Backend Configuration

Location: `backend/jest.config.js`

Key settings:
- **Test Environment**: Node.js
- **Test Match**: `**/__tests__/**/*.ts` and `**/?(*.)+(spec|test).ts`
- **Coverage Directory**: `backend/coverage`
- **Setup File**: `backend/tests/setup.ts`
- **Timeout**: 10 seconds per test

### Installation

All Jest dependencies are already installed:

```bash
cd backend
npm install  # Installs jest, ts-jest, @types/jest, supertest, @types/supertest, @jest/globals
```

## Running Tests

### All Tests

```bash
cd backend
npm test
```

### Unit Tests Only

```bash
npm run test:unit
```

### Integration Tests Only

```bash
npm run test:integration
```

### Watch Mode (for development)

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

This generates:
- Console output with coverage summary
- HTML report in `backend/coverage/lcov-report/index.html`
- LCOV file for CI/CD tools

## Writing Tests

### Unit Test Example

Location: `backend/tests/unit/config/constants.test.ts`

```typescript
import { GUEST_LIMITS, USER_PLAN_LIMITS } from '../../../src/config/constants'

describe('Constants', () => {
  describe('GUEST_LIMITS', () => {
    test('should have correct conversion limit', () => {
      expect(GUEST_LIMITS.MAX_CONVERSIONS).toBe(3)
    })

    test('should have correct file size limit', () => {
      expect(GUEST_LIMITS.MAX_FILE_SIZE_MB).toBe(10)
    })
  })

  describe('USER_PLAN_LIMITS', () => {
    test('should have all plan tiers', () => {
      expect(USER_PLAN_LIMITS).toHaveProperty('free')
      expect(USER_PLAN_LIMITS).toHaveProperty('starter')
      expect(USER_PLAN_LIMITS).toHaveProperty('pro')
      expect(USER_PLAN_LIMITS).toHaveProperty('enterprise')
    })
  })
})
```

### Integration Test Example

Location: `backend/tests/integration/health.test.ts`

```typescript
import request from 'supertest'
import express from 'express'

const app = express()
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

describe('Health Endpoint', () => {
  test('GET /health should return 200', async () => {
    const response = await request(app).get('/health')

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('status', 'ok')
    expect(response.body).toHaveProperty('timestamp')
  })
})
```

### Mocking Example

```typescript
// Mock external dependencies
jest.mock('../../../src/services/cloudconvert.service')

describe('Conversion Service', () => {
  test('should handle conversion errors gracefully', async () => {
    const mockConvert = jest.fn().mockRejectedValue(new Error('API Error'))

    // Test error handling...
  })
})
```

## Test Coverage

### Current Goals

| Metric | Current Target | Future Target |
|--------|---------------|---------------|
| Branches | 30% | 80% |
| Functions | 30% | 80% |
| Lines | 30% | 80% |
| Statements | 30% | 80% |

### Coverage Exclusions

The following files are excluded from coverage:
- `src/**/*.d.ts` - TypeScript declarations
- `src/test-*.ts` - Test utility files
- `src/server.ts` - Server entry point
- `src/**/*.test.ts` - Test files themselves
- `src/**/*.spec.ts` - Spec files

### Viewing Coverage

After running `npm run test:coverage`:

1. **Terminal**: View summary in console output
2. **HTML Report**: Open `backend/coverage/lcov-report/index.html` in browser
3. **File-by-File**: Browse coverage details for each source file

### Improving Coverage

Priority areas for test coverage:
1. **Controllers** (auth, conversion, payment)
2. **Services** (CloudConvert, email, user management)
3. **Middleware** (authentication, rate limiting, validation)
4. **Utilities** (circuit breaker, sanitization, helpers)

## Best Practices

### Test Structure

Use the **AAA Pattern** (Arrange, Act, Assert):

```typescript
test('should process payment successfully', async () => {
  // Arrange
  const mockPaymentData = { amount: 99.99, currency: 'ZAR' }
  const mockUser = { id: '123', email: 'test@example.com' }

  // Act
  const result = await processPayment(mockPaymentData, mockUser)

  // Assert
  expect(result.status).toBe('success')
  expect(result.transactionId).toBeDefined()
})
```

### Test Naming

- Use descriptive test names that explain the expected behavior
- Format: `should [expected behavior] when [condition]`

```typescript
// Good
test('should return 400 when email is invalid', ...)

// Bad
test('email validation', ...)
```

### Test Isolation

- Each test should be independent
- Don't rely on test execution order
- Use `beforeEach` and `afterEach` for setup/cleanup

```typescript
describe('User Service', () => {
  let mockUser: User

  beforeEach(() => {
    mockUser = { id: '123', email: 'test@example.com' }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('should create user', () => {
    // Test implementation
  })
})
```

### Async Testing

Always handle promises properly:

```typescript
// Using async/await (preferred)
test('should fetch user data', async () => {
  const user = await getUserById('123')
  expect(user).toBeDefined()
})

// Using .resolves
test('should fetch user data', () => {
  return expect(getUserById('123')).resolves.toBeDefined()
})
```

### Mock Cleanup

Always clean up mocks:

```typescript
afterEach(() => {
  jest.clearAllMocks() // Clear call history
  jest.restoreAllMocks() // Restore original implementations
})
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd backend && npm ci
      - run: cd backend && npm test
      - run: cd backend && npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          directory: ./backend/coverage
```

### Pre-commit Hooks

Tests run automatically before commits (configured in `package.json`):

```json
{
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write",
      "jest --bail --findRelatedTests"
    ]
  }
}
```

## Test Organization

```
backend/
├── tests/
│   ├── setup.ts              # Global test setup
│   ├── unit/                 # Unit tests
│   │   ├── config/
│   │   │   └── constants.test.ts
│   │   ├── utils/
│   │   │   └── circuit-breaker.factory.test.ts
│   │   ├── services/
│   │   ├── middleware/
│   │   └── controllers/
│   └── integration/          # Integration tests
│       ├── health.test.ts
│       ├── auth.test.ts
│       └── conversion.test.ts
└── src/                      # Source code
```

## Troubleshooting

### Common Issues

**Issue**: Tests fail with module resolution errors
```bash
# Solution: Ensure TypeScript is configured correctly
npm run typecheck
```

**Issue**: Tests time out
```bash
# Solution: Increase timeout in jest.config.js or individual test
test('long running test', async () => {
  // test code
}, 30000) // 30 second timeout
```

**Issue**: Coverage thresholds not met
```bash
# Solution: Add more tests or adjust thresholds temporarily
# Edit jest.config.js → coverageThreshold → global
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ts-jest Documentation](https://kulshekhar.github.io/ts-jest/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## Next Steps

1. Add tests for all new features
2. Increase coverage incrementally (aim for 10% improvement per sprint)
3. Set up continuous coverage tracking (Codecov, Coveralls)
4. Add E2E tests using Playwright (separate from unit/integration)
5. Add performance benchmarks for critical paths

---

**Last Updated**: 2025-11-23
**Maintained By**: PDFLab Development Team
