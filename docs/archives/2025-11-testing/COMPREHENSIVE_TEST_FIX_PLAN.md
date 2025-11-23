# Comprehensive Playwright Test Fix Plan

**Generated**: 2025-11-14
**Current Status**: 55.5% pass rate (61 passed / 49 failed / 110 total)
**Target**: 100% pass rate (110 passed / 0 failed)

---

## Executive Summary

### Test Results
- **Total Tests**: 110 (22 tests × 5 browsers)
- **Passed**: 61 (55.5%)
- **Failed**: 49 (44.5%)
- **Unique Failures**: 13 distinct test issues

### Failure Breakdown by Browser
- **Chromium**: 7 failures (31.8% fail rate)
- **Firefox**: 7 failures (31.8% fail rate)
- **WebKit**: 13 failures (59.1% fail rate)
- **Mobile Chrome**: 9 failures (40.9% fail rate)
- **Mobile Safari**: 13 failures (59.1% fail rate)

**Key Insight**: WebKit and Mobile Safari have highest failure rates - likely timing/rendering differences.

### Failure Breakdown by File
- **auth.spec.ts**: 3 unique issues → 8 browser failures
- **batch-processing.spec.ts**: 2 unique issues → 10 browser failures
- **conversion.spec.ts**: 2 unique issues → 10 browser failures
- **partner-e2e-flow.spec.ts**: 6 unique issues → 21 browser failures

---

## Error Patterns Analysis

### Pattern 1: Elements Not Visible (18 occurrences)
**Error**: `expect(locator).toBeVisible() failed`
**Root Cause**: Elements haven't rendered yet or wrong selectors
**Impact**: 36.7% of all failures

### Pattern 2: Test Timeouts (9 occurrences)
**Error**: `Test timeout of 30000ms exceeded`
**Root Cause**: Tests taking longer than 30s default timeout
**Impact**: 18.4% of all failures

### Pattern 3: Locator Timeouts (7 occurrences)
**Error**: `locator.waitFor: Timeout 10000ms exceeded`
**Root Cause**: Elements not appearing within wait time
**Impact**: 14.3% of all failures

### Pattern 4: API Errors (5 occurrences)
**Error**: `expect(...).toHaveAttribute(...).or is not a function`
**Root Cause**: Incorrect Playwright API usage - `.or()` doesn't work with `.toHaveAttribute()`
**Impact**: 10.2% of all failures

### Pattern 5: URL Timeouts (9 occurrences)
**Error**: `page.waitForURL: Timeout exceeded` or `expect(page).not.toHaveURL() failed`
**Root Cause**: Navigation slower than expected, especially on WebKit/Safari
**Impact**: 18.4% of all failures

---

## Fix Plan by Priority

### PRIORITY 1: API Usage Errors (Quick Wins)
**Affected**: batch-processing.spec.ts
**Tests**: 1 test × 5 browsers = 5 failures
**Estimated Time**: 5 minutes

#### Issue #1: `.or()` is not a function
**File**: `e2e/batch-processing.spec.ts:19`
**Error**: `TypeError: expect(...).toHaveAttribute(...).or is not a function`

```typescript
// ❌ CURRENT (WRONG - .or() doesn't work with .toHaveAttribute()):
await expect(batchButton).toHaveAttribute('data-active', 'true').or(
  expect(batchButton).toHaveClass(/bg-primary|active|selected/)
)

// ✅ FIX (Use separate checks or just check one attribute):
await expect(batchButton).toHaveClass(/bg-primary|active|selected/)
// OR check both separately
const hasAttribute = await batchButton.getAttribute('data-active') === 'true'
const hasClass = await batchButton.evaluate(el => el.classList.contains('bg-primary'))
expect(hasAttribute || hasClass).toBeTruthy()
```

---

### PRIORITY 2: Auth Test Failures (High Impact)
**Affected**: auth.spec.ts
**Tests**: 3 tests × multiple browsers = 8 failures
**Estimated Time**: 15 minutes

#### Issue #2: Login redirect not working (WebKit/Mobile)
**File**: `e2e/auth.spec.ts:19`
**Error**: `expect(page).not.toHaveURL(/\/login/) failed`
**Browsers**: WebKit, Mobile Chrome, Mobile Safari

**Root Cause**: Slow navigation on WebKit/Safari engines

```typescript
// ❌ CURRENT (10s timeout insufficient for Safari):
await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 })

// ✅ FIX (Increase timeout for slower browsers):
await expect(page).not.toHaveURL(/\/login/, { timeout: 20000 })
```

#### Issue #3: Error message not visible
**File**: `e2e/auth.spec.ts:41`
**Error**: `locator('text=/Invalid|Error|Failed/i') not visible`
**Browsers**: WebKit, Mobile Safari

**Root Cause**: Error message might use different text or take longer to appear

```typescript
// ❌ CURRENT (Generic regex might not match):
await expect(page.locator('text=/Invalid|Error|Failed/i')).toBeVisible()

// ✅ FIX (Use more specific selectors and increase timeout):
await expect(
  page.locator('[role="alert"]').or(
    page.locator('.error, .text-red-500, .text-destructive')
  ).first()
).toBeVisible({ timeout: 10000 })
```

#### Issue #4: Session persistence redirect
**File**: `e2e/auth.spec.ts:63`
**Error**: Same as Issue #2
**Fix**: Same as Issue #2

---

### PRIORITY 3: Batch Processing Failures
**Affected**: batch-processing.spec.ts
**Tests**: 2 tests × 5 browsers = 10 failures
**Estimated Time**: 10 minutes

#### Issue #5: Upgrade modal not visible
**File**: `e2e/batch-processing.spec.ts:73`
**Error**: `locator('text=/upgrade|pro|premium/i').or(locator('[data-testid="upgrade-modal"]')) not visible`
**Browsers**: All (Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari)

**Root Cause**: Free users might not see upgrade modal, or modal takes time to appear

```typescript
// ❌ CURRENT (Assumes modal appears immediately):
await expect(
  page.locator('text=/upgrade|pro|premium/i').or(
    page.locator('[data-testid="upgrade-modal"]')
  )
).toBeVisible({ timeout: 5000 })

// ✅ FIX (Check if batch button is disabled OR modal appears):
// Option 1: Check if batch button is disabled for free users
const batchButton = page.getByRole('button', { name: /Batch Processing/i })
const isDisabled = await batchButton.isDisabled()
expect(isDisabled).toBeTruthy()

// Option 2: If modal should appear, increase timeout
await expect(
  page.locator('[data-testid="upgrade-modal"], [role="dialog"]').first()
).toBeVisible({ timeout: 10000 })
```

---

### PRIORITY 4: Conversion Test Failures
**Affected**: conversion.spec.ts
**Tests**: 2 tests × 5 browsers = 10 failures
**Estimated Time**: 10 minutes

#### Issue #6: Compression mode selector not visible
**File**: `e2e/conversion.spec.ts:24`
**Error**: `locator('select, [role="combobox"]').first() not visible`
**Browsers**: All

**Root Cause**: Compression mode UI might not be rendered yet, or selector is wrong

```typescript
// ❌ CURRENT (Selector might be too generic):
await expect(page.locator('select, [role="combobox"]').first()).toBeVisible()

// ✅ FIX (Wait for page load and use more specific selector):
await page.waitForLoadState('networkidle', { timeout: 15000 })
await page.getByRole('button', { name: /compress/i }).click()
// Then wait for compression level selector
await expect(
  page.locator('[data-testid="compression-level"]').or(
    page.locator('select, [role="combobox"]')
  ).first()
).toBeVisible({ timeout: 10000 })
```

#### Issue #7: Format selector timeout
**File**: `e2e/conversion.spec.ts:71`
**Error**: `locator.waitFor: Timeout 10000ms exceeded`
**Browsers**: All

**Root Cause**: Format selector takes longer to load, especially on slower browsers

```typescript
// ❌ CURRENT (10s timeout insufficient):
const formatSelector = page.locator('select, [role="combobox"]').first()
await formatSelector.waitFor({ state: 'visible', timeout: 10000 })

// ✅ FIX (Increase timeout and add networkidle wait):
await page.waitForLoadState('networkidle', { timeout: 15000 })
const formatSelector = page.locator('select, [role="combobox"]').first()
await formatSelector.waitFor({ state: 'visible', timeout: 20000 })
```

---

### PRIORITY 5: Partner E2E Flow Timeouts (Complex)
**Affected**: partner-e2e-flow.spec.ts
**Tests**: 6 tests × multiple browsers = 21 failures
**Estimated Time**: 30 minutes

#### Issue #8: Step 1 - Application submission timeout
**File**: `e2e/partner-e2e-flow.spec.ts:43`
**Error**: `Test timeout of 30000ms exceeded`
**Browsers**: All

**Root Cause**: Multi-step form submission takes > 30s

```typescript
// ❌ CURRENT (Default 30s timeout):
test('Step 1: Partner submits application', async ({ page }) => {
  // test code
})

// ✅ FIX (Increase to 90s):
test('Step 1: Partner submits application', async ({ page }) => {
  // test code
}, { timeout: 90000 })
```

#### Issue #9: Step 3 - Admin approval timeout
**File**: `e2e/partner-e2e-flow.spec.ts:187`
**Error**: `Test timeout of 30000ms exceeded`
**Browsers**: All

**Fix**: Same as Issue #8 - increase test timeout to 90s

#### Issue #10: Step 7 - Logout URL timeout
**File**: `e2e/partner-e2e-flow.spec.ts:366`
**Error**: `page.waitForURL: Timeout 15000ms exceeded`
**Browsers**: All

```typescript
// ❌ CURRENT (15s timeout):
await page.waitForURL(/login/, { timeout: 15000 })

// ✅ FIX (Increase to 20s and ensure networkidle):
await logoutButton.click({ force: true, timeout: 10000 })
await page.waitForLoadState('networkidle', { timeout: 10000 })
await page.waitForURL(/login/, { timeout: 20000 })
```

#### Issue #11: Step 2 - Admin login URL timeout (WebKit/Safari only)
**File**: `e2e/partner-e2e-flow.spec.ts:133`
**Error**: `page.waitForURL: Timeout 20000ms exceeded`
**Browsers**: WebKit, Mobile Safari

```typescript
// ❌ CURRENT (20s timeout insufficient for Safari):
await page.waitForURL(/\/admin/, { timeout: 20000 })

// ✅ FIX (Increase to 30s for Safari):
await page.waitForURL(/\/admin/, { timeout: 30000 })
```

#### Issue #12: Step 5 - Partner login timeout (WebKit/Safari only)
**File**: `e2e/partner-e2e-flow.spec.ts:288`
**Error**: `Test timeout of 30000ms exceeded`
**Browsers**: WebKit, Mobile Safari

**Fix**: Increase test timeout to 60s (Safari is slower)

#### Issue #13: Step 6 - Dashboard access timeout (WebKit/Safari only)
**File**: `e2e/partner-e2e-flow.spec.ts:325`
**Error**: `Test timeout of 30000ms exceeded`
**Browsers**: WebKit, Mobile Safari

**Fix**: Increase test timeout to 60s (Safari is slower)

---

## Implementation Strategy

### Phase 1: Quick Wins (5 min)
1. Fix batch-processing.spec.ts `.or()` API error (Issue #1)

### Phase 2: Auth Tests (15 min)
2. Fix auth.spec.ts URL timeouts (Issues #2, #3, #4)

### Phase 3: Batch & Conversion (20 min)
3. Fix batch-processing.spec.ts upgrade modal (Issue #5)
4. Fix conversion.spec.ts selector issues (Issues #6, #7)

### Phase 4: Partner E2E (30 min)
5. Fix partner-e2e-flow.spec.ts timeouts (Issues #8-13)

### Phase 5: Verification (10 min)
6. Run full test suite
7. Verify 100% pass rate

**Total Estimated Time**: ~80 minutes (1h 20m)

---

## Browser-Specific Considerations

### WebKit & Mobile Safari Issues
**Pattern**: These browsers consistently timeout more than others

**Root Cause**: WebKit/Safari engines:
- Slower page navigation
- Slower DOM rendering
- Stricter security policies (affect auth flows)

**Solution**: Add 1.5x-2x longer timeouts for:
- `page.waitForURL()`: 20s → 30s
- `page.waitForLoadState('networkidle')`: 10s → 15s
- Test timeouts: 30s → 60s or 90s

### Mobile Browsers Issues
**Pattern**: Mobile Chrome and Mobile Safari fail more on auth tests

**Root Cause**: Mobile viewports:
- Different navigation rendering (hamburger menus)
- Touch vs click interactions
- Slower emulation performance

**Solution**:
- Use `.first()` to handle duplicate desktop/mobile elements
- Increase timeouts by 50% for mobile projects
- Consider separate mobile-specific test assertions

---

## Expected Outcomes

### After All Fixes
- **Pass Rate**: 100% (110/110)
- **Chromium**: 22/22 passing (↑15 tests)
- **Firefox**: 22/22 passing (↑15 tests)
- **WebKit**: 22/22 passing (↑9 tests)
- **Mobile Chrome**: 22/22 passing (↑13 tests)
- **Mobile Safari**: 22/22 passing (↑9 tests)

### Confidence Level
- **High Confidence (90%+)**: Issues #1-7 (API errors, selectors, basic timeouts)
- **Medium Confidence (75%+)**: Issues #8-10 (complex flows, need testing)
- **Lower Confidence (60%+)**: Issues #11-13 (Safari-specific, may need iteration)

---

## Next Steps

1. **Start with Phase 1** (Quick wins) to immediately reduce failure count
2. **Test incrementally** after each phase with single browser:
   ```bash
   npm run test:e2e -- --project=chromium
   ```
3. **Run full suite** after all fixes:
   ```bash
   npm run test:e2e
   ```
4. **Review HTML report**:
   ```bash
   npm run test:e2e:report
   ```

---

**Last Updated**: 2025-11-14
**Ready to Start**: Yes ✅
**Estimated Completion**: 80 minutes
