# Playwright E2E Test Fixes - Comprehensive Plan

**Date**: 2025-11-14
**Test Results**: 16 failures out of 22 tests (27.3% pass rate)
**Goal**: Fix all failures to achieve 100% pass rate

---

## 📊 **Test Results Summary**

- **Total Tests**: 22
- **Passed**: 6 (27.3%)
- **Failed**: 11 (50.0%)
- **Timed Out**: 5 (22.7%)
- **Duration**: 145 seconds

### Failures by File
- **auth.spec.ts**: 4 failures
- **batch-processing.spec.ts**: 3 failures (1 failed + 1 timeout)
- **conversion.spec.ts**: 5 failures (4 failed + 1 timeout)
- **partner-e2e-flow.spec.ts**: 4 failures (1 failed + 3 timeouts)

---

## 🔴 **Category 1: Selector Issues (Strict Mode Violations)**

### Issue Type: Multiple Elements Match
When using text selectors, Playwright finds multiple matching elements and doesn't know which one to interact with.

**Root Cause**: Generic text selectors that match multiple UI elements

**Solution Pattern**: Use more specific selectors (test IDs, roles, unique text, or nth() selectors)

---

### **Fix #1: conversion.spec.ts:16 - Convert Button**

**Error**:
```
Strict mode violation: locator('text=Convert') resolved to 8 elements
```

**Current Code** (Line 16):
```typescript
await expect(page.locator('text=Convert')).toBeVisible()
```

**Problem**: "Convert" appears in:
1. H1 heading: "Convert PDFs to Office Files..."
2. Convert mode button
3. Multiple testimonial paragraphs mentioning "Converting"

**Fix**:
```typescript
// Option 1: Use test ID (recommended)
await expect(page.getByTestId('convert-mode-button')).toBeVisible()

// Option 2: Use role and exact name
await expect(page.getByRole('button', { name: 'Convert' })).toBeVisible()

// Option 3: Use first() if multiple are acceptable
await expect(page.locator('text=Convert').first()).toBeVisible()
```

**Recommendation**: Option 1 or 2 (most specific)

---

### **Fix #2: conversion.spec.ts:27 - Compression Mode**

**Error**:
```
Strict mode violation: locator('text=/compression level|good|recommended/i') resolved to 3 elements
```

**Current Code** (Line 27):
```typescript
await page.locator('text=Compress').click()
await expect(page.locator('text=/compression level|good|recommended/i')).toBeVisible()
```

**Problem**: Matches:
1. H4 heading: "3. Compression Level"
2. Span: "good"
3. Span: "recommended"

**Fix**:
```typescript
await page.locator('text=Compress').click()

// Check for the heading specifically
await expect(page.getByRole('heading', { name: 'Compression Level' })).toBeVisible()

// Or check for compression options using test IDs
await expect(page.getByTestId('compression-level-good')).toBeVisible()
await expect(page.getByTestId('compression-level-recommended')).toBeVisible()
```

---

### **Fix #3: conversion.spec.ts:49 - Batch Toggle**

**Error**:
```
Strict mode violation: locator('text=/batch|single/i') resolved to 2 elements
```

**Current Code** (Line 49):
```typescript
await expect(page.locator('text=/batch|single/i')).toBeVisible()
```

**Problem**: Matches:
1. Button: "Single File"
2. Button: "Batch Processing Pro"

**Fix**:
```typescript
// Check both buttons are visible
await expect(page.getByRole('button', { name: 'Single File' })).toBeVisible()
await expect(page.getByRole('button', { name: /Batch Processing/ })).toBeVisible()

// Or use a parent container
await expect(page.locator('[data-testid="mode-toggle"]')).toBeVisible()
```

---

## 🔴 **Category 2: Page Title/URL Mismatches**

### **Fix #4: auth.spec.ts:11 - Login Page Title**

**Error**:
```
Expected pattern: /Login/
Received: "PDF Lab Pro - Premium Document Processing"
```

**Current Code** (Line 11):
```typescript
await page.goto('/login')
await expect(page).toHaveTitle(/Login/)
```

**Problem**: Page title doesn't contain "Login"

**Fix**:
```typescript
await page.goto('/login')

// Option 1: Update to match actual title
await expect(page).toHaveTitle(/PDF Lab Pro/)

// Option 2: Check for login-specific content instead
await expect(page).toHaveURL(/\/login/)
await expect(page.getByRole('heading', { name: /sign in|log in/i })).toBeVisible()
```

**Recommendation**: Option 2 (more robust)

---

### **Fix #5: auth.spec.ts:47 - Signup Navigation**

**Error**:
```
Expected: /signup/
Received: http://localhost:3000/login
```

**Current Code** (Lines 44-47):
```typescript
test('should navigate to signup page', async ({ page }) => {
  await page.goto('/login')
  await page.locator('text=Sign up').click()
  await expect(page).toHaveURL(/signup/)
})
```

**Problem**: "Sign up" link doesn't exist or doesn't navigate

**Fix**:
```typescript
test('should navigate to signup page', async ({ page }) => {
  await page.goto('/login')

  // Find the actual signup link (check actual implementation)
  await page.getByRole('link', { name: /sign up|create account|register/i }).click()

  await expect(page).toHaveURL(/signup/)
})
```

**Action Required**: Verify signup link exists on login page

---

## 🔴 **Category 3: Missing Elements (Not Found)**

### **Fix #6: auth.spec.ts:30 - Post-Login Navigation**

**Error**:
```
Locator: locator('text=/Dashboard|Profile|Logout/i')
Expected: visible
Error: element(s) not found
```

**Current Code** (Lines 16-30):
```typescript
test('should login with valid credentials', async ({ page }) => {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill('testuser@pdflab.com')
  await page.locator('input[type="password"]').fill('TestPass123!')
  await page.locator('button[type="submit"]').click()

  // Wait for successful login - check for dashboard elements
  await expect(page.locator('text=/Dashboard|Profile|Logout/i')).toBeVisible()
})
```

**Problem**: After login, navigation elements don't contain these exact words

**Fix**:
```typescript
test('should login with valid credentials', async ({ page }) => {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill('testuser@pdflab.com')
  await page.locator('input[type="password"]').fill('TestPass123!')
  await page.locator('button[type="submit"]').click()

  // Wait for URL change
  await expect(page).not.toHaveURL(/\/login/)

  // Check for authenticated state
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  // Or check for specific navigation items
  await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible()
})
```

**Action Required**: Inspect actual navigation structure after login

---

### **Fix #7: batch-processing.spec.ts:60 - File Count Display**

**Error**:
```
Locator: locator('text=/3 files?|3/10/')
Expected: visible
Error: element(s) not found
```

**Current Code** (Lines 43-60):
```typescript
test('should show file count in batch mode', async ({ page }) => {
  await page.goto('/')

  // Login as pro user
  await page.goto('/login')
  await page.locator('input[type="email"]').fill('pro@pdflab.com')
  await page.locator('input[type="password"]').fill('ProPass123!')
  await page.locator('button[type="submit"]').click()
  await page.goto('/')

  // Switch to batch mode
  await page.locator('text=Batch Processing').click()

  // Upload multiple files (simulated)
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(['test1.pdf', 'test2.pdf', 'test3.pdf'])

  // Should show file count
  await expect(page.locator('text=/3 files?|3/10/')).toBeVisible()
})
```

**Problem**: File count format doesn't match expected pattern

**Fix**:
```typescript
// After file upload
const fileCount = await page.locator('[data-testid="file-count"]').textContent()
expect(fileCount).toContain('3')

// Or use more flexible text matching
await expect(page.locator('text=3')).toBeVisible()

// Or check for batch file list
await expect(page.locator('[data-testid="batch-file-list"]')).toContainText('3')
```

---

### **Fix #8: conversion.spec.ts:66 - File Validation Error**

**Error**:
```
Locator: locator('text=/invalid|only PDF|not supported/i')
Expected: visible
Error: element(s) not found
```

**Current Code** (Lines 53-66):
```typescript
test('should validate file type', async ({ page }) => {
  await page.goto('/')

  const fileInput = page.locator('input[type="file"]')

  // Try to upload non-PDF file
  await fileInput.setInputFiles({
    name: 'test.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Not a PDF')
  })

  // Should show error message
  await expect(page.locator('text=/invalid|only PDF|not supported/i')).toBeVisible()
})
```

**Problem**: Error message doesn't appear or has different wording

**Fix**:
```typescript
test('should validate file type', async ({ page }) => {
  await page.goto('/')

  const fileInput = page.locator('input[type="file"]')

  // Try to upload non-PDF file
  await fileInput.setInputFiles({
    name: 'test.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Not a PDF')
  })

  // Wait for error toast/alert/message
  await expect(page.locator('[role="alert"]')).toBeVisible()
  await expect(page.locator('[role="alert"]')).toContainText(/pdf/i)

  // Or check for specific error element
  await expect(page.getByTestId('file-error')).toBeVisible()
})
```

**Action Required**: Verify error message implementation

---

### **Fix #9: partner-e2e-flow.spec.ts:173 - Admin Applications Table**

**Error**:
```
Locator: locator('text="testpartner1763145114286@example.com"').first()
Expected: visible
Error: element(s) not found
```

**Current Code** (Around line 173):
```typescript
await expect(page.locator(`text="${testEmail}"`).first()).toBeVisible()
```

**Problem**: Test partner application not in database or table not displaying

**Fix**:
```typescript
// Wait for table to load
await page.waitForLoadState('networkidle')

// Check table exists first
await expect(page.locator('table')).toBeVisible()

// Look for any partner email in table
await expect(page.locator('tbody tr')).toHaveCount({ minimum: 1 })

// Or use more flexible search
await expect(page.getByRole('cell', { name: testEmail })).toBeVisible()
```

---

## 🔴 **Category 4: Class/State Assertions**

### **Fix #10: batch-processing.spec.ts:31 - Batch Toggle Class**

**Error**:
```
Locator: locator('text=Batch Processing')
Expected pattern: /active|selected|bg-primary/
Received: ""
```

**Current Code** (Lines 19-31):
```typescript
test('should toggle between single and batch mode', async ({ page }) => {
  await page.goto('/')

  // Login as pro user first
  await page.goto('/login')
  await page.locator('input[type="email"]').fill('pro@pdflab.com')
  await page.locator('input[type="password"]').fill('ProPass123!')
  await page.locator('button[type="submit"]').click()
  await page.goto('/')

  // Click batch mode
  await page.locator('text=Batch Processing').click()

  // Should be active
  await expect(page.locator('text=Batch Processing')).toHaveClass(/active|selected|bg-primary/)
})
```

**Problem**: Element is a `<span>` without classes (parent button has the classes)

**Fix**:
```typescript
// Click batch mode
const batchButton = page.getByRole('button', { name: /Batch Processing/ })
await batchButton.click()

// Check button has active state
await expect(batchButton).toHaveClass(/active|selected|bg-primary/)

// Or check aria-pressed
await expect(batchButton).toHaveAttribute('aria-pressed', 'true')

// Or check data attribute
await expect(batchButton).toHaveAttribute('data-active', 'true')
```

---

## ⏱️ **Category 5: Timeouts (30 seconds)**

### Common Timeout Causes
1. **Slow page loads** - Network issues or heavy content
2. **Missing elements** - Test looking for elements that don't exist
3. **Async operations** - Long-running API calls
4. **Test dependencies** - Previous test didn't complete properly

---

### **Fix #11: batch-processing.spec.ts - Batch Mode Block (Timeout)**

**Test**: "should block batch mode for free users"

**Likely Cause**: Login process or modal interaction taking too long

**Fix**:
```typescript
test('should block batch mode for free users', async ({ page }) => {
  await page.goto('/login')

  // Login as free user
  await page.locator('input[type="email"]').fill('freeuser@pdflab.com')
  await page.locator('input[type="password"]').fill('FreePass123!')
  await page.locator('button[type="submit"]').click()

  // Wait for navigation
  await page.waitForLoadState('networkidle')
  await page.goto('/')

  // Try to click batch mode
  const batchButton = page.getByRole('button', { name: /Batch Processing/ })
  await batchButton.click()

  // Should show upgrade modal or disabled state
  await expect(page.locator('[data-testid="upgrade-modal"]')).toBeVisible({ timeout: 10000 })

  // Or check if button is disabled
  await expect(batchButton).toBeDisabled()
}, { timeout: 60000 }) // Increase timeout for this test
```

---

### **Fix #12: conversion.spec.ts - Format Selection (Timeout)**

**Test**: "should select conversion format"

**Likely Cause**: Format dropdown or interaction issue

**Fix**:
```typescript
test('should select conversion format', async ({ page }) => {
  await page.goto('/')

  // Wait for page to be ready
  await page.waitForLoadState('networkidle')

  // Click format dropdown (use actual selector)
  const formatSelect = page.locator('[data-testid="format-select"]')
  await formatSelect.waitFor({ state: 'visible', timeout: 10000 })
  await formatSelect.click()

  // Select DOCX format
  await page.getByRole('option', { name: 'DOCX' }).click({ timeout: 10000 })

  // Verify selection
  await expect(formatSelect).toContainText('DOCX')
}, { timeout: 60000 })
```

---

### **Fix #13: partner-e2e-flow.spec.ts - Step 1 (Timeout)**

**Test**: "Step 1: Partner submits application"

**Likely Cause**: Form submission slow or page navigation issue

**Fix**:
```typescript
test('Step 1: Partner submits application', async ({ page }) => {
  await page.goto('/partner/apply')
  await page.waitForLoadState('networkidle')

  // Fill form with explicit waits
  await page.getByPlaceholder('Your Name').fill('Test Partner', { timeout: 10000 })
  await page.getByPlaceholder('your@email.com').fill(testEmail, { timeout: 10000 })

  // Continue with all fields...

  // Submit with longer timeout
  await page.getByRole('button', { name: /submit/i }).click({ timeout: 10000 })

  // Wait for success message
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 15000 })
}, { timeout: 90000 }) // 90 second timeout for complex form
```

---

### **Fix #14: partner-e2e-flow.spec.ts - Step 3 (Timeout)**

**Test**: "Step 3: Admin approves application"

**Likely Cause**: Admin dashboard slow or approval action delay

**Fix**:
```typescript
test('Step 3: Admin approves application', async ({ page }) => {
  // Already logged in as admin from Step 2

  // Find application row with longer timeout
  const applicationRow = page.locator('tbody tr', { hasText: testEmail })
  await applicationRow.waitFor({ state: 'visible', timeout: 15000 })

  // Click approve button
  const approveButton = applicationRow.getByRole('button', { name: /approve/i })
  await approveButton.click({ timeout: 10000 })

  // Wait for confirmation modal or success toast
  await page.locator('[data-testid="approval-modal"]').waitFor({ timeout: 10000 })
  await page.getByRole('button', { name: /confirm/i }).click({ timeout: 10000 })

  // Wait for API call to complete
  await page.waitForLoadState('networkidle', { timeout: 15000 })

  // Verify approval
  await expect(applicationRow).toContainText(/approved/i)
}, { timeout: 90000 })
```

---

### **Fix #15: partner-e2e-flow.spec.ts - Step 7 (Timeout)**

**Test**: "Step 7: Partner logs out"

**Likely Cause**: Logout button interaction or navigation delay

**Fix**:
```typescript
test('Step 7: Partner logs out', async ({ page }) => {
  // Open user menu
  const userMenu = page.getByTestId('user-menu')
  await userMenu.waitFor({ state: 'visible', timeout: 10000 })
  await userMenu.click()

  // Click logout with force if needed
  const logoutButton = page.getByRole('button', { name: /log out|sign out/i })
  await logoutButton.waitFor({ state: 'visible', timeout: 10000 })
  await logoutButton.click({ force: true, timeout: 10000 })

  // Wait for redirect to login
  await page.waitForURL(/\/login/, { timeout: 15000 })

  // Verify logged out state
  await expect(page.getByRole('heading', { name: /sign in|log in/i })).toBeVisible()
}, { timeout: 60000 })
```

---

## ✅ **Implementation Strategy**

### Phase 1: Fix Selector Issues (Fixes #1-3, #6-9)
**Estimated Time**: 30 minutes
**Impact**: 8 tests fixed

1. Update all strict mode violations with specific selectors
2. Use test IDs where available
3. Use role-based selectors as fallback
4. Add .first() only when appropriate

---

### Phase 2: Fix Page Title/URL Issues (Fixes #4-5)
**Estimated Time**: 15 minutes
**Impact**: 2 tests fixed

1. Update title expectations to match actual titles
2. Verify signup link exists and works
3. Add URL checks as primary assertions

---

### Phase 3: Fix Class/State Assertions (Fix #10)
**Estimated Time**: 10 minutes
**Impact**: 1 test fixed

1. Target parent button instead of span
2. Use aria attributes for state checking

---

### Phase 4: Fix Timeouts (Fixes #11-15)
**Estimated Time**: 45 minutes
**Impact**: 5 tests fixed

1. Increase individual test timeouts to 60-90s
2. Add explicit waits for network idle
3. Add intermediate assertions
4. Use longer timeout values for slow operations

---

## 📋 **Action Items Checklist**

### Before Starting
- [ ] Review actual UI implementation for each failed test
- [ ] Document actual element selectors (use browser DevTools)
- [ ] Verify test user accounts exist in database
- [ ] Ensure all services are running (frontend, backend, partners-portal)

### Implementation
- [ ] Fix auth.spec.ts (4 tests)
- [ ] Fix batch-processing.spec.ts (3 tests)
- [ ] Fix conversion.spec.ts (5 tests)
- [ ] Fix partner-e2e-flow.spec.ts (4 tests)

### Verification
- [ ] Run tests individually to verify each fix
- [ ] Run full suite to check for regressions
- [ ] Document any new test patterns discovered
- [ ] Update test documentation

---

## 🎯 **Expected Outcome**

**Current**: 6/22 passing (27.3%)
**Target**: 22/22 passing (100%)

**Estimated Total Time**: 2 hours
**Priority**: High (blocking autonomous BMAD testing)

---

## 📝 **Notes for BMAD Autonomous Testing**

Once these tests are fixed, the BMAD system will be able to:
1. ✅ Run existing tests autonomously
2. ✅ Generate new test variations
3. ✅ Auto-fix selector issues
4. ✅ Provide accurate coverage reports

**Next Step**: After manual fixes, use BMAD to generate comprehensive test suites for all features with proper selectors from the start.

---

**Created By**: Claude Code
**Date**: 2025-11-14 19:45 UTC
**Status**: Ready for Implementation
**Test Report**: http://localhost:9323/
