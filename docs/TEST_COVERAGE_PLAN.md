# Test Coverage Plan - Phase 3

**Date**: November 23, 2025
**Current Coverage**: 1.58% statements
**Target Coverage**: Pragmatic approach focusing on critical paths
**Status**: 🟡 IN PROGRESS

---

## Current State Analysis

### Backend Coverage Baseline

```
File Type           | Coverage | Priority
--------------------|----------|----------
Controllers         | 0%       | HIGH
Services            | 0%       | CRITICAL
Middleware          | 0%       | HIGH
Models              | 0%       | MEDIUM
Routes              | 0%       | LOW (simple routing)
Utils               | 12.73%   | MEDIUM
Config              | 78.33%   | ✅ GOOD
```

**Only Tested Files:**
- ✅ `config/constants.ts` - 100% coverage (32 tests)
- ⚠️ `config/metrics.ts` - 78.33% coverage
- ⚠️ `utils/circuit-breaker.factory.ts` - 66.66% coverage

---

## Realistic Coverage Strategy

### Why Not 80% Immediately?

The codebase has **~15,000 lines** of backend code with 0% coverage. Reaching 80% coverage would require:
- **~400-500 test cases** (conservative estimate)
- **~3-4 weeks** of full-time testing effort
- **Risk of brittle tests** if done hastily

### Pragmatic Approach: Test Critical Paths First

Instead of arbitrary coverage percentages, we'll focus on **business-critical functionality** with high user impact:

1. **PDF Conversion Service** (cloudconvert.service.ts) - 757 lines
   - Core business logic
   - External API integration
   - Error handling and retries

2. **Authentication & Authorization** (auth.middleware.ts, auth.controller.ts)
   - Security-critical
   - User session management
   - JWT validation

3. **Guest Session Management** (guest-session.service.ts) - 272 lines
   - Beta feature with rate limiting
   - Session tracking
   - Quota enforcement

4. **Conversion Controller** (conversion.controller.ts) - 1,002 lines
   - Main user-facing API
   - File upload validation
   - Conversion orchestration

---

## Test Implementation Plan

### Phase 3A: Critical Service Tests (Week 8)

#### 1. CloudConvert Service Tests

**File**: `tests/unit/backend/services/cloudconvert.service.test.ts`
**Target**: 60% coverage
**Estimated**: 40 test cases

**Test Categories:**
```typescript
describe('CloudConvertService', () => {
  describe('convertPDF', () => {
    it('should successfully convert PDF to images')
    it('should handle authentication errors')
    it('should retry on timeout')
    it('should respect file size limits')
    it('should clean up temp files on error')
  })

  describe('downloadFile', () => {
    it('should download file with retry logic')
    it('should handle 404 errors')
    it('should timeout after 5 minutes')
  })

  describe('getJobStatus', () => {
    it('should return correct status')
    it('should handle non-existent jobs')
  })
})
```

**Critical Scenarios:**
- ✅ Successful conversion flow
- ✅ Network failures (timeout, 500 errors)
- ✅ Invalid file formats
- ✅ File size violations
- ✅ CloudConvert API errors
- ✅ Circuit breaker activation

#### 2. Authentication Middleware Tests

**File**: `tests/unit/backend/middleware/auth.middleware.test.ts`
**Target**: 70% coverage
**Estimated**: 25 test cases

**Test Categories:**
```typescript
describe('AuthMiddleware', () => {
  describe('verifyToken', () => {
    it('should accept valid JWT tokens')
    it('should reject expired tokens')
    it('should reject tampered tokens')
    it('should reject missing tokens')
    it('should handle malformed Authorization headers')
  })

  describe('requireAuth', () => {
    it('should allow authenticated requests')
    it('should block unauthenticated requests')
    it('should populate req.user with user data')
  })

  describe('requireAdmin', () => {
    it('should allow admin users')
    it('should block non-admin users')
    it('should block guests')
  })
})
```

#### 3. Guest Session Service Tests

**File**: `tests/unit/backend/services/guest-session.service.test.ts`
**Target**: 60% coverage
**Estimated**: 30 test cases

**Test Categories:**
```typescript
describe('GuestSessionService', () => {
  describe('createGuestSession', () => {
    it('should create session with valid IP')
    it('should return existing session if found')
    it('should enforce rate limits')
  })

  describe('checkGuestQuota', () => {
    it('should allow conversions within limit')
    it('should block after 3 conversions')
    it('should reset after 24 hours')
  })

  describe('trackConversion', () => {
    it('should increment conversion count')
    it('should update lastConversion timestamp')
  })
})
```

#### 4. Conversion Controller Tests

**File**: `tests/unit/backend/controllers/conversion.controller.test.ts`
**Target**: 50% coverage (large file, focus on critical paths)
**Estimated**: 35 test cases

**Test Categories:**
```typescript
describe('ConversionController', () => {
  describe('POST /api/convert', () => {
    it('should convert valid PDF')
    it('should reject files over 50MB')
    it('should reject non-PDF files')
    it('should check user quota')
    it('should enforce guest limits')
    it('should return job ID')
  })

  describe('GET /api/convert/status/:id', () => {
    it('should return job status')
    it('should handle non-existent jobs')
    it('should enforce ownership')
  })

  describe('GET /api/convert/download/:id', () => {
    it('should download completed file')
    it('should reject incomplete jobs')
    it('should enforce ownership')
    it('should handle expired files')
  })
})
```

---

### Phase 3B: Remaining Critical Tests (Week 9+)

#### 5. Additional Test Coverage

**Priority 2 Files:**
- `profile.controller.ts` - User profile management
- `batch.controller.ts` - Batch processing
- `payfast.service.ts` - Payment processing
- `audit.middleware.ts` - Security auditing

**Priority 3 Files:**
- Admin controllers (lower user impact)
- Analytics services (non-critical)
- Feedback controllers (nice-to-have)

---

## Expected Coverage After Phase 3A

### Projected Coverage (Conservative)

```
Category            | Before | After Phase 3A | Target
--------------------|--------|----------------|--------
Critical Services   | 0%     | ~55%           | 60%
Auth & Middleware   | 0%     | ~65%           | 70%
Conversion Logic    | 0%     | ~50%           | 50%
Overall Backend     | 1.58%  | ~15-20%        | 25%
```

### Test Count Projection

```
Current Tests:     32 (all in constants.test.ts)
+ Phase 3A:       +130 new tests
Total:            ~162 tests
```

---

## Testing Best Practices

### 1. Test Structure (AAA Pattern)

```typescript
it('should reject expired JWT tokens', async () => {
  // Arrange
  const expiredToken = jwt.sign({ userId: '123' }, JWT_SECRET, { expiresIn: '-1h' })
  const req = mockRequest({ headers: { authorization: `Bearer ${expiredToken}` } })
  const res = mockResponse()
  const next = jest.fn()

  // Act
  await authMiddleware.verifyToken(req, res, next)

  // Assert
  expect(res.status).toHaveBeenCalledWith(401)
  expect(res.json).toHaveBeenCalledWith({ error: 'Token expired' })
  expect(next).not.toHaveBeenCalled()
})
```

### 2. Mock External Dependencies

```typescript
jest.mock('../services/cloudconvert.service')
jest.mock('../config/redis')
jest.mock('axios')

beforeEach(() => {
  jest.clearAllMocks()
})
```

### 3. Test Real Scenarios

```typescript
describe('User Conversion Flow (Integration)', () => {
  it('should handle complete conversion lifecycle', async () => {
    // 1. Upload PDF
    const uploadRes = await request(app)
      .post('/api/convert')
      .attach('file', 'test.pdf')
      .expect(202)

    // 2. Check status
    const jobId = uploadRes.body.jobId
    const statusRes = await request(app)
      .get(`/api/convert/status/${jobId}`)
      .expect(200)

    expect(statusRes.body.status).toBe('processing')

    // 3. Download result (mocked as complete)
    mockJobComplete(jobId)
    await request(app)
      .get(`/api/convert/download/${jobId}`)
      .expect(200)
  })
})
```

### 4. Edge Cases Matter

```typescript
describe('Edge Cases', () => {
  it('should handle concurrent conversion requests')
  it('should handle database connection loss')
  it('should handle CloudConvert API downtime')
  it('should handle corrupted PDF files')
  it('should handle extremely large files (50MB+)')
})
```

---

## Continuous Integration

### GitHub Actions Workflow (Future)

```yaml
name: Test Coverage

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install
        working-directory: backend

      - name: Run tests with coverage
        run: npm test -- --coverage
        working-directory: backend

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          directory: ./backend/coverage

      - name: Check coverage thresholds
        run: npm test -- --coverage --coverageThreshold='{"global":{"statements":15}}'
        working-directory: backend
```

---

## Coverage Monitoring

### Daily Metrics

Track these metrics in each PR:
- Total test count
- Coverage percentage (statements)
- New files tested
- Regression tests added

### Weekly Goals (Phase 3)

```
Week 8:  10% → 15% coverage (+100 tests)
Week 9:  15% → 20% coverage (+50 tests)
Week 10: 20% → 25% coverage (+30 tests)
```

---

## Why This Approach Works

### 1. **Risk-Based Testing**
Focus on code that can cause real user impact:
- Payment failures → test payfast.service.ts
- Conversion failures → test cloudconvert.service.ts
- Security breaches → test auth middleware

### 2. **Incremental Improvement**
- Start with 0 tests → Add 130 tests in Phase 3
- Each test adds real value
- Coverage grows naturally with features

### 3. **Sustainable Maintenance**
- Well-tested critical paths
- Easy to add tests for new features
- CI/CD integration prevents regressions

### 4. **Developer Confidence**
- Refactor without fear
- Deploy with confidence
- Debug faster with test failures

---

## Next Steps

1. **Week 8**: Implement Phase 3A tests (Critical Services)
2. **Week 9**: Implement Phase 3B tests (Supporting Services)
3. **Week 10**: Integration tests for key user flows
4. **Week 11**: CI/CD integration and coverage monitoring

---

## Conclusion

Rather than chasing arbitrary 80% coverage metrics, this plan focuses on **testing what matters**:

✅ Business-critical conversion logic
✅ Security-sensitive authentication
✅ Revenue-impacting payment processing
✅ User-facing API controllers

**Expected Outcome:**
- 130+ new test cases
- 15-20% overall coverage
- 50-70% coverage of critical services
- High confidence in core functionality

This pragmatic approach ensures **quality over quantity** and **value over vanity metrics**.

---

**Status**: Phase 3A - Ready to implement critical service tests
