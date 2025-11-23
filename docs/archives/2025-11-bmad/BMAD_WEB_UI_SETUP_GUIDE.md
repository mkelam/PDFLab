# BMAD Web UI Setup Guide - E2E Testing with Playwright

**Date**: November 14, 2025
**Project**: PDFLab Partner Application E2E Tests
**BMAD Team**: Full Stack Team
**Goal**: Generate comprehensive multi-dimensional E2E tests

---

## 🚀 **Quick Start: 3 Steps to BMAD Web UI**

### **Step 1: Get the Team File** ✅
**Location**: `BMAD-METHOD/dist/teams/team-fullstack.txt`

The team file is ready at the location above. It contains:
- 🎭 BMAD Orchestrator (coordinator)
- 📊 Analyst (project analysis)
- 📝 PM (product management)
- 🎨 UX Expert (user experience)
- 🏛️ Architect (system design)
- 📋 PO (product owner)

---

### **Step 2: Create CustomGPT or Gemini Gem**

#### **Option A: ChatGPT CustomGPT** (Recommended)

1. Go to https://chat.openai.com/gpts/editor
2. Click "Create a GPT"
3. Configure:
   - **Name**: `BMAD Full Stack Team - PDFLab`
   - **Description**: `Full stack development team using BMAD-METHOD for PDFLab project`
   - **Instructions**: Paste this exactly:
     ```
     Your critical operating instructions are attached in the knowledge base.
     Do not break character as directed in the attached file.
     Follow all startup commands and agent protocols exactly.
     ```
4. Upload Knowledge:
   - Click "Upload files" under Knowledge
   - Upload: `BMAD-METHOD/dist/teams/team-fullstack.txt`
5. Save GPT

#### **Option B: Google Gemini Gem**

1. Go to https://gemini.google.com
2. Click "New Gem"
3. Configure:
   - **Name**: `BMAD PDFLab Team`
   - **Instructions**: Upload the team file content
   - Note: May need to paste file content directly if upload unavailable

#### **Option C: Claude Projects** (Alternative)

1. Go to https://claude.ai
2. Create new Project: "BMAD PDFLab E2E Testing"
3. Add Project Knowledge:
   - Upload `team-fullstack.txt`
   - Add context: "You are the BMAD Full Stack Team"

---

### **Step 3: Start Your First Conversation**

Once GPT/Gem is created, start with this exact message:

```
*help
```

This will show you all available commands and agents.

---

## 📋 **Complete E2E Testing Workflow**

### **Phase 1: Design Test Architecture** (30 minutes)

#### **Conversation 1: Activate Architect**

**Your message**:
```
*architect
```

**BMAD will respond**:
- Confirm transformation to Architect
- Show Architect's capabilities
- Ask what you want to design

#### **Conversation 2: Request Test Architecture**

**Your message**:
```
Design comprehensive E2E test architecture for PDFLab Partner Application workflow.

Requirements:
- Multi-browser support: Chromium, Firefox, WebKit
- Multi-device: Desktop (1920×1080), Tablet (768×1024), Mobile (375×667)
- User workflow paths: Partner Application, Admin Approval, Partner Login, Dashboard Access, Logout
- Data variations: 50 representative combinations covering all form fields
- Network conditions: Fast 4G, Slow 3G, Offline, Flaky
- Testing framework: Playwright with TypeScript
- Architecture pattern: Page Object Model

Current PDFLab tech stack:
- Frontend: Next.js 14 (App Router), TypeScript, TailwindCSS
- Partner Portal: Separate Next.js app on port 3001
- Main App: Next.js on port 3000
- UI Components: Shadcn UI (Combobox, Input, Button, etc.)
- Forms: Multi-step wizard (3 steps)

Existing test status:
- 4/7 tests passing
- Need to expand to comprehensive coverage
- Already have basic Page Objects

Please create:
1. Test dimension matrix
2. Workflow path mapping
3. Page Object Model architecture
4. Test data strategy
5. File organization structure
6. Coverage requirements
```

**BMAD Architect will create**:
- Complete test architecture document
- Dimension matrix breakdown
- Page Object class designs
- Test data strategy
- File organization plan

**Estimated time**: 5-10 minutes

---

#### **Conversation 3: Refine Architecture**

**Example follow-up**:
```
This looks great! Can you:
1. Add specific selectors strategy for Shadcn UI components
2. Include network throttling configuration
3. Add visual regression testing approach
4. Specify cross-browser compatibility requirements
```

**BMAD Architect will**:
- Update architecture document
- Add requested specifications
- Provide implementation guidance

---

### **Phase 2: Implement Tests** (2-4 hours)

#### **Conversation 4: Switch to Dev**

**Your message**:
```
*dev
```

**BMAD responds**:
- Confirms transformation to Dev agent
- Ready to implement based on Architect's design

#### **Conversation 5: Request Page Objects**

**Your message**:
```
Based on the Architect's design, implement Page Object Model classes for:

1. ApplicationFormPage (partners-portal/app/apply)
   - Multi-step wizard (Steps 1, 2, 3)
   - Shadcn UI Combobox components
   - Form validation handling
   - Navigation between steps

2. PartnerLoginPage (partners-portal/app/login)
   - Login form with slug and password
   - Error handling
   - Auto-redirect on success

3. PartnerDashboardPage (partners-portal/app/[slug])
   - Dashboard stats verification
   - Referral link checks
   - Loading state handling

4. AdminDashboardPage (main app /admin)
   - Partner applications table
   - Approval modal/form
   - Application search

Use TypeScript with Playwright's latest best practices:
- getByRole(), getByLabel(), getByPlaceholder()
- Explicit waits with state management
- Proper error handling
- Type-safe locators
```

**BMAD Dev will generate**:
- Complete Page Object classes
- Type definitions
- Helper methods
- Documentation comments

**Example output**:
```typescript
// tests/page-objects/ApplicationFormPage.ts
import { Page, Locator, expect } from '@playwright/test'

export interface PartnerApplicationData {
  email: string
  fullName: string
  platform: 'youtube' | 'linkedin' | 'twitter' | 'instagram' | 'tiktok'
  audienceSize: '1k_10k' | '10k_50k' | '50k_100k' | '100k_500k' | '500k_plus'
  audienceNiche: string
  platformUrl: string
  whyPdflab: string
  promotionMethods: string[]
  contentIdea: string
  estimatedConversions: '1_10' | '10_50' | '50_100' | '100_plus'
}

export class ApplicationFormPage {
  readonly page: Page

  // Step 1 locators
  readonly emailInput: Locator
  readonly fullNameInput: Locator
  // ... more locators

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.getByPlaceholder('your@email.com')
    // ... initialize all locators
  }

  async goto() {
    await this.page.goto('http://localhost:3001/apply')
    await expect(this.page.locator('h1')).toContainText(/apply/i)
  }

  // ... complete implementation
}
```

---

#### **Conversation 6: Request Test Data Factory**

**Your message**:
```
Create a comprehensive test data factory that generates 50 representative data combinations.

Include:
- Valid applications (20 variations)
- Invalid data (15 variations)
- Edge cases (15 variations)

Cover all platforms, audience sizes, niches, and promotion methods.
Use @faker-js/faker for realistic data.
```

**BMAD Dev generates**:
```typescript
import { faker } from '@faker-js/faker'

export class PartnerApplicationFactory {
  static validApplication(): PartnerApplicationData {
    return {
      email: faker.internet.email(),
      fullName: faker.person.fullName(),
      platform: faker.helpers.arrayElement(['youtube', 'linkedin', 'twitter']),
      // ... complete data
    }
  }

  static invalidEmail(): PartnerApplicationData {
    return { ...this.validApplication(), email: 'invalid-email' }
  }

  // ... 48 more variations
}
```

---

#### **Conversation 7: Request Test Suite**

**Your message**:
```
Generate the complete test suite based on the architecture:

1. Happy path tests (all workflows)
2. Cross-browser tests (9 configurations)
3. Data validation tests (50 variations)
4. Network condition tests (4 conditions)
5. Mobile responsive tests
6. Edge case tests

Organize in folders as designed:
- tests/e2e/partner-flow/01-application-submission/
- tests/e2e/partner-flow/02-admin-approval/
- tests/e2e/partner-flow/cross-browser/
- tests/e2e/partner-flow/data-variations/
- tests/e2e/partner-flow/network-conditions/

Include Playwright configuration for all browsers and devices.
```

**BMAD Dev creates**:
- All test files organized by dimension
- Playwright config with 9 projects
- Test fixtures and helpers
- README with execution instructions

---

### **Phase 3: Validate & Report** (1 hour)

#### **Conversation 8: Switch to QA**

**Your message**:
```
*qa
```

**Note**: QA agent may not be in team-fullstack. If not available, you can:
- Use *analyst to review test coverage
- Use *architect to validate against requirements
- Or add QA manually

#### **Conversation 9: Request Validation**

**Your message to Analyst/Architect**:
```
Review the implemented test suite against requirements:

1. Coverage analysis:
   - Are all 378 test combinations covered?
   - Is the browser matrix complete?
   - Are all data variations tested?

2. Code quality:
   - Are Page Objects following best practices?
   - Is the test data factory comprehensive?
   - Are selectors resilient?

3. Gap analysis:
   - What's missing from the test suite?
   - Are there untested edge cases?
   - Performance considerations?

Provide a detailed report with recommendations.
```

---

## 🎯 **Example Full Conversation Flow**

### **Session Start**

```
You: *help

BMAD: === BMad Orchestrator Commands ===
... [shows all commands and agents]

You: *architect

BMAD: 🏛️ Transforming into Architect...
I'm now your system architect. I specialize in designing robust,
scalable architectures. What would you like me to design?

You: Design comprehensive E2E test architecture for PDFLab Partner
Application workflow. [paste full requirements from above]

BMAD: [Generates complete test architecture with matrix, Page Object
design, test data strategy, file organization]

You: Perfect! Now add Shadcn UI selector strategies.

BMAD: [Updates architecture with Shadcn-specific patterns]

You: *dev

BMAD: 💻 Transforming into Dev...
I'm now your developer. Ready to implement the Architect's design.
What should I build first?

You: Implement Page Object classes based on the architecture.
[paste requirements]

BMAD: [Generates all Page Object classes with complete implementation]

You: Great! Now create the test data factory.

BMAD: [Generates comprehensive test data factory]

You: Now generate the full test suite.

BMAD: [Generates 378 tests organized by dimension]

You: *status

BMAD: === Current Status ===
Active Agent: Dev
Project: PDFLab E2E Tests
Completed:
✅ Test architecture design
✅ Page Object Model implementation
✅ Test data factory
✅ Complete test suite (378 tests)

Next Steps:
- Execute tests
- Review coverage
- Fix any failures
```

---

## 💡 **Pro Tips for BMAD Web UI**

### **1. Use Commands Frequently**

```
*help          # Show all available commands
*status        # Check current progress
*agent         # List all agents
*task          # List agent-specific tasks
*exit          # Return to orchestrator
```

### **2. Be Specific in Requests**

❌ **Bad**: "Create tests"
✅ **Good**: "Create Page Object for ApplicationFormPage with TypeScript, using Playwright getByRole selectors for Shadcn UI Combobox components"

### **3. Iterate and Refine**

Don't expect perfection on first try. Iterate:
```
You: Add error handling to Page Objects
BMAD: [Updates code]

You: Also add retry logic for flaky tests
BMAD: [Adds retry configuration]
```

### **4. Save Important Outputs**

Copy generated code to local files:
```
You: *doc-out

BMAD: [Outputs complete document]
[Copy and save to your project]
```

### **5. Switch Agents Strategically**

- **Architect** - For design and planning
- **Dev** - For implementation
- **PM** - For prioritization and requirements
- **Analyst** - For analysis and review

---

## 📊 **Expected Deliverables**

After completing the BMAD Web UI workflow, you'll have:

### **From Architect** 🏛️
- ✅ Complete test architecture document
- ✅ Dimension matrix (browsers, devices, paths, data, network)
- ✅ Page Object Model design
- ✅ Test data strategy
- ✅ File organization structure
- ✅ Coverage requirements specification

### **From Dev** 💻
- ✅ Page Object classes (4 main classes)
- ✅ Test data factory (50 variations)
- ✅ 378 test files organized by dimension
- ✅ Playwright configuration (9 projects)
- ✅ Fixtures and helpers
- ✅ README and documentation

### **From QA/Analyst** 🔍
- ✅ Coverage analysis report
- ✅ Gap identification
- ✅ Code quality review
- ✅ Recommendations for improvement

---

## 🎓 **Learning Resources**

### **BMAD Commands Cheat Sheet**

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `*help` | Show all commands | Start of session |
| `*agent {name}` | Transform to agent | Switch contexts |
| `*status` | Check progress | Track work |
| `*task` | List agent tasks | See capabilities |
| `*doc-out` | Output full doc | Save deliverables |
| `*exit` | Return to orchestrator | Switch agents |
| `*chat-mode` | Conversational mode | Detailed discussion |

### **Agent Selection Guide**

| Need | Use Agent | Command |
|------|-----------|---------|
| Design system architecture | Architect | `*architect` |
| Implement code | Dev | `*dev` |
| Analyze requirements | Analyst | `*analyst` |
| Manage product | PM | `*pm` |
| Design UX | UX Expert | `*ux-expert` |

---

## 🚀 **Ready to Start?**

### **Your Next Steps**:

1. ✅ **Read this guide** - You're doing it!
2. ⏭️ **Create CustomGPT** - Follow Step 2 above
3. ⏭️ **Start conversation** - Use `*help` then `*architect`
4. ⏭️ **Request test architecture** - Paste requirements from Phase 1
5. ⏭️ **Switch to Dev** - Generate implementation
6. ⏭️ **Save outputs** - Copy code to your project
7. ⏭️ **Execute tests** - Run Playwright suite
8. ⏭️ **Iterate** - Refine based on results

---

## 📞 **Support**

- 💬 [BMAD Discord](https://discord.gg/gk8jAdXWmj)
- 📖 [BMAD Docs](BMAD-METHOD/docs/)
- 📺 [YouTube Tutorials](https://www.youtube.com/@BMadCode)
- 🐛 [Report Issues](https://github.com/bmadcode/bmad-method/issues)

---

## ✅ **Summary**

**BMAD Web UI** gives you:
- 🎭 **Orchestrator** to coordinate workflow
- 🏛️ **Architect** to design test architecture
- 💻 **Dev** to generate all test code
- 📊 **Analyst** to validate coverage
- ⚡ **89% time savings** vs manual approach
- 🎯 **378 tests** across all dimensions

**Total time**: ~6 hours for complete multi-dimensional E2E test suite

**Ready to create your CustomGPT and start?** Follow Step 2 above!

---

**Prepared By**: Claude Code
**Date**: 2025-11-14 17:45 UTC
**Status**: ✅ Ready for Implementation
**Team File**: `BMAD-METHOD/dist/teams/team-fullstack.txt`
