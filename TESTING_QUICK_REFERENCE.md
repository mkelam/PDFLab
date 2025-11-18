# Testing Quick Reference Card

Quick commands for running PDFLab tests.

---

## 🚀 Most Common Commands

```bash
# Run all automated tests
npm test

# Run with coverage reports
npm run test:coverage

# Run specific test types
npm run test:unit              # Unit tests only
npm run test:e2e               # E2E tests only
npm run test:integration       # Integration tests only
npm run test:accessibility     # Accessibility tests only
```

---

## 📊 Test Suite Overview

| Type | Count | Framework | Status |
|------|-------|-----------|--------|
| E2E | 66 | Playwright | ✅ |
| Integration | 145 | Playwright | ✅ |
| Unit (Frontend) | 40 | Vitest | ✅ |
| Unit (Backend) | 93 | Jest | ✅ |
| Accessibility | 12 | Axe-core | ✅ |
| Visual | 8 | Percy | ✅ |
| Performance | 4 | k6 | ✅ |
| **TOTAL** | **369** | | **100%** |

---

## 🧪 Unit Tests

```bash
npm run test:unit                   # All unit tests
npm run test:unit:frontend          # Frontend only
npm run test:unit:frontend:watch    # Frontend watch mode
npm run test:unit:frontend:ui       # Frontend visual UI
npm run test:unit:backend           # Backend only
npm run test:unit:backend:watch     # Backend watch mode
npm run test:coverage               # Coverage reports
```

---

## 🌐 E2E & Integration Tests

```bash
npm run test:e2e                    # All E2E tests
npm run test:e2e:ui                 # E2E with UI mode
npm run test:integration            # All integration tests
npm run test:p0                     # Priority 0 tests
npm run test:p1                     # Priority 1 tests
npm run test:p2                     # Priority 2 tests
npm run test:all                    # All priority tests
```

---

## ♿ Accessibility Tests

```bash
npm run test:accessibility          # WCAG 2.1 Level AA tests
```

**What it tests**:
- WCAG 2.1 compliance (5 pages)
- Keyboard navigation (2 tests)
- Screen reader compatibility (5 tests)

---

## 👁️ Visual Regression Tests

```bash
# Setup (one-time)
export PERCY_TOKEN=your_token_here

# Run tests
npm run test:visual
```

**What it tests**:
- Desktop snapshots (5 pages)
- Mobile snapshots (3 pages)

---

## ⚡ Performance Tests

```bash
# Setup (one-time)
choco install k6  # Windows
brew install k6   # macOS

# Run tests
npm run test:performance:load       # 50 users, 5 min
npm run test:performance:stress     # 300 users, find limits
npm run test:performance:spike      # Sudden traffic spikes
npm run test:performance:soak       # 30 min stability test
```

---

## 📁 Test Locations

```
tests/
├── e2e/              # E2E tests (66)
├── integration/      # Integration tests (145)
├── unit/
│   ├── frontend/     # Frontend unit tests (40)
│   └── backend/      # Backend unit tests (93)
├── accessibility/    # A11y tests (12)
├── visual/           # Visual tests (8)
└── performance/      # Perf tests (4)
```

---

## 📖 Documentation

- **Complete Guide**: `docs/testing/100_PERCENT_COVERAGE_COMPLETE_2025-11-15.md`
- **Unit Tests**: `docs/testing/COMPLETE_UNIT_TESTS_2025-11-15.md`
- **Quick Start**: `UNIT_TESTING_QUICK_START.md`
- **Performance**: `tests/performance/README.md`

---

## 🐛 Troubleshooting

### Tests won't run
```bash
npm install  # Reinstall dependencies
```

### Frontend tests fail
```bash
npx playwright install  # Install browsers
```

### Backend tests fail
```bash
docker start pdflab-mysql pdflab-redis  # Start services
```

### Percy tests fail
```bash
export PERCY_TOKEN=your_token_here  # Set token
```

### k6 not found
```bash
choco install k6  # Windows
brew install k6   # macOS
```

---

## 🎯 Coverage Targets

- **Unit Tests**: 80%+ code coverage
- **E2E Tests**: All critical user flows
- **Integration**: All API endpoints
- **Accessibility**: WCAG 2.1 Level AA
- **Visual**: Desktop + Mobile baselines
- **Performance**: p95 < 500ms

---

**Last Updated**: November 15, 2025
**Total Tests**: 369
**Coverage**: 100% ✅
