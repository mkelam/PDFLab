# How to Run Staging Tests CORRECTLY

**Your Insight**: "Staging tests should be done in the staging environment"
**Status**: ✅ You're absolutely right! Tests now run ON the VPS.

---

## ✅ Correct Approach

### WHERE Tests Run
**ON the VPS Server** (141.136.44.168) - same machine where staging is deployed

### WHY This Is Correct
- Tests run in the ACTUAL staging environment
- No network latency (localhost connections)
- Same machine, same network, same configuration
- True production-like testing

---

## 🚀 How to Run Tests (Simple 3 Steps)

### Step 1: SSH into the VPS

**WHERE**: Your Local Machine
```bash
ssh root@141.136.44.168
```

### Step 2: Navigate to Staging Directory

**WHERE**: VPS (after SSH)
```bash
cd /var/pdflab-staging/app
```

### Step 3: Run the Test Script

**WHERE**: VPS
```bash
bash run-tests-on-vps.sh
```

**That's it!** The script will:
1. Check if staging containers are running
2. Install dependencies if needed
3. Install Playwright browsers if needed
4. Run integration tests (fast)
5. Ask if you want to run E2E tests
6. Show you the results

---

## 📊 What the Script Does

```
🧪 PDFLab Staging Tests - Running ON VPS
==========================================

📦 Checking staging containers...
✅ Staging containers running

✅ Dependencies already installed

✅ Playwright browsers already installed

⏳ Waiting for services to be ready...

🔍 Testing backend health...
✅ Backend is healthy

🔍 Testing frontend...
✅ Frontend is responding

==========================================
🚀 Running Tests
==========================================

📝 Running integration tests...
  ✓ Health endpoint test (234ms)
  ✓ User registration test (567ms)
  ...
  63 passed (45s)

✅ Integration tests PASSED

📝 Run E2E tests? (y/n)
```

---

## 🎯 Manual Testing (If You Prefer)

### Option A: Run Integration Tests
**WHERE**: VPS (`/var/pdflab-staging/app`)
```bash
# Install dependencies first (only needed once)
npm install

# Install Playwright browsers (only needed once)
npx playwright install chromium

# Run integration tests
npm run test:integration
```

### Option B: Run E2E Tests
**WHERE**: VPS (`/var/pdflab-staging/app`)
```bash
# Run E2E tests (requires integration tests to pass first)
npm run test:e2e
```

### Option C: Run Specific Test File
**WHERE**: VPS (`/var/pdflab-staging/app`)
```bash
# Run single test file
npx playwright test tests/integration/api/backend-endpoints.test.ts
```

---

## 🔧 Configuration Files (Now Correct)

### tests/e2e/playwright.config.vps.ts
```typescript
use: {
  baseURL: 'http://localhost:3002', // ✅ localhost, not external IP
}
```

### tests/config/vps.config.ts
```typescript
export const vpsConfig = {
  mainAppUrl: 'http://localhost:3002',      // ✅ Same machine
  partnerPortalUrl: 'http://localhost:3003', // ✅ Same machine
  apiUrl: 'http://localhost:3007',           // ✅ Same machine
}
```

**Why localhost?**
- Tests run ON the VPS
- Services run in Docker ON the VPS
- Both are on the same machine
- localhost = fastest, most reliable

---

## ✅ What I Fixed

### Wrong Approach (Before)
```
Local Windows Machine
  ↓ (network request over internet)
VPS Staging (http://141.136.44.168:3002)
```
- Tests on local machine
- Network latency
- Firewall issues
- Not true staging environment

### Correct Approach (Now)
```
VPS Staging Machine
  ├─ Tests (running here)
  └─ Services (localhost:3002, localhost:3007)
```
- Tests ON the server
- localhost connections
- True staging environment
- Fast and reliable

---

## 📋 Complete Workflow

### First Time Setup
```bash
# 1. SSH into VPS
ssh root@141.136.44.168

# 2. Go to staging directory
cd /var/pdflab-staging/app

# 3. Run test script
bash run-tests-on-vps.sh
```

The script handles everything:
- Checks containers
- Installs dependencies
- Installs browsers
- Runs tests
- Saves logs

### Subsequent Test Runs
```bash
# SSH and run (dependencies already installed)
ssh root@141.136.44.168
cd /var/pdflab-staging/app
bash run-tests-on-vps.sh
```

### Quick Test (Already SSH'd)
```bash
# If you're already in /var/pdflab-staging/app
npm run test:integration
```

---

## 🐛 Troubleshooting

### "Cannot find module"
**Solution**: Install dependencies
```bash
cd /var/pdflab-staging/app
npm install
```

### "Chromium browser not found"
**Solution**: Install Playwright browsers
```bash
npx playwright install chromium
```

### "Connection refused to localhost:3002"
**Solution**: Check staging containers are running
```bash
docker ps | grep staging
# If not running:
cd deployment/staging
docker-compose -f docker-compose.staging.yml --env-file .env.staging up -d
```

### Tests timeout or hang
**Solution**: VPS might be low on resources
```bash
# Check system resources
free -h
top -bn1 | head -20

# Stop unnecessary containers if needed
docker stop container_name
```

---

## 📊 Expected Results

### Successful Run
```
==========================================
📊 Test Summary
==========================================

Integration tests: ✅ PASSED

Logs saved to:
  - test-integration-output.log
  - test-e2e-output.log

To view HTML report:
  npx playwright show-report
```

### Failed Run
```
❌ Integration tests FAILED
   Check test-integration-output.log for details
```

Then check:
```bash
# View logs
cat test-integration-output.log

# Check backend logs
docker logs pdflab-backend-staging

# Check database
docker exec -it pdflab-mysql-staging mysql -u root -p pdflab_staging
```

---

## ✅ Summary

**You were right**: Tests should run IN the staging environment, not FROM your local machine.

**Now setup correctly**:
- Tests run ON the VPS
- Hit localhost (same machine)
- True staging environment testing
- Simple 3-step process

**To run tests right now**:
```bash
ssh root@141.136.44.168
cd /var/pdflab-staging/app
bash run-tests-on-vps.sh
```

---

**Created**: 2025-11-15
**Status**: ✅ Corrected and ready to use
**Next Step**: SSH into VPS and run the test script
