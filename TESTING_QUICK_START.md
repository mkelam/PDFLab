# PDFLab Testing - Quick Start Guide

## 🚀 Run Tests NOW

```bash
# 1. Start services (3 terminals)
docker start pdflab-mysql pdflab-redis     # Terminal 1
cd backend && npm run dev                   # Terminal 2
npm run dev                                 # Terminal 3

# 2. Run tests (Terminal 4)
npm run test:p0    # Critical tests (8 min)
npm run test:p1    # High priority (12 min)
npm run test:p2    # Medium priority (10 min)
npm run test:all   # Everything (45 min)
```

---

## 📊 Test Suite Overview

| Priority | Tests | Duration | Coverage |
|----------|-------|----------|----------|
| **P0 Critical** | 37 | 8 min | Payment, CloudConvert, Security |
| **P1 High** | 58 | 12 min | Errors, Email, API, Tokens |
| **P2 Medium** | 50 | 10 min | Beta, Batch, Feedback |
| **E2E** | 66 | 15 min | User flows (5 browsers) |
| **TOTAL** | **211** | **45 min** | **85% coverage** |

---

## 🧪 Test Files Built (All Ready)

```
tests/integration/
├── payments/
│   └── payfast-payment.test.ts         ✅ 15 tests
├── services/
│   ├── cloudconvert.test.ts            ✅ 12 tests
│   └── email.test.ts                   ✅ 15 tests
└── api/
    ├── security.test.ts                ✅ 17 tests
    ├── error-handling.test.ts          ✅ 15 tests
    ├── backend-endpoints.test.ts       ✅ 20 tests
    ├── refresh-token.test.ts           ✅ 15 tests
    ├── beta-user-system.test.ts        ✅ 15 tests
    ├── batch-processing-api.test.ts    ✅ 16 tests
    └── feedback-system.test.ts         ✅ 19 tests
```

**Status**: ✅ All built, not yet run

---

## 📋 Quick Commands

```bash
# Individual suites
npm run test:integration:payments     # Payment tests
npm run test:integration:services     # CloudConvert + Email
npm run test:integration:api          # All API tests
npm run test:e2e                      # E2E tests

# View results
npm run test:e2e:report               # HTML report
npx playwright show-trace test-results/trace.zip
```

---

## 🐛 If Tests Fail

1. **Check services are running**:
   ```bash
   docker ps | grep pdflab          # MySQL + Redis
   curl http://localhost:3006/     # Backend
   curl http://localhost:3000/      # Frontend
   ```

2. **Check test users exist**:
   - testuser@pdflab.com / TestPass123!
   - mmkela@gmail.com / TestPass123!
   - admin@pdflab.test / Admin123!

3. **Check environment variables**:
   ```bash
   cd backend && cat .env | grep -E "(JWT|CLOUDCONVERT|PAYFAST)"
   ```

4. **View detailed error**:
   ```bash
   npm run test:e2e:report  # Open HTML report
   ```

---

## 📖 Full Documentation

- **Complete Test Suite**: [`docs/testing/COMPLETE_TEST_SUITE_2025-11-15.md`](docs/testing/COMPLETE_TEST_SUITE_2025-11-15.md)
- **BMAD Test Review**: [`docs/testing/reports/BMAD_TEST_REVIEW_2025-11-15.md`](docs/testing/reports/BMAD_TEST_REVIEW_2025-11-15.md)
- **Test README**: [`tests/README.md`](tests/README.md)
- **Testing Docs**: [`docs/testing/README.md`](docs/testing/README.md)

---

## ✅ What's Ready

- ✅ 211 tests built and written
- ✅ Test helpers created
- ✅ Test fixtures downloaded
- ✅ NPM scripts configured
- ✅ Documentation complete

## ❌ What's NOT Done

- ❌ Tests have NOT been run yet
- ❌ No pass/fail results
- ❌ No CI/CD setup
- ❌ No coverage reports

---

**Next Action**: Run `npm run test:p0` to start testing!

**Date**: 2025-11-15
**Status**: READY FOR EXECUTION
