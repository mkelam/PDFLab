# Remaining Stories - Phase 1 & Phase 2

**Epic**: EPIC-001 - Staging Environment Recovery
**Status**: Stories outlined, ready for detailed implementation
**Purpose**: Quick reference for remaining stories in Phases 1 & 2

---

## Phase 1: Recovery (Remaining Stories)

### Story 001.4: Verify Staging Health and Connectivity
**Estimate**: 5 minutes | **Priority**: P0

**Tasks**:
- Test health endpoint: `curl http://141.136.44.168:3007/health`
- Test auth login endpoint
- Test database queries via API
- Verify Redis connectivity
- Document baseline metrics

**AC**:
- ✅ Health endpoint returns 200 OK
- ✅ Login endpoint responds (even if credentials invalid)
- ✅ Database queries execute successfully
- ✅ Redis cache operations work
- ✅ Baseline performance documented (response times)

---

### Story 001.5: Run Security Test Suite Validation
**Estimate**: 10 minutes | **Priority**: P0

**Tasks**:
- Navigate to test directory
- Run security tests: `npx cross-env TEST_ENV=staging npx playwright test integration/api/security.test.ts`
- Verify 17/17 tests pass
- Document any failures
- Take screenshot of results

**AC**:
- ✅ All 17 security tests passing (100%)
- ✅ No regressions from previous 100% pass rate
- ✅ Test execution time < 30 seconds
- ✅ Test results saved to [test-results/.last-run.json](../../test-results/.last-run.json)
- ✅ Ready to proceed to Phase 2

**Success Criteria for Phase 1**:
Once this story is complete, Phase 1 is DONE:
- Container: ✅ Running and healthy
- MySQL: ✅ Connected with wildcard permissions
- Security: ✅ 100% test pass rate maintained
- **Phase 2 UNBLOCKED** ✅

---

## Phase 2: Quick Wins

### Story 001.6: Seed Staging Test Data via SQL
**Estimate**: 1 hour | **Priority**: P1

**Purpose**: Populate staging database with comprehensive test data for all test scenarios

**Tasks**:
- Verify MySQL permissions from Story 001.2
- Copy seed script to VPS: `scp scripts/seed-staging-data.sql root@141.136.44.168:/tmp/`
- Execute script: `docker exec -i mysql-staging mysql -u pdflab_staging_new -p pdflab_staging < /tmp/seed-staging-data.sql`
- Verify data created: users, conversion_jobs, batch_jobs, feedback, beta_applications
- Document test user credentials

**AC**:
- ✅ 6 test users created (free, pro, enterprise, admin, beta, quota-exceeded)
- ✅ 3 conversion jobs created (completed, processing, failed)
- ✅ 2 batch jobs created
- ✅ 3 beta applications created
- ✅ 3 feedback entries created
- ✅ Test data documented in [scripts/seed-staging-data.sql](../../scripts/seed-staging-data.sql)

**Expected Impact**: +20 tests (44.5% → 56.7%)

---

### Story 001.7: Deploy Test Files to VPS
**Estimate**: 30 minutes | **Priority**: P1

**Purpose**: Copy real PDF test files to VPS for file upload testing

**Tasks**:
- Create test files directory on VPS: `mkdir -p /var/pdflab/test-files`
- Copy test files: `scp -r test-files/* root@141.136.44.168:/var/pdflab/test-files/`
- Verify files exist and are readable
- Update test config to use VPS file paths when TEST_ENV=staging
- Test file upload manually via curl

**AC**:
- ✅ Test files directory exists: `/var/pdflab/test-files/`
- ✅ All test PDFs copied (sample.pdf, large.pdf, corrupted.pdf, etc.)
- ✅ Files have correct permissions (readable by backend)
- ✅ Test config updated to use VPS paths
- ✅ Manual file upload test succeeds

**Expected Impact**: +15 tests (56.7% → 65.9%)

**Test Files Needed**:
- `sample.pdf` - Valid PDF (100KB)
- `large.pdf` - Large PDF (10MB)
- `corrupted.pdf` - Invalid PDF for error testing
- `scanned.pdf` - Image-based PDF for OCR testing
- `table.pdf` - PDF with tables for XLSX conversion
- `multi-page.pdf` - Multiple pages for merge testing

---

### Story 001.8: Fix API Response Format Mismatches
**Estimate**: 2 hours | **Priority**: P1

**Purpose**: Update tests to match actual API response formats

**Tasks**:
- Identify all response format mismatches (10 tests affected)
- Update feedback tests: `data.feedback.id` instead of `data.id`
- Update profile update tests: match actual response structure
- Update admin stats tests: match actual aggregate format
- Update error message assertions: match actual error strings
- Run tests after each fix to verify

**AC**:
- ✅ Feedback tests updated and passing
- ✅ Profile update tests updated and passing
- ✅ Admin stats tests updated and passing
- ✅ Error message tests updated and passing
- ✅ No regressions in previously passing tests

**Expected Impact**: +10 tests (65.9% → 72.0%)

**Files to Update**:
- `tests/integration/api/feedback-system.test.ts` (5 tests)
- `tests/integration/api/backend-endpoints.test.ts` (3 tests)
- `tests/integration/api/error-handling.test.ts` (2 tests)

---

### Story 001.9: Run and Document Full Test Suite
**Estimate**: 30 minutes | **Priority**: P1

**Purpose**: Execute complete test suite and document new baseline

**Tasks**:
- Run full integration test suite: `npx cross-env TEST_ENV=staging npx playwright test`
- Document results by category (security, backend, feedback, etc.)
- Calculate new pass rate
- Compare to previous baseline (44.5%)
- Identify remaining failures
- Create summary report

**AC**:
- ✅ Full test suite executed (all 164 tests)
- ✅ Pass rate ≥ 70% (115/164 tests)
- ✅ Results documented in markdown report
- ✅ Remaining failures categorized
- ✅ Next steps identified for Phase 3

**Expected Result**: **118/164 tests passing (72.0%)**

**Success Criteria for Phase 2**:
Once this story is complete, Phase 2 is DONE:
- Pass rate: 44.5% → 72.0% (+27.5% improvement)
- Test data: ✅ Seeded and available
- File uploads: ✅ Working
- Format mismatches: ✅ Fixed
- **Phase 3 READY** ✅

---

## Phase 3: Strategic Improvements (Overview)

### Story 001.10: Implement docker-compose for Staging
**Estimate**: 3 hours | **Priority**: P2
**Goal**: Create reproducible staging deployment with docker-compose.yml

### Story 001.11: Create Test Data Lifecycle Scripts
**Estimate**: 2 hours | **Priority**: P2
**Goal**: Automate test data seeding, cleanup, and reset

### Story 001.12: Separate Unit/Integration/E2E Tests
**Estimate**: 2 hours | **Priority**: P2
**Goal**: Reorganize tests into proper test pyramid structure

### Story 001.13: Document Staging Testing Strategy
**Estimate**: 1 hour | **Priority**: P2
**Goal**: Comprehensive testing strategy documentation

**Success Criteria for Phase 3**:
- Pass rate: 72.0% → 85.0% (+13% improvement)
- Infrastructure: ✅ Reproducible via docker-compose
- Test data: ✅ Automated lifecycle
- Tests: ✅ Properly organized
- Documentation: ✅ Complete

---

## Story Dependency Graph

```
PHASE 1 (Sequential)
001.1 → 001.2 → 001.3 → 001.4 → 001.5
  ↓       ↓       ↓       ↓       ↓
 30m     5m      10m     5m      10m
  └──────┴────────┴───────┴───────┘
                 Total: 60 minutes

PHASE 2 (Parallel after 001.5)
        ┌─ 001.6 (1h) ─┐
001.5 ──┼─ 001.7 (30m)─┼─→ 001.9 (30m)
        └─ 001.8 (2h) ─┘
          Total: 2h + 30m = 2.5h
         (Can run 001.6+001.7 parallel)

PHASE 3 (Parallel after 001.9)
        ┌─ 001.10 (3h) ─┐
001.9 ──┼─ 001.11 (2h) ─┼─→ COMPLETE
        ├─ 001.12 (2h) ─┤
        └─ 001.13 (1h) ─┘
          Total: 3h (all can run parallel)
```

---

## Quick Start Commands

**Phase 1 (Complete Recovery)**:
```bash
# Story 001.1
ssh root@141.136.44.168 "grep -r MYSQL_ROOT_PASSWORD /root/"

# Story 001.2
docker exec -it mysql-staging mysql -u root -p
CREATE USER 'pdflab_staging_new'@'%' IDENTIFIED BY 'StagingDB2024!UserPass';
GRANT ALL PRIVILEGES ON pdflab_staging.* TO 'pdflab_staging_new'@'%';
FLUSH PRIVILEGES;

# Story 001.3
docker start pdflab-backend-staging
docker logs -f pdflab-backend-staging

# Story 001.4
curl http://141.136.44.168:3007/health

# Story 001.5
cd tests && npx cross-env TEST_ENV=staging npx playwright test integration/api/security.test.ts
```

**Phase 2 (Quick Wins)**:
```bash
# Story 001.6
scp scripts/seed-staging-data.sql root@141.136.44.168:/tmp/
ssh root@141.136.44.168 "docker exec -i mysql-staging mysql -u pdflab_staging_new -p pdflab_staging < /tmp/seed-staging-data.sql"

# Story 001.7
scp -r test-files/* root@141.136.44.168:/var/pdflab/test-files/

# Story 001.8
# (Manual code updates in test files)

# Story 001.9
cd tests && npx cross-env TEST_ENV=staging npx playwright test
```

---

## Summary

**Total Stories**: 13 (5 detailed + 8 outlined)
**Total Effort**: 14 hours
**Expected ROI**: 23,333% (1 year)
**Blocked Revenue**: $420K/year

**Phase 1**: 60 minutes → Container healthy ✅
**Phase 2**: 4 hours → 72% pass rate ✅
**Phase 3**: 8 hours → 85% pass rate, sustainable infrastructure ✅

---

**Created**: 2025-11-20
**Scrum Master**: Bob (BMAD)
**Status**: Ready for implementation
