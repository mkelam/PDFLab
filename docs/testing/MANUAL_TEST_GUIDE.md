# PDFLab Reset Mechanism - Manual Integration Test Guide

**Test Date:** 2025-11-02
**Test Objective:** Validate reset mechanism changes within complete PDFLab conversion workflow
**Tester:** Product Owner / QA Team
**Environment:** http://localhost:3000

---

## ✅ PRE-TEST CHECKLIST

- [ ] Frontend server running at http://localhost:3000
- [ ] Browser: Chrome, Firefox, or Edge (latest version)
- [ ] Browser DevTools open (F12) to monitor console
- [ ] Test PDF file ready (download: https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf)

---

## 🧪 TEST SUITE 1: CONFIRMATION DIALOG BEHAVIOR

### Test 1.1: Dialog Appears When Needed
**Steps:**
1. Open http://localhost:3000
2. Drag and drop a PDF file onto upload zone
3. **Verify:** File appears in "Files Ready" section with green checkmark
4. Click "Process Another" button (white outline button)
5. **Expected Result:**
   - ✅ Dialog box appears with title "Reset conversion interface?"
   - ✅ Dialog says "You have uploaded files that haven't been processed yet"
   - ✅ Two buttons visible: "Cancel" and "Reset"

**Result:** [ ] PASS [ ] FAIL
**Notes:** ___________________________________________

---

### Test 1.2: Dialog "Cancel" Button Works
**Steps:**
1. (Continue from Test 1.1 - dialog is open)
2. Click "Cancel" button
3. **Expected Result:**
   - ✅ Dialog closes
   - ✅ Uploaded file is STILL visible in "Files Ready"
   - ✅ Interface returns to ready state
   - ✅ No toast notification

**Result:** [ ] PASS [ ] FAIL
**Notes:** ___________________________________________

---

### Test 1.3: Dialog "Reset" Button Works
**Steps:**
1. Drag and drop a PDF file onto upload zone
2. Click "Process Another" button
3. Dialog appears
4. Click "Reset" button
5. **Expected Result:**
   - ✅ Dialog closes
   - ✅ File DISAPPEARS from "Files Ready" section
   - ✅ Toast notification appears (top-right corner): "Ready for next file"
   - ✅ Toast message: "Interface reset. You can upload a new PDF now."
   - ✅ Toast is GREEN (success variant)
   - ✅ Toast disappears after ~3 seconds

**Result:** [ ] PASS [ ] FAIL
**Notes:** ___________________________________________

---

### Test 1.4: Dialog Does NOT Appear After Successful Conversion
**Steps:**
1. Upload a PDF file
2. Select output format (PowerPoint)
3. Click "Convert to PowerPoint"
4. **Wait for conversion to complete** (Progress bar → 100%)
5. Download button appears
6. Click "Process Another" button
7. **Expected Result:**
   - ❌ NO DIALOG appears (immediate reset)
   - ✅ Files clear immediately
   - ✅ Toast notification appears: "Ready for next file"
   - ✅ Interface returns to clean state

**Result:** [ ] PASS [ ] FAIL
**Notes:** ___________________________________________

---

## 🧪 TEST SUITE 2: BUTTON DISABLED STATE

### Test 2.1: "Process Another" Disabled During Conversion
**Steps:**
1. Upload a PDF file
2. Select output format (PowerPoint)
3. Click "Convert to PowerPoint"
4. **While progress bar is animating (20%, 40%, etc.):**
5. Try to click "Process Another" button
6. **Expected Result:**
   - ✅ Button is GRAYED OUT (disabled state)
   - ✅ Cursor changes to "not-allowed" when hovering
   - ✅ Click does nothing
   - ✅ Conversion continues uninterrupted

**Result:** [ ] PASS [ ] FAIL
**Notes:** ___________________________________________

---

### Test 2.2: Button Re-enables After Conversion
**Steps:**
1. (Continue from Test 2.1 - conversion completes)
2. Progress reaches 100%
3. Download button appears
4. **Expected Result:**
   - ✅ "Process Another" button is now ENABLED (white, clickable)
   - ✅ Hover shows normal cursor
   - ✅ Button can be clicked

**Result:** [ ] PASS [ ] FAIL
**Notes:** ___________________________________________

---

## 🧪 TEST SUITE 3: ERROR STATE HANDLING

### Test 3.1: Errors Clear Properly After Reset
**Steps:**
1. Upload a very small text file (not a PDF) - e.g., create test.txt
2. Try to convert it
3. **Expected:** Error message appears (red alert box)
4. Error says something like "Invalid file type" or "PDF only"
5. Click any error recovery button ("Start Over", "Try Different File", etc.)
6. **Expected Result:**
   - ✅ Error message COMPLETELY DISAPPEARS
   - ✅ No red alert box visible
   - ✅ Toast notification appears: "Ready for next file"
   - ✅ Upload zone is clean and ready
   - ✅ No lingering error text anywhere

**Result:** [ ] PASS [ ] FAIL
**Notes:** ___________________________________________

---

### Test 3.2: Simulated Network Error (Advanced)
**Steps:**
1. Upload a valid PDF file
2. **Open Browser DevTools (F12) → Network tab**
3. **Enable "Offline" mode** (simulates network failure)
4. Click "Convert to PowerPoint"
5. **Expected:** Network error appears
6. **Disable "Offline" mode in DevTools**
7. Click error recovery button ("Try Again" or "Start Over")
8. **Expected Result:**
   - ✅ Error clears
   - ✅ Interface resets cleanly
   - ✅ Toast appears confirming reset

**Result:** [ ] PASS [ ] FAIL
**Notes:** ___________________________________________

---

## 🧪 TEST SUITE 4: TOAST NOTIFICATION QUALITY

### Test 4.1: Toast Visual Design
**Steps:**
1. Upload a file → Reset (with dialog)
2. When toast appears, observe carefully
3. **Expected Result:**
   - ✅ Toast position: Top-right corner of screen
   - ✅ Toast color: Green background (success variant)
   - ✅ Toast title: "Ready for next file" (bold)
   - ✅ Toast description: "Interface reset. You can upload a new PDF now."
   - ✅ Toast has close button (X icon)
   - ✅ Toast auto-dismisses after ~3 seconds
   - ✅ Toast animation: Slides in smoothly from right

**Result:** [ ] PASS [ ] FAIL
**Notes:** ___________________________________________

---

### Test 4.2: Toast Doesn't Block UI
**Steps:**
1. Trigger a toast (upload → reset)
2. While toast is visible, try to interact with the page
3. **Expected Result:**
   - ✅ Can still upload files
   - ✅ Can click buttons
   - ✅ Can navigate
   - ✅ Toast doesn't block interactions

**Result:** [ ] PASS [ ] FAIL
**Notes:** ___________________________________________

---

## 🧪 TEST SUITE 5: RAPID USER ACTIONS (STRESS TEST)

### Test 5.1: Rapid Clicks Don't Break State
**Steps:**
1. Upload a file
2. Rapidly click "Process Another" button 5 times quickly
3. **Expected Result:**
   - ✅ Dialog appears only ONCE
   - ✅ Multiple clicks don't open multiple dialogs
   - ✅ State remains consistent
   - ✅ No JavaScript errors in console

**Result:** [ ] PASS [ ] FAIL
**Notes:** ___________________________________________

---

### Test 5.2: Upload → Reset → Upload → Reset (Cycle)
**Steps:**
1. Upload file A
2. Click "Process Another" → Confirm reset
3. Toast appears → Wait for it to disappear
4. Upload file B
5. Click "Process Another" → Confirm reset
6. Repeat 3 more times
7. **Expected Result:**
   - ✅ Works consistently every time
   - ✅ No memory leaks (DevTools → Performance)
   - ✅ No duplicate toasts
   - ✅ Each reset is clean

**Result:** [ ] PASS [ ] FAIL
**Notes:** ___________________________________________

---

## 🧪 TEST SUITE 6: ACCESSIBILITY

### Test 6.1: Keyboard Navigation
**Steps:**
1. Upload a file
2. **Do NOT use mouse** - only keyboard
3. Press TAB key until "Process Another" button is focused
4. Press ENTER
5. Dialog appears
6. Press TAB to navigate between "Cancel" and "Reset"
7. Press ENTER on "Cancel"
8. **Expected Result:**
   - ✅ Can navigate with TAB key
   - ✅ Focus indicators visible
   - ✅ ENTER key activates buttons
   - ✅ ESC key closes dialog

**Result:** [ ] PASS [ ] FAIL
**Notes:** ___________________________________________

---

### Test 6.2: Screen Reader Compatibility (If Available)
**Steps:**
1. Enable screen reader (NVDA/JAWS on Windows, VoiceOver on Mac)
2. Upload a file
3. Tab to "Process Another" button
4. **Expected Result:**
   - ✅ Screen reader announces button label
   - ✅ Announces disabled state during conversion
   - ✅ Announces dialog content when opened
   - ✅ Announces toast message

**Result:** [ ] PASS [ ] FAIL
**Notes:** ___________________________________________

---

## 🧪 TEST SUITE 7: BROWSER CONSOLE (CRITICAL)

### Test 7.1: Zero JavaScript Errors
**Steps:**
1. Open Browser DevTools (F12) → Console tab
2. **Clear console** (trash icon)
3. Perform Tests 1.1 through 6.2
4. Check console throughout
5. **Expected Result:**
   - ✅ NO red errors
   - ✅ NO warnings about React hooks
   - ✅ NO "Cannot read property..." errors
   - ✅ Maybe some info logs (OK)

**Result:** [ ] PASS [ ] FAIL
**Error Messages (if any):** ___________________________________________

---

## 📊 TEST SUMMARY

### Overall Results

| Test Suite | Pass | Fail | N/A |
|------------|------|------|-----|
| Suite 1: Confirmation Dialog | __ / 4 | __ / 4 | __ / 4 |
| Suite 2: Button Disabled | __ / 2 | __ / 2 | __ / 2 |
| Suite 3: Error Handling | __ / 2 | __ / 2 | __ / 2 |
| Suite 4: Toast Quality | __ / 2 | __ / 2 | __ / 2 |
| Suite 5: Stress Testing | __ / 2 | __ / 2 | __ / 2 |
| Suite 6: Accessibility | __ / 2 | __ / 2 | __ / 2 |
| Suite 7: Console Errors | __ / 1 | __ / 1 | __ / 1 |
| **TOTAL** | **__ / 15** | **__ / 15** | **__ / 15** |

---

## ✅ ACCEPTANCE CRITERIA

**PASS Threshold:** 14/15 tests pass (93%)
**CRITICAL Tests (Must Pass):**
- Test 1.1: Dialog appears
- Test 1.3: Reset button works
- Test 2.1: Button disabled during processing
- Test 3.1: Errors clear properly
- Test 7.1: Zero console errors

---

## 🐛 BUG REPORTING

**If any test fails, document here:**

**Test ID:** ___________
**Description:** ___________
**Steps to Reproduce:** ___________
**Expected:** ___________
**Actual:** ___________
**Screenshot/Console Error:** ___________

---

## 📝 TESTER SIGN-OFF

**Tested By:** ___________
**Date:** ___________
**Time Spent:** ___________
**Overall Assessment:** [ ] PRODUCTION READY [ ] NEEDS FIXES [ ] BLOCKED

**Recommendation:**
___________________________________________________________________________

**Additional Notes:**
___________________________________________________________________________

---

## 🎯 TECHNICAL PANEL NOTES

**Panel Members Can Use This Space:**

**Quinn (QA):** ___________
**Winston (Architect):** ___________
**James (Developer):** ___________
**Morgan (UX):** ___________

---

**END OF MANUAL TEST GUIDE**
