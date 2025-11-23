# STAGING TEST EXECUTION - QUICK START GUIDE
**TL;DR for Busy Developers**
**Decision**: ✅ **PROCEED** with caution (skip performance tests)

---

## 🚦 GO/NO-GO: **CONDITIONAL GO** (78% Confidence)

**Safe to Run**: ✅ YES - Phases 1, 2, 5 (API tests only, ~30 mins)
**High Risk**: 🔴 NO - Phase 4 (Performance tests with 500 VUs)

---

## ⚡ FASTEST PATH TO TEST EXECUTION

### Prerequisites (2 minutes)
```bash
# 1. Check staging is up
ssh root@141.136.44.168 "docker ps | grep staging"

# 2. Verify PayFast sandbox mode
ssh root@141.136.44.168 "docker exec pdflab-backend-staging env | grep PAYFAST_MODE"
# Must show: PAYFAST_MODE=sandbox (if not, ABORT)

# 3. Set environment variables
export TEST_ENV=staging
export API_URL=http://141.136.44.168:3007
```

### Run Safe Tests (30 minutes)
```bash
# Phase 1: P0 Critical (8 mins)
node scripts/run-staging-tests.js --quick

# ⏸️ PAUSE - Check results, verify production OK

# Phase 2+5: Full API coverage (22 mins)
node scripts/run-staging-tests.js --api --skip-performance
```

### Monitor Production (parallel terminal)
```bash
# Keep this running while tests execute
while true; do curl -s https://pdflab.pro/api/health | jq -r '.status'; sleep 10; done
```

**IF PRODUCTION SHOWS "ERROR"**: Press `Ctrl+C` to abort tests immediately

---

## ⚠️ CRITICAL WARNINGS

### DON'T RUN THESE (High Risk)
```bash
# ❌ DON'T: Performance tests (500 VUs will crash VPS)
node scripts/run-staging-tests.js  # Includes stress tests

# ❌ DON'T: Soak test (30 minutes at high load)
k6 run tests/performance/soak-test.js
```

### DO RUN THESE (Low Risk)
```bash
# ✅ DO: P0 critical tests
node scripts/run-staging-tests.js --quick

# ✅ DO: API integration tests
node scripts/run-staging-tests.js --api --skip-performance
```

---

## 🚨 EMERGENCY ABORT PROCEDURE

If production health degrades:

```bash
# 1. Kill tests immediately
Ctrl+C
pkill -f "k6 run"
pkill -f "playwright"

# 2. Check production
curl https://pdflab.pro/api/health

# 3. If production down, restart
ssh root@141.136.44.168 "docker restart pdflab-backend-prod"
```

---

## 📊 WHAT TESTS DO

### Phase 1: P0 Critical (37 tests, 8 mins) ✅ SAFE
- **Payment flow** (15 tests) - PayFast sandbox, no real charges
- **CloudConvert** (12 tests) - Real API (~$0.12 cost)
- **Security** (17 tests) - XSS, SQL injection, auth

### Phase 2: P1 High (65 tests, 12 mins) ✅ SAFE
- **Backend API** (20 tests) - All endpoints
- **Error handling** (15 tests) - Edge cases
- **Tokens** (15 tests) - JWT lifecycle
- **Email** (15 tests) - SMTP integration

### Phase 5: P2 Medium (50 tests, 10 mins) ✅ SAFE
- **Beta users** (15 tests)
- **Batch processing** (16 tests)
- **Feedback** (19 tests)

### Phase 4: Performance (4 tests, 30 mins) 🔴 DANGEROUS
- **Load test** (50 VUs) - ⚠️ Medium risk
- **Stress test** (500 VUs) - 🔴 HIGH RISK - **SKIP THIS**
- **Spike test** - 🔴 HIGH RISK
- **Soak test** (30 mins) - 🔴 VERY HIGH RISK

**Why Skip Performance?** Staging shares same VPS as production (141.136.44.168). 500 concurrent users will spike CPU and crash both staging AND production.

---

## 🎯 SUCCESS CRITERIA

After tests complete:
- ✅ Pass rate > 95%
- ✅ Production health: 100% uptime
- ✅ Staging still running
- ✅ No CloudConvert quota exceeded
- ✅ Test report generated

---

## 🛠️ TROUBLESHOOTING

### "Connection refused" errors
```bash
# Check staging backend is up
ssh root@141.136.44.168 "docker ps | grep backend-staging"

# Restart if needed
ssh root@141.136.44.168 "docker restart pdflab-backend-staging"
```

### "PayFast payment created in production"
```bash
# ABORT TESTS - Wrong PayFast mode
# Fix staging environment:
ssh root@141.136.44.168
docker exec pdflab-backend-staging env | grep PAYFAST_MODE
# If not "sandbox", edit docker-compose and restart
```

### Tests hanging/timeout
```bash
# Check VPS resources
ssh root@141.136.44.168 "free -h && uptime"
# If CPU load > 3.0 or RAM < 500MB, abort tests
```

---

## 📈 WHAT HAPPENS NEXT

### After Successful Run
1. Review test report: `test-results/staging-test-results.json`
2. Fix any failed tests (create GitHub issues)
3. Update team: "Staging tests passed: X/Y tests"
4. Safe to proceed with deployment planning

### After Failed Run
1. Categorize failures: config vs code bugs
2. Fix critical issues immediately
3. Re-run tests: `node scripts/run-staging-tests.js --quick`
4. Don't proceed with production deployment until tests pass

---

## 🔗 FULL DOCUMENTATION

For complete risk assessment, see: [STAGING_TEST_EXECUTION_RISK_ASSESSMENT.md](STAGING_TEST_EXECUTION_RISK_ASSESSMENT.md)

---

**Quick Decision Tree**:
```
Have 30 minutes? → Run Phases 1, 2, 5 ✅
Have 8 minutes?  → Run Phase 1 only ✅
Need performance data? → Spin up separate VPS first 🔴
Production has users? → Run during off-peak hours ⚠️
Uncertain? → Run Phase 1 (P0 only), evaluate results 🟡
```

**Default Safe Command**:
```bash
node scripts/run-staging-tests.js --quick --skip-performance
```

---

**Last Updated**: 2025-11-19
**Status**: Ready for execution
**Risk Level**: 🟡 MEDIUM (with mitigation)
