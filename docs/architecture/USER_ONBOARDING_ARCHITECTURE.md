# User Onboarding Flow Architecture

**Version**: v1.3.0 (Phase 2)
**Created**: November 12, 2025
**Priority**: HIGH (3x activation rate expected)
**Goal**: Increase new user activation from 30% → 90%

---

## Overview

The User Onboarding Flow is a multi-step, interactive experience that guides new users through PDFLab's core features and encourages their first conversion. It consists of four components:

1. **Interactive Product Tour** - In-app tooltips and overlays
2. **Sample Conversion Templates** - Pre-loaded PDF examples
3. **Quick-Start Wizard** - Step-by-step first conversion
4. **Email Drip Campaign** - 5 emails over 14 days

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER REGISTRATION                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              ONBOARDING INITIALIZATION                       │
│  - Create onboarding_progress record (status: not_started)  │
│  - Send welcome email (immediate)                            │
│  - Redirect to /dashboard?onboarding=true                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            INTERACTIVE PRODUCT TOUR (In-App)                 │
│                                                               │
│  Step 1: Welcome Modal                                       │
│    "Welcome to PDFLab! Let's get you started"               │
│    [Start Tour] [Skip for Now]                              │
│                                                               │
│  Step 2: Dashboard Overview                                  │
│    Tooltip → "This is your dashboard"                       │
│    Highlight → Conversion interface                          │
│                                                               │
│  Step 3: Upload Area                                         │
│    Tooltip → "Drag & drop PDFs here"                        │
│    Highlight → Upload zone                                   │
│                                                               │
│  Step 4: Format Selection                                    │
│    Tooltip → "Choose your output format"                    │
│    Highlight → Format buttons                                │
│                                                               │
│  Step 5: Sample Templates                                    │
│    Tooltip → "Try a sample conversion"                      │
│    Highlight → Sample templates button                       │
│                                                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           SAMPLE CONVERSION TEMPLATES                        │
│                                                               │
│  Template 1: "Invoice.pdf" → XLSX                           │
│    Preview: Sample invoice table                             │
│    [Try This Template]                                       │
│                                                               │
│  Template 2: "Report.pdf" → DOCX                            │
│    Preview: Sample business report                           │
│    [Try This Template]                                       │
│                                                               │
│  Template 3: "Presentation.pdf" → PPTX                      │
│    Preview: Sample slide deck                                │
│    [Try This Template]                                       │
│                                                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              QUICK-START WIZARD                              │
│                                                               │
│  Step 1: Choose Template or Upload                          │
│    ○ Use sample template                                     │
│    ○ Upload my own PDF                                       │
│    [Next]                                                     │
│                                                               │
│  Step 2: Select Format                                       │
│    Recommended based on PDF content:                         │
│    ✓ XLSX (Best for tables/invoices)                        │
│    ○ DOCX (Best for documents)                              │
│    ○ PPTX (Best for slides)                                 │
│    [Next]                                                     │
│                                                               │
│  Step 3: Start Conversion                                    │
│    Preview: "Invoice.pdf" (250 KB)                          │
│    Output: XLSX                                              │
│    [Start Conversion]                                        │
│                                                               │
│  Step 4: Processing...                                       │
│    Progress bar + Tips:                                      │
│    "💡 Did you know? You can convert up to 50 files at once"│
│                                                               │
│  Step 5: Success!                                            │
│    "🎉 Your first conversion is complete!"                  │
│    [Download File] [Convert Another]                        │
│                                                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           ONBOARDING COMPLETE                                │
│  - Update onboarding_progress (status: completed)           │
│  - Award achievement badge                                   │
│  - Show "Explore More Features" modal                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│           EMAIL DRIP CAMPAIGN (Background)                   │
│                                                               │
│  Day 0: Welcome Email (immediate)                           │
│    Subject: "Welcome to PDFLab! 🎉"                         │
│    Content: Account created, quick start guide              │
│                                                               │
│  Day 2: Feature Highlight #1                                │
│    Subject: "Convert PDFs to XLSX in seconds"               │
│    Content: Table extraction demo, CTA to try               │
│                                                               │
│  Day 5: Feature Highlight #2                                │
│    Subject: "Batch convert 50 files at once"                │
│    Content: Batch processing demo, upgrade CTA              │
│                                                               │
│  Day 9: Social Proof                                        │
│    Subject: "Join 10,000+ users converting PDFs daily"      │
│    Content: Testimonials, use cases, success stories        │
│                                                               │
│  Day 14: Upgrade Prompt                                     │
│    Subject: "Unlock unlimited conversions"                  │
│    Content: Plan comparison, upgrade benefits, discount     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### New Table: `onboarding_progress`

```sql
CREATE TABLE onboarding_progress (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  status ENUM('not_started', 'in_progress', 'completed', 'skipped') DEFAULT 'not_started',

  -- Progress tracking
  tour_completed BOOLEAN DEFAULT FALSE,
  tour_step_completed INT DEFAULT 0,
  tour_last_seen_at TIMESTAMP NULL,

  first_conversion_completed BOOLEAN DEFAULT FALSE,
  first_conversion_at TIMESTAMP NULL,

  wizard_started BOOLEAN DEFAULT FALSE,
  wizard_completed BOOLEAN DEFAULT FALSE,
  wizard_last_step INT DEFAULT 0,

  sample_template_used VARCHAR(50) NULL,

  -- Email tracking
  email_day0_sent BOOLEAN DEFAULT FALSE,
  email_day2_sent BOOLEAN DEFAULT FALSE,
  email_day5_sent BOOLEAN DEFAULT FALSE,
  email_day9_sent BOOLEAN DEFAULT FALSE,
  email_day14_sent BOOLEAN DEFAULT FALSE,

  email_day2_opened BOOLEAN DEFAULT FALSE,
  email_day5_opened BOOLEAN DEFAULT FALSE,
  email_day9_opened BOOLEAN DEFAULT FALSE,
  email_day14_opened BOOLEAN DEFAULT FALSE,

  -- Metadata
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  skipped_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

### New Table: `onboarding_templates`

```sql
CREATE TABLE onboarding_templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_size INT NOT NULL,
  recommended_format ENUM('pptx', 'docx', 'xlsx', 'png') NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'invoice', 'report', 'presentation'
  preview_image VARCHAR(255) NULL,
  usage_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_category (category),
  INDEX idx_is_active (is_active)
);
```

---

## Backend API Endpoints

### Onboarding Progress

**GET /api/onboarding/progress**
- Returns: User's onboarding progress
- Auth: Required
- Response:
```json
{
  "status": "in_progress",
  "tour_completed": false,
  "tour_step_completed": 2,
  "first_conversion_completed": false,
  "wizard_last_step": 1,
  "completion_percentage": 40
}
```

**POST /api/onboarding/update**
- Updates: Onboarding progress
- Auth: Required
- Body:
```json
{
  "tour_step_completed": 3,
  "wizard_started": true
}
```

**POST /api/onboarding/complete**
- Marks: Onboarding as completed
- Auth: Required
- Awards: Achievement badge

**POST /api/onboarding/skip**
- Marks: Onboarding as skipped
- Auth: Required

### Sample Templates

**GET /api/onboarding/templates**
- Returns: List of sample conversion templates
- Auth: Optional (public)
- Response:
```json
{
  "templates": [
    {
      "id": "template_invoice",
      "name": "Sample Invoice",
      "description": "Convert invoice tables to Excel",
      "category": "invoice",
      "recommended_format": "xlsx",
      "preview_image": "/templates/invoice_preview.png"
    }
  ]
}
```

**POST /api/onboarding/templates/:id/convert**
- Converts: Sample template (doesn't count toward quota)
- Auth: Required
- Response: Standard conversion job

---

## Frontend Components

### 1. OnboardingProvider (Context)

**File**: `contexts/OnboardingContext.tsx`

```typescript
interface OnboardingProgress {
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped'
  tourCompleted: boolean
  tourStepCompleted: number
  firstConversionCompleted: boolean
  wizardLastStep: number
  completionPercentage: number
}

interface OnboardingContextType {
  progress: OnboardingProgress | null
  isLoading: boolean
  startTour: () => void
  completeTourStep: (step: number) => void
  skipOnboarding: () => void
  completeOnboarding: () => void
  showWizard: boolean
  setShowWizard: (show: boolean) => void
}
```

### 2. ProductTour Component

**File**: `components/onboarding/ProductTour.tsx`

**Features**:
- Spotlight overlay (dark background with highlighted element)
- Tooltip positioning (top, bottom, left, right, auto)
- Progress indicator (Step 1 of 5)
- Skip/Next/Previous buttons
- Keyboard navigation (ESC to skip, Arrow keys to navigate)
- Responsive design
- localStorage persistence (don't show again if skipped)

**Technology**:
- Option 1: `react-joyride` library (recommended)
- Option 2: Custom implementation with `framer-motion`

### 3. QuickStartWizard Component

**File**: `components/onboarding/QuickStartWizard.tsx`

**Features**:
- Multi-step form with progress bar
- Sample template selection
- Format recommendation engine
- Real-time conversion
- Success celebration animation
- "What's Next" suggestions

### 4. SampleTemplates Component

**File**: `components/onboarding/SampleTemplates.tsx`

**Features**:
- Grid layout with preview cards
- Category filtering (Invoice, Report, Presentation)
- One-click conversion
- Preview modal with larger image
- Usage stats ("1,234 users have tried this")

### 5. OnboardingBadge Component

**File**: `components/onboarding/OnboardingBadge.tsx`

**Features**:
- Progress indicator in navigation
- Tooltip showing completion percentage
- Clickable to resume onboarding
- Celebratory animation when completed

---

## Email Drip Campaign

### Email Schedule & Content

#### Day 0: Welcome Email (EXISTING - Enhanced)

**Subject**: "Welcome to PDFLab! 🎉 Let's get started"

**Content**:
```html
Hi [Name]!

Welcome to PDFLab! We're excited to have you on board.

Your account is ready, and you have 3 free conversions to get started.

Quick Start Guide:
1. Upload your PDF (or try a sample template)
2. Choose output format (PPTX, DOCX, XLSX, PNG)
3. Download your converted file

[Start Converting Now] (CTA button)

Need help? Reply to this email or visit our support page.

Best,
The PDFLab Team
```

#### Day 2: Feature Highlight #1 (NEW)

**Subject**: "Convert PDFs to Excel in seconds ⚡"

**Trigger**: If user hasn't completed first conversion

**Content**:
```html
Hi [Name],

Did you know PDFLab can extract tables from your PDFs and convert them to editable Excel spreadsheets?

Perfect for:
- Invoices → Accounting software
- Financial reports → Data analysis
- Pricing lists → Inventory management

[Try Sample Invoice Conversion] (CTA button)

See it in action: [Watch 30-second demo video]

Best,
The PDFLab Team
```

#### Day 5: Feature Highlight #2 (NEW)

**Subject**: "Batch convert 50 files at once 🚀"

**Trigger**: If user completed 1 conversion but hasn't upgraded

**Content**:
```html
Hi [Name],

Great job on your first conversion! 🎉

Did you know you can convert up to 50 PDFs at once with our Starter plan?

Batch Processing Features:
✓ Convert multiple files simultaneously
✓ ZIP download all converted files
✓ Save hours of manual work

Current plan: Free (3 conversions/month)
Upgrade to Starter: 100 conversions/month for $9.99

[Upgrade to Starter Plan] (CTA button)

Best,
The PDFLab Team
```

#### Day 9: Social Proof (NEW)

**Subject**: "Join 10,000+ users converting PDFs daily 📈"

**Trigger**: If user hasn't upgraded after 9 days

**Content**:
```html
Hi [Name],

You're part of a growing community of 10,000+ professionals using PDFLab to streamline their document workflows.

What our users say:

"PDFLab saved me 5 hours per week on invoice processing"
- Sarah K., Accountant

"The batch conversion feature is a game-changer"
- Mike T., Project Manager

"Best PDF converter I've used, and I've tried them all"
- Lisa R., Office Manager

See what's possible: [View Use Cases]

Best,
The PDFLab Team
```

#### Day 14: Upgrade Prompt (NEW)

**Subject**: "Unlock unlimited conversions 🔓 (20% off)"

**Trigger**: If user still on free plan after 14 days

**Content**:
```html
Hi [Name],

You've been with us for 2 weeks now! To celebrate, we're offering you 20% off any paid plan.

Free Plan Limitations:
- 3 conversions/month
- 10MB file size limit

Starter Plan Benefits:
- 100 conversions/month
- 25MB file size limit
- Priority processing
- Batch conversion

Pro Plan Benefits:
- Unlimited conversions
- 100MB file size limit
- Advanced features
- Premium support

[Upgrade Now - Save 20%] (CTA button)

Use code: WELCOME20 at checkout

Offer expires in 48 hours.

Best,
The PDFLab Team
```

---

## Background Jobs

### Email Drip Campaign Job

**File**: `backend/src/jobs/onboarding-email.job.ts`

**Schedule**: Run daily at 9:00 AM (user's timezone)

**Logic**:
```typescript
// Find users who need emails
const usersForDay2Email = await OnboardingProgress.findAll({
  where: {
    email_day2_sent: false,
    created_at: {
      [Op.gte]: moment().subtract(2, 'days').toDate(),
      [Op.lt]: moment().subtract(2, 'days').add(1, 'hour').toDate()
    }
  }
})

// Send emails
for (const progress of usersForDay2Email) {
  await emailService.sendOnboardingDay2Email(user.email)
  await progress.update({ email_day2_sent: true })
}
```

---

## Analytics & Metrics

### Key Performance Indicators (KPIs)

1. **Activation Rate**
   - Target: 30% → 90%
   - Measurement: % users who complete first conversion

2. **Tour Completion Rate**
   - Target: 70%+
   - Measurement: % users who complete product tour

3. **Template Usage Rate**
   - Target: 40%+
   - Measurement: % users who try sample templates

4. **Email Open Rate**
   - Target: 35%+ (industry average: 20%)
   - Measurement: % users who open drip emails

5. **Email Click Rate**
   - Target: 8%+ (industry average: 2.5%)
   - Measurement: % users who click CTA in emails

6. **Upgrade Conversion Rate**
   - Target: 5%+
   - Measurement: % users who upgrade within 14 days

### Analytics Events

```typescript
// Track onboarding events
analytics.track('onboarding_started', { userId, timestamp })
analytics.track('tour_step_completed', { userId, step, timestamp })
analytics.track('sample_template_used', { userId, templateId, timestamp })
analytics.track('first_conversion_completed', { userId, format, timestamp })
analytics.track('onboarding_completed', { userId, durationDays, timestamp })
analytics.track('onboarding_skipped', { userId, atStep, timestamp })
```

---

## Implementation Plan

### Phase 1: Backend Foundation (2 days)
- [x] Design architecture
- [ ] Create database migrations
- [ ] Implement onboarding_progress model
- [ ] Implement onboarding_templates model
- [ ] Create API endpoints
- [ ] Seed sample templates
- [ ] Test API endpoints

### Phase 2: Frontend Core (3 days)
- [ ] Install react-joyride library
- [ ] Create OnboardingContext
- [ ] Build ProductTour component
- [ ] Build SampleTemplates component
- [ ] Build QuickStartWizard component
- [ ] Integrate with dashboard

### Phase 3: Email Campaign (2 days)
- [ ] Create email templates (5 emails)
- [ ] Implement email drip job
- [ ] Schedule cron job
- [ ] Test email delivery
- [ ] Add email tracking (opens, clicks)

### Phase 4: Testing & Polish (2 days)
- [ ] E2E testing with Playwright
- [ ] A/B test different tour flows
- [ ] Optimize email copy
- [ ] Add analytics tracking
- [ ] User acceptance testing

### Phase 5: Deployment (1 day)
- [ ] Deploy database migrations
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Verify email cron job
- [ ] Monitor activation rate

**Total Estimated Time**: 10 days (2 weeks)

---

## Success Criteria

**Metrics** (measured 30 days post-launch):
- ✅ New user activation rate increases from 30% → 70%+
- ✅ Tour completion rate > 60%
- ✅ Email open rate > 30%
- ✅ First conversion time < 10 minutes (from signup)
- ✅ Upgrade conversion rate > 3%

**User Feedback** (qualitative):
- ✅ 80%+ users find onboarding helpful (survey)
- ✅ < 5% users report onboarding as annoying
- ✅ Reduced support tickets about "how to use PDFLab"

---

## Future Enhancements

1. **Personalized Tour** - Based on user's industry/use case
2. **Video Tutorials** - Embedded walkthrough videos
3. **Interactive Playground** - Sandbox mode with unlimited sample conversions
4. **Gamification** - Achievements, streaks, leaderboard
5. **AI Assistant** - Chatbot to answer questions during onboarding
6. **Multi-language Support** - Localized tours and emails
7. **Mobile Onboarding** - Optimized for mobile/tablet

---

**Last Updated**: November 12, 2025
**Owner**: Phase 2 Implementation Team
**Status**: 🚧 Design Complete - Implementation Pending
**Priority**: HIGH
