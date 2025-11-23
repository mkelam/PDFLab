# BMAD Autonomous Testing - Quick Start Guide

**Status**: ✅ Server Running | ⏳ CustomGPT Configuration Needed
**Time to First Autonomous Test**: 15 minutes

---

## ✅ What's Already Done

Your Playwright API Server is **running and ready**:

```
🎭 Playwright API Server: http://localhost:3007
📊 Status: HEALTHY
🧪 Test Files: 4 ready for execution
⚡ Endpoints: 8 operational
```

**Verify**:
```bash
curl http://localhost:3007/health
# Should return: {"status":"healthy",...}
```

---

## 🚀 Next: Configure CustomGPT (15 minutes)

### Option 1: Quick Test (ngrok) - Recommended First

#### Step 1: Install ngrok
Download from: https://ngrok.com/download
```bash
# Windows
choco install ngrok

# Or download .zip and extract to PATH
```

#### Step 2: Start ngrok
```bash
ngrok http 3007
```

**Copy the HTTPS URL** shown (e.g., `https://abc123.ngrok-free.app`)

#### Step 3: Create CustomGPT

1. Go to: https://chat.openai.com/gpts/editor
2. Click **"Create a GPT"**
3. Switch to **"Configure"** tab

**Name**:
```
BMAD E2E Testing - PDFLab
```

**Description**:
```
Autonomous end-to-end testing system using BMAD-METHOD. Designs, generates, executes, and fixes Playwright tests without human intervention.
```

**Instructions**: (Copy the full instructions from BMAD_AUTONOMOUS_SETUP_INSTRUCTIONS.md or use this condensed version)

```
You are the BMAD autonomous testing system for PDFLab.

CORE CAPABILITIES:
- *architect - Design comprehensive test matrices
- *dev - Generate Page Objects and test code
- *qa - Analyze results and provide recommendations

AUTONOMOUS WORKFLOW:
When user says "create E2E tests" or "test [feature]":

1. DESIGN (*architect)
   - Analyze feature requirements
   - Create test matrix (browsers × devices × data × workflows)
   - Calculate test count and priority

2. GENERATE (*dev)
   - Create Page Objects for all pages
   - Generate test data factories
   - Write all test files (.spec.ts)
   - Use generatePlaywrightTests action to save

3. EXECUTE (Actions)
   - Use runPlaywrightTests action
   - Poll getPlaywrightStatus until complete
   - Fetch getPlaywrightResults for analysis

4. ANALYZE (*qa)
   - Review results, screenshots, error contexts
   - Identify failure patterns
   - Calculate coverage metrics

5. FIX (*dev - if failures)
   - Analyze error contexts
   - Fix selectors, waits, or logic
   - Use generatePlaywrightTests to update
   - Re-run automatically

6. REPORT (*qa)
   - Comprehensive results summary
   - Coverage analysis
   - Next steps recommendations

IMPORTANT RULES:
- ALWAYS use Actions to execute tests
- WAIT for completion before analyzing
- AUTOMATICALLY fix failures and re-run
- SAVE all generated files
- PROVIDE metrics with every report

You have FULL AUTONOMY to iterate until 100% passing or blockers identified.
```

**Conversation Starters**:
```
1. Run all partner flow tests autonomously
2. Create E2E tests for user onboarding
3. Show me the current test status
4. Design comprehensive payment flow tests
```

#### Step 4: Configure Actions

1. Scroll to **"Actions"** section
2. Click **"Create new action"**
3. Click **"Import from URL"**
4. Enter: `YOUR_NGROK_URL/playwright-api-openapi.yaml`
   - Example: `https://abc123.ngrok-free.app/playwright-api-openapi.yaml`

**NOTE**: The YAML file needs to be served. Quick fix:

Add to `playwright-api-server.js` before `app.listen()`:
```javascript
const yaml = require('js-yaml');
app.get('/playwright-api-openapi.yaml', async (req, res) => {
  const spec = await fs.readFile('./playwright-api-openapi.yaml', 'utf-8');
  res.type('text/yaml').send(spec);
});
```

Then restart server:
```bash
# Kill current server (Ctrl+C in shell bf3636)
# Or find and kill process
tasklist | findstr node
taskkill /PID <process_id> /F

# Restart
node playwright-api-server.js
```

**Alternative**: Copy/paste the OpenAPI spec directly:
- Open [playwright-api-openapi.yaml](playwright-api-openapi.yaml)
- Copy entire contents
- Paste into CustomGPT Actions editor

5. Verify all endpoints imported:
   - ✅ runPlaywrightTests
   - ✅ getPlaywrightStatus
   - ✅ getPlaywrightResults
   - ✅ generatePlaywrightTests
   - ✅ listPlaywrightTests
   - ✅ getPlaywrightScreenshot
   - ✅ getPlaywrightErrorContext
   - ✅ healthCheck

6. Click **"Save"**

#### Step 5: Test Autonomous Execution

In CustomGPT, try:

```
Run the partner E2E flow tests autonomously on Chromium
```

**Expected autonomous workflow**:
1. CustomGPT calls `POST /api/playwright/run`
2. Polls `GET /api/playwright/status` until done
3. Fetches `GET /api/playwright/results`
4. Analyzes pass rate (current: 4/7 = 57.1%)
5. Reviews error screenshots and contexts
6. Suggests fixes for failing tests

**Or try full autonomous generation**:
```
Create comprehensive E2E tests for user authentication
and execute them autonomously
```

**Expected**:
1. Architect designs test matrix
2. Dev generates Page Objects and tests
3. Saves files via `generatePlaywrightTests` action
4. Executes via `runPlaywrightTests` action
5. Analyzes results
6. Fixes any failures automatically
7. Re-runs until 100% passing

---

## 📊 Test the API Manually (Before CustomGPT)

### 1. Check Health
```bash
curl http://localhost:3007/health
```

### 2. List Available Tests
```bash
curl http://localhost:3007/api/playwright/list-tests
```

### 3. Run Partner Flow Tests
```bash
curl -X POST http://localhost:3007/api/playwright/run \
  -H "Content-Type: application/json" \
  -d "{\"testFile\":\"e2e/partner-e2e-flow.spec.ts\",\"project\":\"chromium\"}"
```

### 4. Check Status (poll every 5 seconds)
```bash
curl http://localhost:3007/api/playwright/status
```

### 5. Get Detailed Results
```bash
curl http://localhost:3007/api/playwright/results
```

---

## 🐛 Troubleshooting

### Issue: ngrok URL not accessible
**Solution**:
```bash
# Check ngrok is running
ngrok http 3007

# Verify forwarding URL is HTTPS
# Test in browser: https://abc123.ngrok-free.app/health
```

### Issue: Actions import fails
**Solution**:
- Use copy/paste method instead of URL import
- Ensure OpenAPI YAML is valid (test at https://editor.swagger.io)

### Issue: Tests not executing
**Solution**:
```bash
# Verify Playwright is installed
npx playwright --version

# Verify test files exist
dir e2e\*.spec.ts

# Test manually
npx playwright test e2e/partner-e2e-flow.spec.ts --project=chromium
```

### Issue: CustomGPT doesn't use Actions
**Solution**:
- Verify Actions are saved and enabled
- Check instructions include "Use runPlaywrightTests action"
- Try explicit: "Use the runPlaywrightTests action to run tests"

---

## 🎯 Success Criteria

You'll know it's working when:

✅ CustomGPT says: "Using runPlaywrightTests action..."
✅ Server logs show: `POST /api/playwright/run`
✅ CustomGPT reports: "Tests started, monitoring status..."
✅ CustomGPT provides: Pass rate, failures, recommendations
✅ CustomGPT auto-fixes failures and re-runs

---

## 📈 Next Steps After First Success

### Immediate:
1. ✅ First autonomous test run successful
2. Generate comprehensive test suite: "Create E2E tests for all features"
3. Run full browser matrix: "Run on Chromium, Firefox, and WebKit"

### This Week:
1. Test data variations: "Test with 50 data combinations"
2. Responsive layouts: "Test on Desktop, Tablet, Mobile"
3. Network conditions: "Test on Fast 4G, Slow 3G, Offline"

### This Month:
1. Deploy API server to VPS (production)
2. Schedule nightly autonomous test runs
3. Integrate with CI/CD pipeline
4. Set up Slack notifications

---

## 🚀 **You're Ready!**

**Current Status**:
```
✅ Playwright API Server: Running on port 3007
✅ Test Files: 4 ready for execution
✅ Documentation: Complete with examples
✅ OpenAPI Spec: Ready for CustomGPT import

⏳ Next: Configure CustomGPT Actions (15 min)
🎯 Result: Fully autonomous E2E testing
```

**Time Investment**: 15 minutes
**Expected Outcome**: CustomGPT autonomously designs, generates, executes, and fixes tests

**Let's make testing autonomous!** 🎭🤖

---

**Quick Links**:
- [Full Setup Guide](BMAD_AUTONOMOUS_SETUP_INSTRUCTIONS.md)
- [Implementation Complete](BMAD_AUTONOMOUS_IMPLEMENTATION_COMPLETE.md)
- [OpenAPI Spec](playwright-api-openapi.yaml)
- [API Server Code](playwright-api-server.js)
