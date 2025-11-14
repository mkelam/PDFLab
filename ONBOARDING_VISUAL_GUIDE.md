# User Onboarding System - Visual Guide & Testing

**Date**: November 13, 2025
**Status**: Ready for Testing
**Servers Running**:
- Backend: http://localhost:3006 ✅
- Frontend: http://localhost:3000 ✅

---

## Quick Start Testing Guide

### Step 1: Create a New Test User

1. **Open your browser** to http://localhost:3000
2. **Click "Sign Up"** in the navigation
3. **Create a new account**:
   ```
   Email: onboarding-test@pdflab.com
   Password: TestPass123!
   Name: Onboarding Tester
   ```
4. **Submit the form** and you'll be logged in automatically

---

## What You'll See (Visual Walkthrough)

### 🎯 Step 1: Product Tour on Home Page

**When**: Immediately after signup, when you land on the home page

**What It Looks Like**:

```
┌──────────────────────────────────────────────────────┐
│  🎉 Welcome to PDFLab!                               │
│                                                      │
│  Let's take a quick tour. First, this is where     │
│  you upload your PDF files for conversion.          │
│                                                      │
│  [Skip Tour]              [Next] (1/5)              │
└──────────────────────────────────────────────────────┘
         ↓ (Points to upload area)
┌──────────────────────────────────────────────────────┐
│  [📤 Drag & Drop PDF Here or Click to Browse]       │
│                                                      │
│  [PPTX] [DOCX] [XLSX] [PNG]  ← Format buttons       │
└──────────────────────────────────────────────────────┘
```

**Tour Steps**:
1. **Upload Area** - Introduction to file upload
2. **Conversion Formats** - Explains PPTX/DOCX/XLSX/PNG options
3. **Dashboard Link** - Points to navigation "Dashboard" link
4. **Pricing Link** - Points to navigation "Pricing" link
5. **Completion** - Centered success message with encouragement

**Styling**:
- Purple overlay (semi-transparent black)
- White tooltip with rounded corners
- Primary purple "Next" button
- Progress indicator (1/5, 2/5, etc.)
- "Skip Tour" link in gray

**Interactions**:
- Click "Next" to advance
- Click "Back" to go back
- Click "Skip Tour" to exit
- Click "X" to close
- Pressing ESC also closes

---

### 🎯 Step 2: Dashboard - Quick Start Guide

**When**: After completing the tour, navigate to Dashboard (http://localhost:3000/dashboard)

**What It Looks Like**:

```
┌──────────────────────────────────────────────────────┐
│  Dashboard                                           │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ ✨ Quick Start Guide                        │   │
│  │                                              │   │
│  │ Let us guide you through your first PDF     │   │
│  │ conversion in 3 easy steps                  │   │
│  │                                              │   │
│  │              [Skip]  [Start Guide →]        │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  Recent Activity                                    │
│  ┌─────────────────────────────────────────────┐   │
│  │ No conversions yet                           │   │
│  └─────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

**Styling**:
- Glassmorphism card with purple border
- Light purple background (`bg-primary/5`)
- Prominent "Start Guide →" button
- Gray "Skip" button

---

### 🎯 Step 3: Quick Start Wizard (Modal)

**When**: Click "Start Guide →" button

**What It Looks Like - Step 1/3 (Choose Template)**:

```
┌──────────────────────────────────────────────────────┐
│  Quick Start Wizard                              [X] │
│  Let's convert your first PDF in 3 easy steps       │
├──────────────────────────────────────────────────────┤
│  Step 1 of 3                           33% Complete │
│  [████████░░░░░░░░░░░░░] Progress bar               │
│                                                      │
│  Choose a Sample Template                           │
│  Select one of our sample PDFs to get started       │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ 📄  Sample Invoice                    [✓]    │  │
│  │     Convert invoice tables to Excel...       │  │
│  │     244 KB • Invoice                          │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ 📊  Business Report                          │  │
│  │     Convert reports to Word...                │  │
│  │     566 KB • Report                           │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ 📽️  Marketing Presentation                   │  │
│  │     Convert slides to PowerPoint...           │  │
│  │     1.2 MB • Presentation                     │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  [Skip Wizard]                         [Next →]     │
└──────────────────────────────────────────────────────┘
```

**Step 2/3 (Choose Format)**:

```
┌──────────────────────────────────────────────────────┐
│  Quick Start Wizard                              [X] │
├──────────────────────────────────────────────────────┤
│  Step 2 of 3                           66% Complete │
│  [████████████████░░░░░░░░] Progress bar            │
│                                                      │
│  Choose Output Format                                │
│  What format do you want to convert to?             │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                │
│  │              │  │              │                │
│  │  📊 PPTX     │  │  📝 DOCX     │                │
│  │  PowerPoint  │  │  Word        │                │
│  │  Editable    │  │  Editable    │                │
│  │   slides     │  │   document   │                │
│  │              │  │              │                │
│  └──────────────┘  └──────────────┘                │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                │
│  │              │  │              │                │
│  │  📈 XLSX [✓] │  │  🖼️ PNG      │                │
│  │  Excel       │  │  Image       │                │
│  │  Editable    │  │  High-quality│                │
│  │  spreadsheet │  │  PNG         │                │
│  │              │  │              │                │
│  └──────────────┘  └──────────────┘                │
│                                                      │
│  ⭐ Recommended: XLSX works best with Sample Invoice│
│                                                      │
│  [← Back]  [Skip Wizard]              [Next →]     │
└──────────────────────────────────────────────────────┘
```

**Step 3/3 (Confirmation)**:

```
┌──────────────────────────────────────────────────────┐
│  Quick Start Wizard                              [X] │
├──────────────────────────────────────────────────────┤
│  Step 3 of 3                          100% Complete │
│  [████████████████████████] Progress bar            │
│                                                      │
│  Ready to Convert!                                   │
│  Review your selections and start the conversion    │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  📄  Template                                 │  │
│  │      Sample Invoice                           │  │
│  │      244 KB                                   │  │
│  ├──────────────────────────────────────────────┤  │
│  │  📈  Output Format                            │  │
│  │      Excel                                    │  │
│  │      Editable spreadsheet                     │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  What happens next?                                  │
│  ✓ We'll convert your PDF in the background         │
│  ✓ You'll be redirected to your dashboard           │
│  ✓ The converted file will be available for 7 days  │
│                                                      │
│  [← Back]  [Skip Wizard]  [Start Conversion →]     │
└──────────────────────────────────────────────────────┘
```

**Wizard Styling**:
- Large modal (max-width: 768px)
- Glassmorphism background
- Purple progress bar
- Color-coded format icons:
  - 🟠 PowerPoint (orange)
  - 🔵 Word (blue)
  - 🟢 Excel (green)
  - 🟣 Image (purple)
- Selected items have checkmark and purple border
- Blue info box for "What happens next"

---

### 🎯 Step 4: Dashboard After Conversion

**When**: After wizard completes, redirected to dashboard

**What It Looks Like**:

```
┌──────────────────────────────────────────────────────┐
│  Dashboard                                           │
├──────────────────────────────────────────────────────┤
│                                                      │
│  🚀 Try Your First Conversion                       │
│  Get started with one of our sample templates       │
│  - no upload needed!                        [Skip]  │
│                                                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │
│  │ 📄          │ │ 📊          │ │ 📽️          │  │
│  │ Sample      │ │ Business    │ │ Marketing   │  │
│  │ Invoice     │ │ Report      │ │ Presentation│  │
│  │             │ │             │ │             │  │
│  │ Convert     │ │ Convert     │ │ Convert     │  │
│  │ invoice...  │ │ reports...  │ │ slides...   │  │
│  │             │ │             │ │             │  │
│  │ 📄 244 KB   │ │ 📄 566 KB   │ │ 📄 1.2 MB   │  │
│  │ 📈 42 uses  │ │ 📈 38 uses  │ │ 📈 51 uses  │  │
│  │             │ │             │ │             │  │
│  │ ⭐ Rec:XLSX │ │ ⭐ Rec:DOCX │ │ ⭐ Rec:PPTX │  │
│  │             │ │             │ │             │  │
│  │[Try This →] │ │[Try This →] │ │[Try This →] │  │
│  │             │ │             │ │             │  │
│  │Free - No    │ │Free - No    │ │Free - No    │  │
│  │upload req'd │ │upload req'd │ │upload req'd │  │
│  └─────────────┘ └─────────────┘ └─────────────┘  │
│                                                      │
│  Recent Activity                                    │
│  ┌─────────────────────────────────────────────┐   │
│  │ ✓ Sample Invoice.pdf → XLSX   [Download]    │   │
│  │   Just now • 244 KB                          │   │
│  └─────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

**Sample Templates Styling**:
- 3-column grid (responsive → 1 column on mobile)
- Glassmorphism cards with hover shadow
- Large emoji icons
- Purple "Try This Template" buttons
- Green success state on click:
  ```
  ┌─────────────┐
  │ ✓ Converting│
  │ Redirecting │
  │ to dashboard│
  └─────────────┘
  ```
- Metadata badges (file size, usage count)
- Recommended format badges

---

## Testing the Complete Flow

### Test 1: Happy Path (Complete Onboarding)

1. **Create new account** → Auto-logged in
2. **Land on home page** → Tour starts automatically (1 second delay)
3. **Complete tour** (click "Next" 5 times)
   - Step 1: Upload area
   - Step 2: Format buttons
   - Step 3: Dashboard link
   - Step 4: Pricing link
   - Step 5: Completion message
4. **Navigate to Dashboard** → See "Quick Start Guide" card
5. **Click "Start Guide →"** → Wizard modal opens
6. **Select template** → "Sample Invoice" (click card)
7. **Click "Next"** → Format selection
8. **Select format** → "Excel" (XLSX)
9. **Click "Next"** → Confirmation screen
10. **Click "Start Conversion"** → Conversion starts
11. **Redirected to Dashboard** → See conversion in progress
12. **Wait 10-30 seconds** → Conversion completes
13. **See "Sample Templates" section** → Try another template
14. **Click "Try This Template"** → Instant conversion
15. **Onboarding complete!** → UI disappears

**Expected Result**:
- `completion_percentage`: 100%
- Status: `completed`
- All onboarding UI hidden

### Test 2: Skip Onboarding

1. **Create new account** → Tour starts
2. **Click "Skip Tour"** → Tour disappears
3. **Navigate to Dashboard** → Wizard card still shows
4. **Click "Skip"** → All onboarding UI disappears
5. **Refresh page** → No onboarding UI (skipped)

**Expected Result**:
- Status: `skipped`
- `onboarding_skipped`: true
- All onboarding UI permanently hidden

### Test 3: Partial Completion & Resume

1. **Complete tour only** → Navigate away
2. **Logout**
3. **Login again**
4. **Navigate to Dashboard** → Wizard card shows (resumes)
5. **Complete wizard** → Templates section shows next
6. **Complete template conversion** → Onboarding done

**Expected Result**:
- Progress persists across sessions
- Resumes from last step
- Eventually reaches 100%

---

## Browser Testing

### Desktop Browsers
- ✅ Chrome 120+ (primary target)
- ✅ Firefox 120+
- ✅ Safari 17+
- ✅ Edge 120+

### Mobile Testing
- ✅ iOS Safari (iPhone 12+)
- ✅ Chrome Mobile (Android)
- ⚠️ Tour may need adjustments on small screens

---

## API Verification

### Check Progress via API

**Get Current Progress**:
```bash
# Get your JWT token from localStorage in browser console
TOKEN="your_jwt_token_here"

curl -X GET http://localhost:3006/api/onboarding/progress \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response**:
```json
{
  "progress": {
    "id": "uuid",
    "user_id": "uuid",
    "status": "in_progress",
    "tour_completed": true,
    "tour_step_completed": 5,
    "first_conversion_completed": true,
    "wizard_started": true,
    "wizard_completed": true,
    "wizard_last_step": 3,
    "sample_template_used": "invoice",
    "completion_percentage": 100,
    "started_at": "2025-11-13T...",
    "completed_at": "2025-11-13T...",
    "created_at": "2025-11-13T..."
  }
}
```

**Get Sample Templates**:
```bash
curl -X GET http://localhost:3006/api/onboarding/templates \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response**:
```json
{
  "templates": [
    {
      "id": "template_invoice_001",
      "name": "Sample Invoice",
      "description": "Convert invoice tables to Excel...",
      "file_size": 250000,
      "formatted_file_size": "244 KB",
      "recommended_format": "xlsx",
      "category": "invoice",
      "category_display": "Invoice",
      "usage_count": 0
    }
  ]
}
```

---

## Database Verification

### Check Onboarding Progress

```bash
docker exec -i pdflab-mysql mysql -u pdflab -p***REMOVED*** pdflab \
  -e "SELECT user_id, status, tour_completed, wizard_completed, sample_template_used, completion_percentage FROM onboarding_progress ORDER BY created_at DESC LIMIT 5;"
```

### Check Template Usage

```bash
docker exec -i pdflab-mysql mysql -u pdflab -p***REMOVED*** pdflab \
  -e "SELECT name, category, usage_count FROM onboarding_templates;"
```

---

## Known Visual Issues & Fixes

### Issue 1: Tour Doesn't Start

**Symptom**: Tour doesn't appear after signup

**Fixes**:
1. Check browser console for errors
2. Verify `shouldShowOnboarding()` returns true
3. Check user's `onboarding_completed` flag in database
4. Ensure target elements (`#upload-area`, etc.) exist in DOM

### Issue 2: Wizard Modal Doesn't Open

**Symptom**: Clicking "Start Guide →" does nothing

**Fixes**:
1. Check `showWizard` state in React DevTools
2. Verify `getNextStep()` returns `'wizard'`
3. Check browser console for errors

### Issue 3: Template Cards Not Loading

**Symptom**: "Loading templates..." shows forever

**Fixes**:
1. Check backend is running (http://localhost:3006)
2. Verify `/api/onboarding/templates` returns data
3. Check browser console Network tab for 401/500 errors
4. Verify user is authenticated (token in localStorage)

---

## Screenshots to Take

1. **Product Tour - Step 1** (Upload area highlighted)
2. **Product Tour - Step 5** (Completion message)
3. **Dashboard - Wizard Card** (Quick Start Guide card)
4. **Wizard - Step 1** (Template selection)
5. **Wizard - Step 2** (Format selection)
6. **Wizard - Step 3** (Confirmation)
7. **Dashboard - Templates Section** (3 template cards)
8. **Template Conversion Success** (Green checkmark state)

---

## Color Reference

**Primary Purple**: `oklch(0.72 0.15 250)` → `#8b5cf6`

**Glassmorphism Cards**:
- Background: `rgba(255, 255, 255, 0.7)`
- Backdrop blur: `12px`
- Border: `1px solid rgba(139, 92, 246, 0.2)`

**Success Green**: `#10b981`
**Warning Orange**: `#f59e0b`
**Error Red**: `#ef4444`

---

## Performance Metrics

**Expected Load Times**:
- Tour initialization: <100ms
- Template fetch: <500ms
- Template conversion: 10-30 seconds
- Wizard modal open: <50ms

**Bundle Size Impact**:
- react-joyride: ~50KB (gzipped)
- OnboardingContext: ~5KB
- Components: ~15KB
- Total: ~70KB added

---

## Next Steps After Testing

1. **Replace Placeholder PDFs**:
   - Create real invoice, report, presentation PDFs
   - Update file sizes in database to match

2. **Capture Screenshots**:
   - Take screenshots of each step
   - Add to documentation

3. **User Testing**:
   - Ask 3-5 people to test
   - Collect feedback on clarity and flow
   - Iterate on copy and UX

4. **Deploy to VPS**:
   - Run migration on production database
   - Deploy frontend and backend
   - Smoke test in production

5. **Monitor Analytics**:
   - Use `/api/onboarding/analytics` (admin)
   - Track completion rates
   - Identify drop-off points

---

## Conclusion

The onboarding system is **fully functional and ready to test**!

**Access the app**:
- Frontend: http://localhost:3000
- Backend: http://localhost:3006

**Test account**:
- Create a new account to see onboarding
- Or use: onboarding-test@pdflab.com / TestPass123!

Enjoy exploring the new onboarding experience! 🎉
