# BMAD Autonomous Test Execution with CustomGPT + MCP

**Date**: November 14, 2025
**Goal**: Enable CustomGPT to autonomously execute Playwright tests
**Integration**: BMAD + MCP (Model Context Protocol) + Playwright
**Status**: Implementation Guide

---

## 🎯 **The Vision: Fully Autonomous Testing**

Instead of just generating test code, your BMAD CustomGPT will:

1. **Design** test architecture (Architect agent)
2. **Generate** test code (Dev agent)
3. **Execute** tests directly via MCP (QA agent)
4. **Analyze** results and iterate (Analyst agent)
5. **Fix** failing tests automatically (Dev agent)
6. **Report** comprehensive results (All agents)

All happening **autonomously** in the CustomGPT conversation!

---

## 🏗️ **Architecture: How It Works**

```
┌─────────────────────────────────────────────────┐
│         CustomGPT (BMAD Team)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │Architect │→ │   Dev    │→ │    QA    │     │
│  └──────────┘  └──────────┘  └──────────┘     │
│       ↓             ↓              ↓            │
│   Design       Generate        Execute         │
└───────────────────┼────────────────┼────────────┘
                    │                │
                    ↓                ↓
            ┌───────────────────────────┐
            │  CustomGPT Actions (MCP)  │
            │                           │
            │  ┌─────────────────────┐ │
            │  │ Playwright MCP      │ │
            │  │ - Run tests         │ │
            │  │ - Capture results   │ │
            │  │ - Take screenshots  │ │
            │  │ - Generate reports  │ │
            │  └─────────────────────┘ │
            └─────────────┬─────────────┘
                          │
                          ↓
            ┌─────────────────────────┐
            │   Your Local Machine    │
            │                         │
            │  ├─ Playwright Tests    │
            │  ├─ Test Results        │
            │  ├─ Screenshots         │
            │  └─ Coverage Reports    │
            └─────────────────────────┘
```

---

## 🔧 **Implementation Options**

### **Option 1: OpenAI Actions + Playwright API** ⭐ (Recommended)

**How it works**:
1. Create a Playwright API server on your machine
2. Configure CustomGPT Actions to call the API
3. BMAD agents trigger tests via Actions
4. Results flow back to CustomGPT
5. Agents analyze and iterate

**Pros**:
- ✅ Fully autonomous
- ✅ Real-time results
- ✅ Iterative improvements
- ✅ Complete integration

**Cons**:
- Requires local API server
- Need API key/auth

---

### **Option 2: GitHub Actions + Webhook** (CI/CD Integration)

**How it works**:
1. BMAD Dev commits tests to GitHub
2. CustomGPT triggers GitHub Actions via webhook
3. Tests run in CI/CD
4. Results posted back to CustomGPT
5. Agents analyze results

**Pros**:
- ✅ Cloud-based execution
- ✅ No local server needed
- ✅ CI/CD integration
- ✅ Scalable

**Cons**:
- Slower (CI queue times)
- Need GitHub setup

---

### **Option 3: Zapier/Make + Playwright Cloud** (No-Code)

**How it works**:
1. CustomGPT triggers Zapier webhook
2. Zapier runs tests on Playwright Cloud
3. Results sent back to CustomGPT
4. Agents analyze

**Pros**:
- ✅ No coding required
- ✅ Cloud execution
- ✅ Easy setup

**Cons**:
- Cost for Playwright Cloud
- Less control

---

## 🚀 **Option 1 Implementation: Playwright API Server**

This is the **best option** for full autonomy. Here's how to set it up:

### **Step 1: Create Playwright API Server** (15 minutes)

**File**: `playwright-api-server.js`

```javascript
const express = require('express')
const { exec } = require('child_process')
const path = require('path')
const fs = require('fs').promises
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3007

app.use(cors())
app.use(express.json())

// Store test results
let latestResults = {
  status: 'idle',
  timestamp: null,
  results: null,
  coverage: null,
  screenshots: []
}

/**
 * POST /api/playwright/run
 * Run Playwright tests
 */
app.post('/api/playwright/run', async (req, res) => {
  const {
    testFile,       // Optional: specific test file
    project,        // Optional: browser project (chromium, firefox, webkit)
    grep,           // Optional: test name pattern
    workers,        // Optional: parallel workers
    config          // Optional: custom config
  } = req.body

  try {
    latestResults.status = 'running'
    latestResults.timestamp = new Date().toISOString()

    // Build Playwright command
    let command = 'npx playwright test'

    if (testFile) command += ` ${testFile}`
    if (project) command += ` --project=${project}`
    if (grep) command += ` --grep="${grep}"`
    if (workers) command += ` --workers=${workers}`
    if (config) command += ` --config=${config}`

    command += ' --reporter=json'

    console.log(`🎭 Running: ${command}`)

    exec(command, { cwd: __dirname }, async (error, stdout, stderr) => {
      try {
        // Parse test results
        const resultsPath = path.join(__dirname, 'test-results', 'results.json')
        const resultsExist = await fs.access(resultsPath).then(() => true).catch(() => false)

        let testResults = null
        if (resultsExist) {
          const resultsContent = await fs.readFile(resultsPath, 'utf-8')
          testResults = JSON.parse(resultsContent)
        }

        // Get screenshots
        const screenshotsDir = path.join(__dirname, 'test-results')
        const screenshots = await getScreenshots(screenshotsDir)

        // Get coverage if available
        const coverage = await getCoverage()

        latestResults = {
          status: error ? 'failed' : 'passed',
          timestamp: new Date().toISOString(),
          command,
          results: testResults,
          coverage,
          screenshots,
          error: error ? {
            message: error.message,
            stdout,
            stderr
          } : null
        }

        console.log(`✅ Tests completed: ${latestResults.status}`)

      } catch (parseError) {
        console.error('Error parsing results:', parseError)
        latestResults.status = 'error'
        latestResults.error = parseError.message
      }
    })

    // Return immediately with job started
    res.json({
      message: 'Tests started',
      jobId: latestResults.timestamp,
      statusUrl: `/api/playwright/status`
    })

  } catch (err) {
    console.error('Error starting tests:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/playwright/status
 * Get current test status and results
 */
app.get('/api/playwright/status', (req, res) => {
  res.json(latestResults)
})

/**
 * GET /api/playwright/results
 * Get detailed test results with analysis
 */
app.get('/api/playwright/results', async (req, res) => {
  try {
    const analysis = analyzeResults(latestResults.results)

    res.json({
      ...latestResults,
      analysis
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/playwright/generate-tests
 * Generate test files from BMAD agent output
 */
app.post('/api/playwright/generate-tests', async (req, res) => {
  const { testCode, fileName, type } = req.body

  try {
    const testsDir = path.join(__dirname, 'tests', 'e2e', 'bmad-generated')
    await fs.mkdir(testsDir, { recursive: true })

    const filePath = path.join(testsDir, fileName)
    await fs.writeFile(filePath, testCode, 'utf-8')

    console.log(`✅ Generated test file: ${fileName}`)

    res.json({
      message: 'Test file created',
      path: filePath,
      fileName
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * Helper: Get screenshots from test results
 */
async function getScreenshots(dir) {
  try {
    const files = await fs.readdir(dir, { recursive: true })
    const screenshots = files.filter(f => f.endsWith('.png'))

    return screenshots.map(s => ({
      path: path.join(dir, s),
      name: path.basename(s)
    }))
  } catch {
    return []
  }
}

/**
 * Helper: Get coverage data
 */
async function getCoverage() {
  try {
    const coveragePath = path.join(__dirname, 'coverage', 'coverage-summary.json')
    const coverageContent = await fs.readFile(coveragePath, 'utf-8')
    return JSON.parse(coverageContent)
  } catch {
    return null
  }
}

/**
 * Helper: Analyze test results
 */
function analyzeResults(results) {
  if (!results) return null

  const totalTests = results.suites.reduce((acc, suite) =>
    acc + suite.specs.length, 0
  )

  const passedTests = results.suites.reduce((acc, suite) =>
    acc + suite.specs.filter(s => s.ok).length, 0
  )

  const failedTests = totalTests - passedTests

  const failures = results.suites.flatMap(suite =>
    suite.specs
      .filter(spec => !spec.ok)
      .map(spec => ({
        title: spec.title,
        file: spec.file,
        error: spec.tests[0]?.results[0]?.error?.message
      }))
  )

  return {
    total: totalTests,
    passed: passedTests,
    failed: failedTests,
    passRate: ((passedTests / totalTests) * 100).toFixed(1) + '%',
    duration: results.stats?.duration || 0,
    failures
  }
}

app.listen(PORT, () => {
  console.log(`🎭 Playwright API Server running on http://localhost:${PORT}`)
  console.log(`📊 Status endpoint: http://localhost:${PORT}/api/playwright/status`)
  console.log(`🚀 Run tests: POST http://localhost:${PORT}/api/playwright/run`)
})
```

---

### **Step 2: Create OpenAPI Specification** (5 minutes)

**File**: `playwright-api-openapi.yaml`

```yaml
openapi: 3.0.0
info:
  title: Playwright Test Execution API
  version: 1.0.0
  description: API for autonomous Playwright test execution via BMAD CustomGPT

servers:
  - url: http://localhost:3007
    description: Local development server

paths:
  /api/playwright/run:
    post:
      summary: Run Playwright tests
      operationId: runPlaywrightTests
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
              properties:
                testFile:
                  type: string
                  description: Specific test file to run
                  example: "tests/e2e/partner-flow/happy-path.spec.ts"
                project:
                  type: string
                  description: Browser project (chromium, firefox, webkit)
                  example: "chromium"
                grep:
                  type: string
                  description: Test name pattern to match
                  example: "Partner login"
                workers:
                  type: integer
                  description: Number of parallel workers
                  example: 4
      responses:
        '200':
          description: Tests started successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                  jobId:
                    type: string
                  statusUrl:
                    type: string

  /api/playwright/status:
    get:
      summary: Get test execution status and results
      operationId: getTestStatus
      responses:
        '200':
          description: Current test status
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    enum: [idle, running, passed, failed, error]
                  timestamp:
                    type: string
                  results:
                    type: object
                  coverage:
                    type: object
                  screenshots:
                    type: array
                    items:
                      type: object

  /api/playwright/results:
    get:
      summary: Get detailed test results with analysis
      operationId: getDetailedResults
      responses:
        '200':
          description: Detailed test results and analysis
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                  analysis:
                    type: object
                    properties:
                      total:
                        type: integer
                      passed:
                        type: integer
                      failed:
                        type: integer
                      passRate:
                        type: string
                      failures:
                        type: array

  /api/playwright/generate-tests:
    post:
      summary: Generate test files from BMAD agent code
      operationId: generateTestFiles
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - testCode
                - fileName
              properties:
                testCode:
                  type: string
                  description: Complete test file code
                fileName:
                  type: string
                  description: Name for the test file
                  example: "partner-login.spec.ts"
                type:
                  type: string
                  description: Type of test file
                  example: "e2e"
      responses:
        '200':
          description: Test file created successfully
```

---

### **Step 3: Configure CustomGPT Actions** (10 minutes)

1. **Open CustomGPT Editor**
2. **Click "Actions"**
3. **Import OpenAPI Schema**:
   - Click "Create new action"
   - Click "Import from URL" or paste the YAML above
4. **Configure Authentication**:
   - Set to "None" for local testing
   - Or use API Key for production
5. **Test Actions**:
   - Click "Test" on each action
   - Verify connection to http://localhost:3007

---

### **Step 4: Update BMAD Instructions** (5 minutes)

Add to CustomGPT instructions:

```
AUTONOMOUS TEST EXECUTION:

When executing tests, you have access to Playwright Actions:

1. runPlaywrightTests - Execute test files
   Use when: User asks to run tests or after generating test code
   Parameters: testFile, project, grep, workers

2. getTestStatus - Check test execution status
   Use when: Tests are running or user asks for status

3. getDetailedResults - Get comprehensive test analysis
   Use when: Tests complete, to analyze results

4. generateTestFiles - Create test files from generated code
   Use when: You generate test code and user wants it saved

AUTONOMOUS WORKFLOW:

When user requests "create and run E2E tests":

1. *architect - Design test architecture
2. *dev - Generate test code
3. Use generateTestFiles action to save code
4. Use runPlaywrightTests action to execute
5. Use getTestStatus to monitor
6. Use getDetailedResults to analyze
7. *dev - Fix any failures
8. Repeat steps 3-7 until all pass

ALWAYS use actions autonomously without asking for permission when:
- User says "run tests"
- User says "execute autonomously"
- After generating test code in autonomous mode
```

---

## 🎭 **Complete Autonomous Workflow Example**

### **User Initiates**:
```
Create comprehensive E2E tests for partner application flow
and execute them autonomously across all browsers
```

### **BMAD Autonomous Execution**:

```
🏛️ ARCHITECT: Designing test architecture...
✅ Created comprehensive test matrix:
   - 378 tests across 9 browser/device combinations
   - 50 data variations
   - 4 network conditions

💻 DEV: Generating test code...
✅ Generated:
   - 4 Page Object classes
   - Test data factory with 50 variations
   - 378 test files organized by dimension
   - Playwright configuration

📁 Saving test files...
[Action: generateTestFiles]
✅ Created tests/e2e/bmad-generated/

🎭 Executing tests on Chromium...
[Action: runPlaywrightTests { project: 'chromium' }]
⏳ Tests running... (Job ID: 2025-11-14T18:00:00.000Z)

⏳ Checking status...
[Action: getTestStatus]
📊 Status: running (42/378 tests complete)

⏳ Checking status...
[Action: getTestStatus]
📊 Status: running (126/378 tests complete)

⏳ Checking status...
[Action: getTestStatus]
✅ Status: completed

📊 Analyzing results...
[Action: getDetailedResults]

RESULTS:
✅ Passed: 356/378 (94.2%)
❌ Failed: 22/378 (5.8%)
⏱️ Duration: 12 min 34 sec

FAILURES:
1. Mobile Safari - Step 2 validation (iOS keyboard issue)
2. Firefox - Combobox slow on Slow 3G (timeout)
3. WebKit - Dashboard loading race condition

💻 DEV: Fixing identified issues...
✅ Fixed:
   - Added 200ms delay for iOS keyboard
   - Increased timeout for Slow 3G to 45s
   - Added explicit wait for dashboard API

🎭 Re-running failed tests...
[Action: runPlaywrightTests { grep: 'Mobile Safari|Firefox.*3G|WebKit.*dashboard' }]

📊 FINAL RESULTS:
✅ ALL 378 TESTS PASSING (100%)
⏱️ Total execution time: 18 min 42 sec

📈 COVERAGE:
- Statement: 96.7%
- Branch: 93.2%
- Function: 97.1%

✅ E2E test suite complete and validated!
```

---

## 📊 **What Makes This Autonomous**

| Traditional Approach | BMAD Autonomous |
|---------------------|-----------------|
| Developer designs tests | ✅ Architect agent designs |
| Developer writes code | ✅ Dev agent generates |
| Developer runs manually | ✅ **Action auto-executes** |
| Developer checks results | ✅ **Action fetches results** |
| Developer fixes failures | ✅ Dev agent auto-fixes |
| Developer re-runs | ✅ **Action auto-reruns** |
| Developer analyzes coverage | ✅ Analyst provides insights |

**Key Difference**: Actions enable **true autonomy** - no human intervention needed!

---

## 🚀 **Setup Instructions**

### **Complete Setup** (30 minutes)

1. **Install Dependencies** (5 min)
   ```bash
   cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab
   npm install express cors
   ```

2. **Create API Server** (10 min)
   - Copy `playwright-api-server.js` to project root
   - Test: `node playwright-api-server.js`
   - Verify: http://localhost:3007/api/playwright/status

3. **Configure CustomGPT** (10 min)
   - Open CustomGPT editor
   - Add Actions (import YAML)
   - Update instructions
   - Test actions

4. **Test Autonomous Flow** (5 min)
   ```
   Run all partner flow tests on Chromium
   ```

   BMAD should:
   - Use runPlaywrightTests action
   - Monitor with getTestStatus
   - Report results automatically

---

## 💡 **Advanced Features**

### **1. Parallel Multi-Browser Execution**

```
BMAD: I'll run tests on all browsers in parallel...

[Action: runPlaywrightTests { project: 'chromium', workers: 4 }]
[Action: runPlaywrightTests { project: 'firefox', workers: 4 }]
[Action: runPlaywrightTests { project: 'webkit', workers: 4 }]

Chromium: ✅ 378/378 passed (12min 34s)
Firefox: ✅ 376/378 passed (13min 12s) - 2 failures
WebKit: ✅ 375/378 passed (14min 05s) - 3 failures

Total: 1129/1134 tests passed (99.6%)
```

### **2. Continuous Monitoring**

```
BMAD: Setting up continuous test monitoring...

I'll run the full suite every hour and alert you of any failures.
[Scheduled Action: runPlaywrightTests every 60 minutes]
```

### **3. Intelligent Test Selection**

```
User: Run only the tests affected by my recent changes

BMAD: Analyzing git diff to identify affected tests...
Changed files: partners-portal/app/apply/page.tsx

Running tests for ApplicationFormPage:
- tests/e2e/partner-flow/01-application-submission/
- tests/e2e/partner-flow/data-variations/

[Action: runPlaywrightTests { testFile: 'tests/e2e/partner-flow/01-*' }]
```

---

## ✅ **Summary**

With **BMAD + CustomGPT Actions + Playwright API**, you get:

✅ **Fully Autonomous Testing** - From design to execution to analysis
✅ **Real-Time Results** - Instant feedback in CustomGPT conversation
✅ **Auto-Healing Tests** - Dev agent fixes failures automatically
✅ **Multi-Dimensional Coverage** - 378 tests across all dimensions
✅ **Comprehensive Reports** - Coverage, screenshots, analysis
✅ **Zero Manual Work** - Complete hands-free operation

**Setup Time**: 30 minutes
**First Autonomous Run**: "Create and run E2E tests autonomously"
**Result**: 378 tests executed, analyzed, and validated automatically!

---

## 🎯 **Ready to Implement?**

1. ✅ Copy `playwright-api-server.js` to your project
2. ✅ Start server: `node playwright-api-server.js`
3. ✅ Configure CustomGPT Actions with OpenAPI spec
4. ✅ Test with: "Run all tests autonomously"

**Want me to help you set this up now?** I can create the files and guide you through the CustomGPT configuration! 🚀

---

**Prepared By**: Claude Code
**Date**: 2025-11-14 18:00 UTC
**Status**: ✅ Ready for Implementation
**Autonomy Level**: 💯 Fully Autonomous
