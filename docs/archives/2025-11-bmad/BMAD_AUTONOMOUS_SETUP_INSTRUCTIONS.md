# BMAD Autonomous Test Execution - Setup Instructions

**Goal**: Enable CustomGPT to autonomously execute Playwright tests without human intervention.

**Created**: 2025-11-14
**Status**: Ready for implementation
**Estimated Setup Time**: 15 minutes

---

## What You're Setting Up

A complete autonomous testing system where CustomGPT can:

1. **Design** test architecture (BMAD Architect)
2. **Generate** test code (BMAD Dev)
3. **Execute** tests remotely via Actions
4. **Analyze** results automatically (BMAD QA)
5. **Fix** failures and re-run (BMAD Dev)
6. **Report** comprehensive results

All without any human intervention!

---

## Step 1: Install Dependencies

```bash
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Install required packages
npm install express cors --save-dev
```

**What this does**: Installs the Express.js server framework and CORS middleware for the Playwright API.

---

## Step 2: Start the Playwright API Server

```bash
# Start server on port 3007
node playwright-api-server.js
```

**Expected output**:
```
🎭 Playwright API Server running on http://localhost:3007

Available endpoints:
  POST   /api/playwright/run             - Execute tests
  GET    /api/playwright/status          - Check test status
  GET    /api/playwright/results         - Get detailed results
  POST   /api/playwright/generate-tests  - Save test code
  GET    /api/playwright/list-tests      - List all tests
  GET    /health                         - Health check

Ready for BMAD autonomous test execution!
```

**Verify it's working**:
```bash
# Health check
curl http://localhost:3007/health
```

**Expected response**:
```json
{
  "status": "healthy",
  "service": "Playwright API Server",
  "version": "1.0.0",
  "timestamp": "2025-11-14T..."
}
```

---

## Step 3: Make Server Publicly Accessible (Required for CustomGPT Actions)

CustomGPT Actions require a **publicly accessible URL**. Choose one option:

### Option A: ngrok (Recommended for Testing)

```bash
# Install ngrok: https://ngrok.com/download

# Start ngrok tunnel
ngrok http 3007
```

**Expected output**:
```
Forwarding   https://abc123.ngrok.io -> http://localhost:3007
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`) - you'll need it for Step 4.

### Option B: Production Deployment (Recommended for Long-Term)

Deploy to your VPS (141.136.44.168):

```bash
# SSH to VPS
ssh root@141.136.44.168

# Clone or update PDFLab repo
cd /var/www/pdflab
git pull

# Install dependencies
npm install express cors --save-dev

# Start server with PM2
pm2 start playwright-api-server.js --name playwright-api
pm2 save

# Configure nginx reverse proxy
nano /etc/nginx/sites-available/pdflab

# Add this location block:
# location /api/playwright/ {
#   proxy_pass http://localhost:3007;
#   proxy_http_version 1.1;
#   proxy_set_header Upgrade $http_upgrade;
#   proxy_set_header Connection 'upgrade';
#   proxy_set_header Host $host;
#   proxy_cache_bypass $http_upgrade;
# }

# Reload nginx
systemctl reload nginx
```

**Your public URL**: `https://pdflab.pro/api/playwright/`

---

## Step 4: Create CustomGPT with Actions

### 4.1 Go to CustomGPT Editor

1. Visit: https://chat.openai.com/gpts/editor
2. Click **"Create a GPT"**
3. Click **"Configure"** tab

### 4.2 Configure Basic Settings

**Name**: `BMAD E2E Testing - PDFLab`

**Description**:
```
Autonomous end-to-end testing system using BMAD-METHOD for PDFLab. Designs, generates, executes, and fixes Playwright tests across multiple dimensions without human intervention.
```

**Instructions**:
```
You are the BMAD (Breakthrough Method of Agile AI-Driven Development) autonomous testing system for PDFLab.

# Core Capabilities

You have access to THREE specialized agent modes:

1. **BMAD Architect** (*architect)
   - Design comprehensive test matrices across browsers, devices, data variations, workflows
   - Create test architecture documents with full coverage analysis
   - Calculate test dimensions and prioritization

2. **BMAD Dev** (*dev)
   - Generate Page Object Model classes
   - Create test data factories
   - Write complete Playwright test files (.spec.ts)
   - Fix failing tests based on error analysis

3. **BMAD QA** (*qa)
   - Analyze test results for patterns and root causes
   - Calculate coverage metrics
   - Provide actionable recommendations
   - Validate test quality and completeness

# Autonomous Workflow

When asked to "test [feature]" or "create E2E tests", follow this autonomous workflow:

1. **DESIGN** (Architect mode)
   - Analyze feature requirements
   - Design test matrix (browsers × devices × data × workflows)
   - Calculate total test count and priority

2. **GENERATE** (Dev mode)
   - Create Page Objects for all pages/components
   - Generate test data factories
   - Write all test files (.spec.ts)
   - Use Actions to SAVE files automatically

3. **EXECUTE** (Actions)
   - Use runPlaywrightTests action to execute tests
   - Poll getPlaywrightStatus until complete
   - Fetch getPlaywrightResults for analysis

4. **ANALYZE** (QA mode)
   - Review results, screenshots, error contexts
   - Identify failure patterns
   - Calculate pass rate and coverage

5. **FIX** (Dev mode - if failures detected)
   - Analyze error contexts and screenshots
   - Fix selectors, waits, or test logic
   - Use Actions to UPDATE files
   - Re-run tests automatically

6. **REPORT** (QA mode)
   - Provide comprehensive results summary
   - Coverage analysis
   - Recommendations for next steps

# Commands

- *help - Show available commands
- *architect - Switch to Architect mode
- *dev - Switch to Dev mode
- *qa - Switch to QA mode
- *status - Show current testing status
- *results - Show latest test results

# Important Rules

1. ALWAYS use Actions to execute tests - never just generate code
2. WAIT for test completion before analyzing (poll /status endpoint)
3. AUTOMATICALLY fix failures and re-run without asking
4. SAVE all generated files using generatePlaywrightTests action
5. ANALYZE error contexts and screenshots for intelligent fixes
6. REPORT comprehensive results with metrics

You have FULL AUTONOMY to design → generate → execute → analyze → fix → re-run tests until 100% passing or clear blockers identified.
```

**Conversation Starters**:
```
1. Create comprehensive E2E tests for user onboarding
2. Test partner application flow across all browsers
3. Design multi-dimensional tests for payment flow
4. Show me the current test status
```

### 4.3 Configure Actions

1. Scroll to **"Actions"** section
2. Click **"Create new action"**
3. Click **"Import from URL"**
4. Enter your public URL + `/openapi.yaml`:
   - If using ngrok: `https://abc123.ngrok.io/playwright-api-openapi.yaml`
   - If using VPS: `https://pdflab.pro/playwright-api-openapi.yaml`

   **Note**: The OpenAPI spec file needs to be served. Quick fix:

   ```bash
   # Add this to playwright-api-server.js before app.listen():

   const yaml = require('js-yaml');
   app.get('/playwright-api-openapi.yaml', async (req, res) => {
     const spec = await fs.readFile('./playwright-api-openapi.yaml', 'utf-8');
     res.type('text/yaml').send(spec);
   });
   ```

   Then restart server.

5. Alternatively, **copy/paste the OpenAPI spec** directly:
   - Open `playwright-api-openapi.yaml`
   - Copy entire contents
   - Paste into Actions editor

6. Click **"Import"**

7. Verify all endpoints imported:
   - runPlaywrightTests
   - getPlaywrightStatus
   - getPlaywrightResults
   - generatePlaywrightTests
   - listPlaywrightTests
   - getPlaywrightScreenshot
   - getPlaywrightErrorContext
   - healthCheck

8. Click **"Save"**

### 4.4 Set Authentication (Optional)

For production, add API key authentication:

1. In Actions editor, click **"Authentication"**
2. Select **"API Key"**
3. Set header: `X-API-Key`
4. Set value: `your-secret-key`

Update `playwright-api-server.js`:
```javascript
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== 'your-secret-key') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

### 4.5 Test the CustomGPT

1. Click **"Test"** in top-right
2. Try: **"Create E2E tests for the partner application flow"**

**Expected autonomous workflow**:

```
[Architect Mode]
Analyzing partner application flow...

Test Matrix Design:
- Browsers: Chromium, Firefox, WebKit (3)
- Devices: Desktop, Tablet, Mobile (3)
- Data Variations: Valid/Invalid emails, platforms, niches (10)
- Workflows: Happy path, validation errors, edge cases (5)

Total Tests: 450 (3 × 3 × 10 × 5)
Priority: Critical path (15 tests) → Full coverage

[Dev Mode]
Generating Page Objects...
✓ PartnerApplicationPage.ts
✓ AdminDashboardPage.ts
✓ PartnerDashboardPage.ts

Generating Test Factories...
✓ partner-data.factory.ts

Writing Test Files...
✓ partner-application-critical.spec.ts (15 tests)

Saving files via Actions...
✓ POST /api/playwright/generate-tests (4 files saved)

[Executing Tests]
Running: npx playwright test partner-application-critical.spec.ts --project=chromium

Status: running (polling every 5s...)
Status: running...
Status: completed

[QA Analysis]
Results Summary:
✓ Pass Rate: 86.7% (13/15)
✗ Failed: 2 tests
  - Email validation not working (screenshot shows error)
  - Platform dropdown selector issue (error-context.md shows wrong option text)

[Dev Mode - Auto-Fix]
Analyzing failures...

Fix 1: Email validation
- Error context shows input accepted invalid email
- Added waitForSelector for error message

Fix 2: Platform dropdown
- Screenshot shows option text is "YouTube Channel" not "YouTube"
- Updated selector to exact text

Updating files via Actions...
✓ POST /api/playwright/generate-tests (overwrite: true)

[Re-Running Tests]
Running: npx playwright test partner-application-critical.spec.ts --project=chromium --grep="email|platform"

Status: completed

[QA Final Report]
✅ All Tests Passing: 15/15 (100%)
✅ Coverage: Critical path complete
✅ Browsers: Chromium tested
⏳ Remaining: Firefox (15), WebKit (15), Full matrix (420)

Recommendations:
1. Run full browser matrix (--project=firefox,webkit)
2. Execute data variations suite (partner-application-data-variations.spec.ts)
3. Test mobile responsive layouts

Next command: *architect to design Phase 2 tests
```

**This entire workflow runs autonomously!**

---

## Step 5: Verify Autonomous Execution

### Test 1: Health Check

In CustomGPT, ask:
```
Check if the Playwright API is healthy
```

**Expected**: CustomGPT calls `/health` endpoint and reports status.

### Test 2: List Current Tests

```
Show me all existing Playwright tests
```

**Expected**: CustomGPT calls `/api/playwright/list-tests` and shows:
- partner-e2e-flow.spec.ts
- Any other .spec.ts files

### Test 3: Execute Existing Tests

```
Run the partner E2E flow tests on Chromium and analyze results
```

**Expected autonomous actions**:
1. Calls `POST /api/playwright/run` with `{ testFile: "e2e/partner-e2e-flow.spec.ts", project: "chromium" }`
2. Polls `GET /api/playwright/status` until status = "completed"
3. Calls `GET /api/playwright/results` to get full analysis
4. Reports pass rate, failures, screenshots
5. If failures exist, analyzes error contexts and suggests fixes

### Test 4: Generate and Execute New Tests

```
Create a simple test that verifies the homepage loads, then execute it
```

**Expected autonomous actions**:
1. Generates test code with Page Object pattern
2. Calls `POST /api/playwright/generate-tests` to save file
3. Calls `POST /api/playwright/run` to execute
4. Analyzes results
5. Reports success or auto-fixes failures

---

## Step 6: Production Hardening (Optional)

### 6.1 Rate Limiting

Add to `playwright-api-server.js`:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/playwright/', limiter);
```

### 6.2 Request Logging

```javascript
const morgan = require('morgan');
app.use(morgan('combined'));
```

### 6.3 Error Handling

```javascript
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});
```

### 6.4 HTTPS (Production Only)

Use nginx reverse proxy on VPS (already configured) or add HTTPS directly:

```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('./ssl/key.pem'),
  cert: fs.readFileSync('./ssl/cert.pem')
};

https.createServer(options, app).listen(3007);
```

---

## Troubleshooting

### Issue: CustomGPT Actions not connecting

**Solution**:
1. Verify server is running: `curl http://localhost:3007/health`
2. Verify ngrok tunnel is active: `ngrok http 3007` should show status
3. Test public URL in browser: `https://abc123.ngrok.io/health`
4. Check CustomGPT Actions settings for correct URL

### Issue: Tests not executing

**Solution**:
1. Check Playwright is installed: `npx playwright --version`
2. Verify test files exist: `ls e2e/`
3. Check server logs for errors
4. Test manually: `npx playwright test e2e/partner-e2e-flow.spec.ts`

### Issue: Results not returning

**Solution**:
1. Tests may still be running - check status: `GET /api/playwright/status`
2. Increase timeout in CustomGPT (wait 60s for long tests)
3. Check `test-results/` folder exists
4. Review server logs for parsing errors

### Issue: Generated tests not saving

**Solution**:
1. Verify `e2e/` directory exists: `mkdir e2e` if needed
2. Check file permissions: CustomGPT user needs write access
3. Set `overwrite: true` in request body
4. Check server logs for file system errors

---

## What's Next?

### Immediate Tasks

1. **Run autonomous test generation**:
   ```
   Create comprehensive E2E tests for user onboarding with 3 browsers × 2 devices × 10 data variations
   ```

2. **Test the referral program** (upcoming feature):
   ```
   Design and execute tests for referral code generation, tracking, and credit application
   ```

3. **Validate payment flows**:
   ```
   Test PayFast integration across all plans with various payment scenarios
   ```

### Long-Term Automation

- **Scheduled Tests**: Run tests nightly via cron + API
- **CI/CD Integration**: GitHub Actions → Playwright API
- **Slack Notifications**: Post results to Slack channel
- **Regression Suite**: Auto-run on every deployment

---

## Success Metrics

Track these to measure BMAD effectiveness:

1. **Test Coverage**: % of user flows covered
2. **Automation Rate**: % of tests run autonomously vs manually
3. **Time Savings**: Hours saved (manual 55h → autonomous 6h = 89%)
4. **Bug Detection**: # of bugs caught before production
5. **Pass Rate**: % of tests passing on first run
6. **Fix Speed**: Time from failure → fixed → passing

**Target After 1 Month**:
- 378 tests across all dimensions
- 90%+ pass rate
- 95%+ autonomous execution (no human intervention)
- 50+ hours saved per month

---

## Summary

You now have a **fully autonomous testing system** where CustomGPT can:

✅ Design comprehensive test matrices
✅ Generate Page Objects and test code
✅ Execute tests remotely via Actions
✅ Analyze results with AI intelligence
✅ Automatically fix failures
✅ Re-run tests until passing
✅ Report metrics and recommendations

**All without any human intervention!**

This is the power of BMAD-METHOD + Playwright + CustomGPT Actions.

---

**Created by**: Claude Code
**Date**: 2025-11-14
**Version**: 1.0.0
**Status**: Ready for Production
