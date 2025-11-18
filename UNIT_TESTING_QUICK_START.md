# Unit Testing Quick Start Guide

Quick reference for running PDFLab unit tests.

---

## 🚀 Quick Commands

### Run All Tests
```bash
npm run test:unit
```

### Frontend Tests
```bash
npm run test:unit:frontend           # Run once
npm run test:unit:frontend:watch     # Watch mode (auto-rerun)
npm run test:unit:frontend:ui        # Visual UI mode
npm run test:unit:frontend:coverage  # With coverage report
```

### Backend Tests
```bash
npm run test:unit:backend            # Run once
npm run test:unit:backend:watch      # Watch mode
npm run test:unit:backend:coverage   # With coverage report
```

### Coverage Reports
```bash
npm run test:coverage  # Both frontend + backend
```

---

## 📊 Test Suite Overview

**Total Unit Tests Built**: 75 tests
- Frontend: 40 tests (Navigation, UnifiedConversionInterface, useRequireAuth, AuthContext)
- Backend: 35 tests (auth.middleware.ts)

**Coverage Targets**: 80%+ lines, functions, branches

---

## 🧪 What's Tested

### Frontend (40 tests)
- ✅ Navigation component (25 tests)
- ✅ UnifiedConversionInterface component (20+ tests - partial)
- ✅ useRequireAuth hook (10 tests)
- ✅ AuthContext (15 tests)

### Backend (35 tests)
- ✅ authMiddleware (6 tests)
- ✅ checkConversionQuota (6 tests)
- ✅ requirePlan (4 tests)
- ✅ optionalAuth (6 tests)

---

## 📁 Test File Locations

```
tests/
├── unit/
│   ├── frontend/
│   │   ├── components/
│   │   │   ├── Navigation.test.tsx
│   │   │   └── UnifiedConversionInterface.test.tsx
│   │   ├── hooks/
│   │   │   └── useRequireAuth.test.ts
│   │   └── contexts/
│   │       └── AuthContext.test.tsx
│   └── backend/
│       └── middleware/
│           └── auth.middleware.test.ts
└── setup/
    ├── vitest.setup.ts  (Frontend)
    └── jest.setup.ts    (Backend)
```

---

## 🔧 Configuration Files

- **Frontend**: `vitest.config.ts` (Vitest + Testing Library)
- **Backend**: `jest.config.js` (Jest + Supertest)

---

## 📖 Full Documentation

See [docs/testing/UNIT_TESTS_IMPLEMENTATION_2025-11-15.md](docs/testing/UNIT_TESTS_IMPLEMENTATION_2025-11-15.md) for complete details.

---

## 🐛 Troubleshooting

### Tests won't run
```bash
# Reinstall dependencies
npm install
```

### Frontend tests fail
```bash
# Check Vitest config
cat vitest.config.ts

# Run with verbose output
vitest run --reporter=verbose tests/unit/frontend
```

### Backend tests fail
```bash
# Check Jest config
cat jest.config.js

# Run with verbose output
jest --config jest.config.js --verbose
```

### Coverage not generating
```bash
# Install coverage provider
npm install -D @vitest/coverage-v8

# Run coverage
npm run test:coverage
```

---

**Last Updated**: November 15, 2025
