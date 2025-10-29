# UX Audit - Full End-to-End Review

## Task Metadata
```yaml
id: ux-audit-full
title: Complete UX Audit
category: ux-analysis
elicit: true
output: Multiple deliverables (findings matrix, wireflows, copy deck, experiments, KPI model, accessibility checklist)
```

## Purpose
Perform a rigorous, comprehensive UX review of an existing application to identify friction, quantify impact, and propose high-leverage fixes that improve conversion completion rate, time-to-value, and user trust—without adding cognitive load.

## Prerequisites
- Access to the application (URL or codebase)
- Analytics data (if available)
- User feedback or support tickets (if available)
- Conversion funnel data (optional but valuable)

## Execution Steps

### Phase 1: Discovery & Context Gathering

**ELICIT from user:**
```
=== UX Audit Setup ===

1. Application Details:
   - Application name/URL:
   - Primary purpose (e.g., PDF to PowerPoint converter):
   - Target users (personas):
   - Current known issues or pain points:

2. Access & Data:
   - Do you have analytics access? (Y/N)
   - Current conversion rate (if known):
   - Average session duration (if known):
   - Top user complaints or support tickets:

3. Audit Focus:
   - Full audit or specific area? (Full / Specific flow)
   - If specific, which flow? (e.g., upload → conversion → download)
   - Any compliance requirements? (WCAG, GDPR, POPIA, etc.)

4. Business Goals:
   - Primary metric to improve:
   - Secondary metrics:
   - Timeline for implementation:
```

### Phase 2: Heuristic Evaluation

**For each stage of the user journey:**

1. **Acquisition → Landing**
   - Evaluate value proposition clarity
   - Assess CTA (Call-to-Action) prominence
   - Check trust signals (testimonials, security badges, reviews)
   - Measure time-to-comprehension
   - Identify friction in mental model formation

2. **Upload Flow**
   - Analyze upload affordance (drag-drop, button, both)
   - Check file format feedback (before/during/after)
   - Evaluate progress indicators
   - Test error states (wrong format, too large, corrupt)
   - Assess perceived performance

3. **Conversion Process**
   - Evaluate status visibility
   - Check time estimates accuracy
   - Analyze queue states and wait experience
   - Test recovery from failures
   - Assess transparency of process

4. **Paywall & Tier Gating**
   - Identify gate timing (too early vs too late)
   - Evaluate value communication
   - Check pricing clarity
   - Assess upgrade friction
   - Test free tier limitations UX

5. **Download/Share**
   - Evaluate success state clarity
   - Check download affordance
   - Test share functionality
   - Assess post-conversion options
   - Evaluate next-step suggestions

6. **Error & Edge Cases**
   - Document all error messages
   - Test timeout scenarios
   - Check retry mechanisms
   - Evaluate large file handling
   - Test corrupt file responses

### Phase 3: Accessibility Audit (WCAG 2.2 AA)

**Perceivable:**
- [ ] Text alternatives for non-text content
- [ ] Captions and alternatives for multimedia
- [ ] Content can be presented in different ways
- [ ] Content is distinguishable (color contrast 4.5:1 minimum)

**Operable:**
- [ ] All functionality available from keyboard
- [ ] Users have enough time to read and use content
- [ ] No content that causes seizures
- [ ] Users can navigate and find content
- [ ] Multiple ways to locate pages

**Understandable:**
- [ ] Text is readable and understandable
- [ ] Content appears and operates in predictable ways
- [ ] Users are helped to avoid and correct mistakes

**Robust:**
- [ ] Content is compatible with current and future tools
- [ ] Valid HTML/ARIA markup
- [ ] Status messages programmatically determined

### Phase 4: Microcopy Analysis

**Review all user-facing text:**
- Upload instructions and placeholders
- Progress messages and time estimates
- Error messages and recovery instructions
- Success confirmations
- Empty states and first-use guidance
- Tooltips and helper text
- Button labels and CTAs
- Paywall messaging
- Privacy notices

**Evaluate for:**
- Clarity (can users understand at a glance?)
- Tone (supportive, not blaming)
- Actionability (clear next steps)
- Brevity (no unnecessary words)
- Consistency (same terms throughout)

### Phase 5: Performance UX Analysis

**Evaluate perceived performance:**
- [ ] Initial page load time and skeleton states
- [ ] Upload feedback immediacy
- [ ] Progress indicator smoothness
- [ ] Prefetching strategies
- [ ] Caching effectiveness
- [ ] Optimistic UI patterns
- [ ] Loading state design quality

### Phase 6: Trust & Privacy Analysis

**POPIA/GDPR Compliance:**
- [ ] Clear privacy policy link
- [ ] Data usage transparency
- [ ] Cookie consent (if applicable)
- [ ] Data deletion options
- [ ] Terms of service accessibility

**Trust Signals:**
- [ ] Security badges and SSL indicators
- [ ] User testimonials/reviews
- [ ] Social proof (usage stats)
- [ ] Money-back guarantees
- [ ] Professional design quality

## Deliverable 1: Findings Matrix

Create a comprehensive findings table:

```markdown
| ID | Issue | Evidence | Severity | Impacted Metric | Recommended Fix | Rationale | Effort |
|----|-------|----------|----------|----------------|-----------------|-----------|--------|
| F001 | Upload button not prominent | Heat map shows users scanning for 8s avg | High | Upload CTR | Increase button size 2x, add drag-drop zone | Industry standard shows 3s max scan time | XS |
| F002 | Progress bar jumps backward | User complaint tickets (15/mo) | Critical | Trust, Completion | Use monotonic progress algorithm | Backward motion signals failure | S |
| ... | ... | ... | ... | ... | ... | ... | ... |
```

**Severity Levels:**
- **Critical**: Blocking users from completing core tasks, or significant trust/legal issues
- **High**: Major friction causing abandonment or confusion
- **Medium**: Noticeable friction but workarounds exist
- **Low**: Minor annoyances with minimal business impact
- **Enhancement**: Nice-to-have improvements

**Effort Scale:**
- **XS**: Hours (CSS/copy changes)
- **S**: Days (component modifications)
- **M**: Week (new component or flow)
- **L**: Weeks (major refactor)
- **XL**: Month+ (architectural changes)

## Deliverable 2: Wireflow (Actual vs Ideal)

Create side-by-side wireflows showing:

**Current Flow:**
```
Landing → [Scan 8s] → Upload → [Error: format?] → Re-upload →
[Wait: no status] → [Timeout?] → Retry → Download → [Success unclear]

Pain points marked with ⚠️
Decision points marked with ◆
Dead ends marked with ⛔
```

**Optimized Flow:**
```
Landing → [Scan <3s] → Upload (drag+drop) → [Instant feedback] →
[Progress + time est] → Preview → Download → [Clear success + next steps]

Δ Removed: format confusion, timeout anxiety
Δ Added: instant feedback, time estimates, preview
Δ Improved: visual hierarchy, status visibility
```

## Deliverable 3: Copy Deck

Replacement microcopy for critical moments:

### Upload Screen
**Current:** "Upload file"
**Recommended:** "Drop your PDF here or click to browse"
**Rationale:** Dual affordance + clear format expectation

### Progress
**Current:** "Processing..."
**Recommended:** "Converting your PDF (about 30 seconds left)"
**Rationale:** Time expectation reduces anxiety

### Error - Wrong Format
**Current:** "Error: Invalid file"
**Recommended:** "This looks like a [detected format]. We need a PDF file. Try again?"
**Rationale:** Explains what's wrong + suggests fix + keeps positive tone

### Paywall
**Current:** "Upgrade to Pro"
**Recommended:** "You've used your 3 free conversions this month. Upgrade for unlimited conversions + [benefit]"
**Rationale:** Transparency about limit + value proposition

### Success
**Current:** "Done"
**Recommended:** "Your PowerPoint is ready! Download now or email it to yourself"
**Rationale:** Clear success + multiple next actions

## Deliverable 4: Experiment Plan (3-5 A/B Tests)

### Experiment 1: Upload Affordance
- **Hypothesis**: Adding drag-drop zone with visual cues will increase upload initiation by 25%
- **Primary Metric**: % of landing page visitors who start upload
- **Secondary Metrics**: Time to first upload, bounce rate
- **Control**: Current upload button only
- **Variant**: Large drag-drop zone + upload button
- **Sample Size Proxy**: ~2,000 visitors per variant (detect 25% lift at 95% confidence)
- **Success Criteria**: >15% increase in upload initiation
- **Risk**: Low (purely additive change)

### Experiment 2: Progress Communication
- **Hypothesis**: Showing time estimates during conversion will reduce abandonment by 30%
- **Primary Metric**: Conversion completion rate (started → downloaded)
- **Secondary Metrics**: User satisfaction (survey), support tickets
- **Control**: Generic "Processing..." spinner
- **Variant**: Progress bar + time estimate ("about 30 seconds left")
- **Sample Size Proxy**: ~1,500 conversions per variant
- **Success Criteria**: >20% decrease in mid-conversion abandonment
- **Risk**: Medium (estimate accuracy critical)

### Experiment 3: Error Message Clarity
- **Hypothesis**: Actionable error messages will reduce error-recovery time by 40%
- **Primary Metric**: Time from error to successful upload
- **Secondary Metrics**: Re-upload success rate, support ticket reduction
- **Control**: "Error: Invalid file"
- **Variant**: "This looks like a [format]. We need a PDF. [Try again button]"
- **Sample Size Proxy**: ~500 error occurrences per variant
- **Success Criteria**: >25% faster recovery + 15% fewer support tickets
- **Risk**: Low (better communication always wins)

## Deliverable 5: KPI Impact Model

```markdown
| KPI | Current (Est.) | Optimized (Est.) | Change | Confidence | Business Impact |
|-----|----------------|------------------|--------|------------|-----------------|
| Upload→Convert CTR | 45% | 68% | +51% | High | +2,300 conversions/mo @ 10k visits |
| Conversion Success Rate | 78% | 92% | +18% | Medium | +560 successful conversions/mo |
| Avg. Time-to-Download | 3m 45s | 2m 15s | -40% | High | Improved user satisfaction |
| Abandonment @ Upload | 35% | 18% | -49% | High | +1,700 more uploads/mo |
| Abandonment @ Progress | 15% | 5% | -67% | Medium | +400 more completions/mo |
| Support Tickets (errors) | 120/mo | 45/mo | -63% | Medium | 75hrs saved/mo @ $50/hr = $3,750 |
| Refund/Chargeback Risk | 2.5% | 1.2% | -52% | Low | Estimated $X savings |
| User Trust Score | 6.2/10 | 8.1/10 | +31% | Low | Qualitative improvement |
```

**Assumptions:**
- Current: 10,000 monthly landing page visitors
- Industry benchmarks for document conversion tools
- User testing data (where available)
- Support ticket analysis

**ROI Calculation:**
- Implementation cost estimate: [To be determined]
- Monthly benefit: [Calculate from above]
- Payback period: [Cost / Monthly Benefit]

## Deliverable 6: Accessibility Checklist

```markdown
### WCAG 2.2 AA Compliance Audit

#### Perceivable
- [ ] **FAIL** - Upload button color contrast only 3.2:1 (needs 4.5:1)
  - **Action**: Change button background to #0066CC or darker
- [ ] **PASS** - All images have alt text
- [ ] **FAIL** - Progress spinner has no ARIA label
  - **Action**: Add `aria-label="Converting your file, please wait"` to spinner
- [ ] **PASS** - Video captions present (if applicable)

#### Operable
- [ ] **FAIL** - Cannot access file upload via keyboard alone
  - **Action**: Ensure input is focusable and activatable via Enter/Space
- [ ] **FAIL** - Session timeout with no warning
  - **Action**: Add 2-minute warning before timeout + extend option
- [ ] **PASS** - No flashing content >3x per second
- [ ] **FAIL** - Skip-to-content link missing
  - **Action**: Add skip navigation link

#### Understandable
- [ ] **FAIL** - Error messages not associated with form fields
  - **Action**: Use `aria-describedby` to link errors to inputs
- [ ] **PASS** - Language declared in HTML (<html lang="en">)
- [ ] **FAIL** - Focus moves unexpectedly during upload
  - **Action**: Maintain focus on upload area, don't auto-move

#### Robust
- [ ] **FAIL** - Invalid HTML (unclosed divs found)
  - **Action**: Run HTML validator and fix all errors
- [ ] **PASS** - ARIA landmarks used correctly
- [ ] **FAIL** - Status updates not announced to screen readers
  - **Action**: Use `role="status"` + `aria-live="polite"` for progress updates

### Summary
- **Total Checks**: 16
- **Pass**: 6 (38%)
- **Fail**: 10 (62%)
- **Priority Fixes**: Keyboard access, color contrast, status announcements
- **Estimated Effort**: 2-3 days for critical fixes
```

## Quality Checklist

Before marking complete, verify:

- [ ] All user journey stages analyzed
- [ ] Findings matrix has 15+ actionable items
- [ ] Wireflows show clear before/after improvements
- [ ] Copy deck covers all critical moments (8+ examples)
- [ ] 3-5 experiments with clear hypotheses and metrics
- [ ] KPI model includes confidence levels
- [ ] Accessibility checklist is WCAG 2.2 AA focused
- [ ] All recommendations include effort estimates
- [ ] Business impact is quantified where possible
- [ ] Quick wins (high impact, low effort) are highlighted

## Output Format

Save all deliverables in:
```
docs/ux-audit/
  ├── findings-matrix.md
  ├── wireflows.md
  ├── copy-deck.md
  ├── experiment-plan.md
  ├── kpi-impact-model.md
  ├── accessibility-checklist.md
  └── executive-summary.md (1-page overview with top 10 recommendations)
```

## Notes
- Use evidence-based recommendations only
- Quantify impact wherever possible
- Focus on high-leverage fixes (Pareto principle: 80% impact from 20% of changes)
- Balance quick wins with strategic improvements
- Always consider cognitive load in recommendations
- Privacy and trust are non-negotiable
- Accessibility is a requirement, not a feature
