# UX Audit: WCAG 2.2 AA Accessibility Checklist

## Checklist Metadata
```yaml
id: ux-audit-accessibility-checklist
title: WCAG 2.2 AA Compliance Audit
standard: WCAG 2.2 Level AA
category: accessibility
output: Pass/Fail report with remediation actions
```

## Instructions
- Mark each item as ✅ PASS, ❌ FAIL, or ➖ N/A
- For each failure, document the specific issue and remediation action
- Priority: P0 (Critical/Legal risk), P1 (High impact), P2 (Medium), P3 (Low)

---

## 1. PERCEIVABLE
*Information and user interface components must be presentable to users in ways they can perceive*

### 1.1 Text Alternatives
- [ ] **1.1.1 Non-text Content (A)**: All images, icons, and graphics have meaningful alt text
  - Status: ___
  - Issue (if fail): ___
  - Action: ___
  - Priority: ___

### 1.2 Time-based Media
- [ ] **1.2.1 Audio-only / Video-only (A)**: Alternatives provided for audio/video content
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **1.2.2 Captions (A)**: Captions provided for all video content
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **1.2.3 Audio Description (A)**: Audio description provided for video
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

### 1.3 Adaptable
- [ ] **1.3.1 Info and Relationships (A)**: Semantic HTML used (headings, lists, tables, forms)
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **1.3.2 Meaningful Sequence (A)**: Reading order is logical when CSS disabled
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **1.3.3 Sensory Characteristics (A)**: Instructions don't rely solely on shape/size/color
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **1.3.4 Orientation (AA)**: Content works in both portrait and landscape
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **1.3.5 Identify Input Purpose (AA)**: Form fields have autocomplete attributes where appropriate
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

### 1.4 Distinguishable
- [ ] **1.4.1 Use of Color (A)**: Color is not the only means of conveying information
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **1.4.2 Audio Control (A)**: Auto-playing audio can be paused/stopped
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **1.4.3 Contrast (Minimum) (AA)**: Text has at least 4.5:1 contrast ratio (3:1 for large text)
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___
  - **Common failures:**
    - Upload button background vs text
    - Link colors on backgrounds
    - Placeholder text in inputs
    - Disabled button states

- [ ] **1.4.4 Resize Text (AA)**: Text can be resized to 200% without loss of content or functionality
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **1.4.5 Images of Text (AA)**: Text is used instead of images of text (except logos)
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **1.4.10 Reflow (AA)**: Content reflows to single column at 320px width (mobile)
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **1.4.11 Non-text Contrast (AA)**: UI components and graphics have 3:1 contrast
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___
  - **Check:** Buttons, form borders, icons, focus indicators

- [ ] **1.4.12 Text Spacing (AA)**: Text remains readable with user-adjusted spacing
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **1.4.13 Content on Hover/Focus (AA)**: Hover/focus content is dismissible, hoverable, persistent
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

---

## 2. OPERABLE
*User interface components and navigation must be operable*

### 2.1 Keyboard Accessible
- [ ] **2.1.1 Keyboard (A)**: ALL functionality available via keyboard
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___
  - **Critical test:** File upload, drag-drop, conversion start, download

- [ ] **2.1.2 No Keyboard Trap (A)**: Keyboard focus never trapped
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **2.1.4 Character Key Shortcuts (A)**: Single-key shortcuts can be disabled/remapped
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

### 2.2 Enough Time
- [ ] **2.2.1 Timing Adjustable (A)**: Time limits can be extended/disabled
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___
  - **Check:** Conversion timeouts, session expiry

- [ ] **2.2.2 Pause, Stop, Hide (A)**: Moving/auto-updating content can be paused
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___
  - **Check:** Progress indicators, carousels, live regions

### 2.3 Seizures and Physical Reactions
- [ ] **2.3.1 Three Flashes (A)**: Nothing flashes more than 3 times per second
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

### 2.4 Navigable
- [ ] **2.4.1 Bypass Blocks (A)**: Skip navigation link present
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **2.4.2 Page Titled (A)**: Every page has descriptive `<title>`
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **2.4.3 Focus Order (A)**: Focus order is logical and meaningful
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **2.4.4 Link Purpose (A)**: Link text describes destination (avoid "click here")
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **2.4.5 Multiple Ways (AA)**: Multiple ways to locate pages (nav, search, sitemap)
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **2.4.6 Headings and Labels (AA)**: Headings and labels are descriptive
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **2.4.7 Focus Visible (AA)**: Keyboard focus indicator always visible
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___
  - **Critical:** Upload button, convert button, download links

### 2.5 Input Modalities
- [ ] **2.5.1 Pointer Gestures (A)**: Multipoint/path gestures have single-pointer alternative
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **2.5.2 Pointer Cancellation (A)**: Down-event doesn't trigger functions
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **2.5.3 Label in Name (A)**: Accessible name contains visible label text
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **2.5.4 Motion Actuation (A)**: Motion-activated functions have UI alternative
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

---

## 3. UNDERSTANDABLE
*Information and operation of user interface must be understandable*

### 3.1 Readable
- [ ] **3.1.1 Language of Page (A)**: Page language declared (`<html lang="en">`)
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **3.1.2 Language of Parts (AA)**: Language changes marked up (`lang` attribute)
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

### 3.2 Predictable
- [ ] **3.2.1 On Focus (A)**: Focus doesn't trigger unexpected context change
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___
  - **Check:** Upload field doesn't auto-submit on focus

- [ ] **3.2.2 On Input (A)**: Input doesn't trigger unexpected context change
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **3.2.3 Consistent Navigation (AA)**: Navigation is consistent across pages
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **3.2.4 Consistent Identification (AA)**: Same functionality labeled consistently
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

### 3.3 Input Assistance
- [ ] **3.3.1 Error Identification (A)**: Errors are identified and described in text
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___
  - **Check:** File format errors, upload errors, conversion failures

- [ ] **3.3.2 Labels or Instructions (A)**: Labels provided for all inputs
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

- [ ] **3.3.3 Error Suggestion (AA)**: Error messages suggest corrections
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___
  - **Example:** "This DOCX file can't be converted. Try uploading a PDF instead."

- [ ] **3.3.4 Error Prevention (AA)**: Submissions are reversible/confirmable/checked
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___

---

## 4. ROBUST
*Content must be robust enough to be interpreted by a wide variety of user agents*

### 4.1 Compatible
- [ ] **4.1.1 Parsing (A)**: HTML is valid (no unclosed tags, duplicate IDs)
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___
  - **Tool:** W3C HTML Validator

- [ ] **4.1.2 Name, Role, Value (A)**: All UI components have accessible name/role/state
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___
  - **Critical for:**
    - Upload button (`<button>` or `role="button"`)
    - Progress indicator (`role="progressbar"` + `aria-valuenow`)
    - Error messages (`role="alert"`)
    - Status updates (`role="status"`)

- [ ] **4.1.3 Status Messages (AA)**: Status messages announced without receiving focus
  - Status: ___
  - Issue: ___
  - Action: ___
  - Priority: ___
  - **Use:** `role="status"` + `aria-live="polite"` for:
    - "Converting your file..."
    - "Conversion complete!"
    - "Error: Please try again"

---

## DOCUMENT-CONVERSION SPECIFIC CHECKS

### File Upload Accessibility
- [ ] File input is keyboard accessible (Enter/Space to activate)
- [ ] Drag-drop zone has keyboard alternative
- [ ] File input has descriptive label (not just "Browse")
- [ ] Accepted formats announced to screen readers
- [ ] File size limits communicated before upload

### Progress Indicator Accessibility
- [ ] Progress uses `role="progressbar"`
- [ ] Progress has `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- [ ] Progress has `aria-label` or `aria-labelledby`
- [ ] Time estimates announced to screen readers
- [ ] Status changes announced (`aria-live="polite"`)

### Error Handling Accessibility
- [ ] Errors use `role="alert"` or `aria-live="assertive"`
- [ ] Errors associated with inputs (`aria-describedby`)
- [ ] Errors are announced to screen readers
- [ ] Error messages are specific and actionable
- [ ] Invalid fields marked with `aria-invalid="true"`

### Success State Accessibility
- [ ] Success message announced (`role="status"`)
- [ ] Download button is keyboard accessible
- [ ] Download button has descriptive label
- [ ] Alternative download methods available (email, link share)

---

## TESTING TOOLS

### Automated Tools (catch ~30% of issues)
- [ ] **axe DevTools**: Chrome/Firefox extension
- [ ] **WAVE**: Web accessibility evaluation tool
- [ ] **Lighthouse**: Chrome DevTools > Audits > Accessibility
- [ ] **HTML Validator**: validator.w3.org
- [ ] **Color Contrast Analyzer**: paciellogroup.com/resources/contrastanalyser

### Manual Testing (required for ~70% of issues)
- [ ] **Keyboard navigation**: Tab through entire flow, no mouse
- [ ] **Screen reader**: NVDA (Windows), JAWS, VoiceOver (Mac/iOS), TalkBack (Android)
- [ ] **Zoom**: Test at 200% browser zoom
- [ ] **Mobile**: Test on actual devices (iOS, Android)
- [ ] **Custom spacing**: Test with user stylesheet (line-height 1.5, letter-spacing 0.12em)

### Screen Reader Testing Scenarios
1. [ ] Navigate landing page, hear value proposition
2. [ ] Find and activate upload button via keyboard
3. [ ] Hear file format requirements
4. [ ] Upload file, hear confirmation
5. [ ] Hear progress updates during conversion
6. [ ] Hear error messages (if any)
7. [ ] Hear success message
8. [ ] Find and activate download button
9. [ ] Navigate entire flow without seeing screen

---

## SUMMARY REPORT TEMPLATE

```markdown
## WCAG 2.2 AA Accessibility Audit Summary

**Project:** [Name]
**Date:** [YYYY-MM-DD]
**Auditor:** Dr. Sarah Chen, UX Audit Specialist
**Standard:** WCAG 2.2 Level AA

### Overall Compliance
- **Total Criteria Checked:** [X]
- **Pass:** [X] ([X]%)
- **Fail:** [X] ([X]%)
- **N/A:** [X]

### Compliance by Principle
| Principle | Pass | Fail | N/A | % Pass |
|-----------|------|------|-----|--------|
| Perceivable | X | X | X | X% |
| Operable | X | X | X | X% |
| Understandable | X | X | X | X% |
| Robust | X | X | X | X% |

### Critical Failures (P0 - Legal Risk)
1. [Criterion X.X.X] - [Brief description]
   - **Impact:** [Who is affected and how]
   - **Fix:** [Specific remediation]
   - **Effort:** [XS/S/M/L]

### High Priority Failures (P1)
[Same format as above]

### Medium Priority Failures (P2)
[Same format as above]

### Estimated Remediation Effort
- **Critical (P0):** [X hours/days]
- **High (P1):** [X hours/days]
- **Medium (P2):** [X hours/days]
- **Total:** [X days]

### Next Steps
1. [Immediate action item]
2. [Short-term action item]
3. [Long-term action item]

### Positive Highlights
- [What's working well]
- [Good practices observed]
```

---

## LEGAL & COMPLIANCE NOTES

**Regulations requiring accessibility:**
- **ADA (USA)**: Americans with Disabilities Act
- **Section 508 (USA)**: Federal agency accessibility
- **EAA (EU)**: European Accessibility Act (June 2025)
- **EN 301 549 (EU)**: Public sector accessibility
- **Equality Act (UK)**: Public sector bodies
- **AODA (Canada - Ontario)**: Accessibility for Ontarians with Disabilities

**Risk of non-compliance:**
- Lawsuits and legal fees
- Fines and penalties
- Reputation damage
- Lost market share (15-20% of population has disabilities)
- Reduced SEO (accessibility helps Google too)

**Business case for accessibility:**
- Expanded market reach (+15-20% potential users)
- Improved SEO rankings
- Better usability for ALL users
- Reduced legal risk
- Enhanced brand reputation
- Often required for government contracts
