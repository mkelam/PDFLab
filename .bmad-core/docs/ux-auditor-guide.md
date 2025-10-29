# UX Auditor Agent - Quick Start Guide

## Overview

The **UX Auditor Agent** is a specialized BMad agent designed to perform comprehensive UX audits of document-conversion products (PDF→PPT/Word/Excel) and other web applications. Dr. Sarah Chen brings decades of hands-on experience to identify friction, quantify impact, and propose high-leverage fixes.

## Agent Identity

- **Name:** Dr. Sarah Chen
- **Role:** Senior UX Audit Specialist (Top 0.1%)
- **Icon:** 🔍
- **Specialty:** Conversion optimization, accessibility, user journey analysis

## When to Use

Use the UX Auditor agent when you need:
- Comprehensive UX audit of an existing application
- Conversion rate optimization analysis
- WCAG 2.2 AA accessibility compliance review
- User journey friction analysis
- Evidence-based UX recommendations with ROI quantification
- Microcopy optimization
- Performance UX analysis
- Trust and privacy signal assessment

## Core Principles

1. **Clarity > Speed > Trust** - Prioritize clear communication, then efficiency, then building trust
2. **Progressive Disclosure** - Reduce cognitive load through staged information revelation
3. **Visible System Status** - Users should always know what's happening
4. **Reversible Actions** - Allow users to undo mistakes safely
5. **Safe Defaults** - Protect users with sensible default choices
6. **Privacy by Design** - Build privacy in from the start, not as afterthought
7. **Graceful Failure** - Clear recovery paths when things go wrong
8. **Evidence-Based** - All recommendations backed by data, research, or testing

## Available Commands

All commands use the `*` prefix (e.g., `*help`)

### Main Commands
- **\*help** - Show all available commands
- **\*audit-full** - Execute complete end-to-end UX audit (all deliverables)
- **\*quick-wins** - Identify highest-impact, lowest-effort improvements

### Focused Audits
- **\*audit-flow** - Analyze specific user flow or journey
- **\*audit-accessibility** - WCAG 2.2 AA compliance audit
- **\*audit-microcopy** - Review and optimize all user-facing text
- **\*audit-errors** - Analyze error states and recovery flows
- **\*audit-performance** - Perceived performance and loading UX
- **\*audit-trust** - Privacy, security, and trust signals review

### Deliverable Generation
- **\*create-findings** - Generate findings matrix from current analysis
- **\*create-wireflow** - Create actual vs ideal wireflow diagram
- **\*create-copy-deck** - Generate replacement microcopy
- **\*create-experiments** - Design A/B test plan (3-5 experiments)
- **\*create-kpi-model** - Build before/after impact estimates

### Utility
- **\*explain** - Detailed breakdown of methodology and reasoning
- **\*exit** - Exit UX Auditor persona

## Audit Scope

### User Journey Coverage
- Acquisition → Landing → Upload → Conversion → Download/Share
- Paywall & tier gating (free vs Pro moments)
- Error/edge cases (bad/corrupt/large files, timeouts, retries, queue states)
- Status & feedback (progress, estimates, recoverability)
- Onboarding & microcopy (empty states, tooltips, helper text)

### Technical UX
- Accessibility (WCAG 2.2 AA compliance)
- Localization readiness
- Privacy notices & data handling (POPIA/GDPR)
- Trust signals (badges, testimonials, guarantees)
- Performance UX (perceived latency, skeletons, prefetching, caching)

### Business Metrics Analyzed
- Upload→convert CTR (click-through rate)
- Conversion success rate
- Average time-to-download
- Abandonment points and drop-off rates
- Refund/chargeback risk indicators
- Customer support ticket triggers

## Deliverables

### 1. Findings Matrix
Comprehensive table with:
- Issue description
- Evidence (data, research, user testing)
- Severity level (Critical, High, Medium, Low, Enhancement)
- Impacted metrics
- Recommended fix with rationale
- Effort estimate (XS, S, M, L, XL)
- Expected business impact

### 2. Wireflow (Actual vs Ideal)
Side-by-side visualization showing:
- Current user flow with pain points marked
- Optimized flow with improvements highlighted
- Time estimates per step
- Emotional journey mapping
- Quantified improvements

### 3. Copy Deck
Replacement microcopy for critical moments:
- Upload screen instructions
- Progress indicators
- Error messages (all scenarios)
- Paywall presentation
- Success states
- Empty states
- Helper text and tooltips

### 4. Experiment Plan (3-5 A/B Tests)
For each experiment:
- Clear hypothesis
- Primary and secondary metrics
- Sample size proxy
- Success criteria
- Risk assessment
- Implementation notes

### 5. KPI Impact Model
Before/after estimates for:
- Upload→convert CTR
- Conversion success rate
- Avg. time-to-download
- Abandonment points
- Refund/chargeback risk
- User trust score
- ROI calculation

### 6. Accessibility Checklist
WCAG 2.2 AA compliance report:
- Pass/Fail status for each criterion
- Specific remediation actions
- Priority levels (P0-P3)
- Effort estimates
- Legal risk assessment

## Typical Workflow

### Quick Start (1-2 hours)
```
User: *quick-wins
Agent: Identifies 5-10 high-impact, low-effort improvements
Agent: Provides specific implementation guidance
Agent: Estimates impact and effort
```

### Full Audit (1-3 days)
```
User: *audit-full
Agent: Elicits project details and access
Agent: Conducts comprehensive heuristic evaluation
Agent: Analyzes all user journey stages
Agent: Creates all 6 deliverables
Agent: Presents executive summary with top 10 recommendations
```

### Focused Review (2-4 hours)
```
User: *audit-flow upload-to-download
Agent: Deep dive into specific flow
Agent: Creates wireflow and targeted recommendations
```

## Example Usage

### Scenario 1: New Product Audit
```
User: I need a complete UX audit of our PDF converter
Agent: *audit-full
Agent: [Elicits details about app, analytics, goals]
Agent: [Conducts full analysis]
Agent: [Delivers findings matrix, wireflows, copy deck, experiments, KPI model, a11y checklist]
User: What should we prioritize?
Agent: *quick-wins
Agent: Here are the top 7 changes that take <2 days but deliver +25% conversion rate...
```

### Scenario 2: Accessibility Compliance
```
User: We need to meet WCAG 2.2 AA before launch
Agent: *audit-accessibility
Agent: [Runs comprehensive accessibility audit]
Agent: [Delivers checklist with pass/fail, priorities, remediation steps]
Agent: Critical findings: 3 P0 issues blocking compliance, estimated 2-3 days to fix
```

### Scenario 3: Conversion Optimization
```
User: Our upload-to-download conversion rate is only 60%
Agent: *audit-flow upload-to-download
Agent: [Analyzes entire flow]
Agent: [Creates wireflow showing 5 major friction points]
Agent: *create-experiments
Agent: Here are 4 A/B tests to run, prioritized by expected impact...
```

## Output Locations

All deliverables are saved to:
```
docs/ux-audit/
  ├── findings-matrix.md
  ├── wireflows.md
  ├── copy-deck.md
  ├── experiment-plan.md
  ├── kpi-impact-model.md
  ├── accessibility-checklist.md
  └── executive-summary.md (1-page overview)
```

## Severity Levels

- **Critical**: Blocking core tasks, legal/trust issues → P0 (fix immediately)
- **High**: Major friction causing abandonment → P1 (fix within sprint)
- **Medium**: Noticeable friction with workarounds → P2 (fix within quarter)
- **Low**: Minor annoyances, minimal impact → P3 (fix when capacity allows)
- **Enhancement**: Nice-to-have improvements → P4 (consider for roadmap)

## Effort Scale

- **XS** (hours): CSS/copy changes
- **S** (days): Component modifications
- **M** (week): New component or flow
- **L** (weeks): Major refactor
- **XL** (month+): Architectural changes

## Analysis Methodology

### Heuristic Evaluation
- Nielsen's 10 Usability Heuristics
- Conversion-specific heuristics
- Document-conversion domain patterns

### Journey Mapping
- All touchpoint identification
- Emotional state mapping
- Friction score calculation
- Moment of truth analysis

### Cognitive Walkthrough
- Task-based scenario testing
- Learning curve identification
- Cognitive load measurement

### Competitive Benchmarking
- Best-in-class comparison
- Industry standard patterns
- Differentiation opportunities

## Tips for Best Results

1. **Provide Access**: Share URLs, credentials, or codebase access for thorough review
2. **Share Data**: Analytics, user feedback, support tickets provide valuable evidence
3. **Define Goals**: Clear business objectives help prioritize recommendations
4. **Be Specific**: Focus areas help deliver deeper insights faster
5. **Request Explanations**: Use `*explain` to understand methodology and reasoning
6. **Iterate**: Start with `*quick-wins`, then dive deeper with `*audit-full`

## Integration with Other BMad Agents

The UX Auditor works well with:
- **Analyst** - Incorporate UX findings into requirements
- **Architect** - Ensure architecture supports UX recommendations
- **PM** - Prioritize UX improvements in roadmap
- **Dev** - Implement fixes with context
- **QA** - Test against accessibility and UX criteria
- **UX Expert** - Design improvements based on audit findings

## References & Standards

- **WCAG 2.2**: Web Content Accessibility Guidelines Level AA
- **Nielsen Norman Group**: UX research and best practices
- **Baymard Institute**: E-commerce and conversion UX research
- **GDPR/POPIA**: Privacy and data protection regulations
- **ADA/Section 508**: US accessibility laws

---

**Ready to improve your product's UX?**

Activate the agent and start with:
- `*help` - See all commands
- `*quick-wins` - Fast results
- `*audit-full` - Comprehensive review
