# Epic 001: Staging Environment Recovery & Stabilization

**Status**: 🔴 BLOCKED - Container Down
**Priority**: P0 - CRITICAL
**Owner**: James (Dev)
**Business Value**: $420K/year in Phase 2 features, 80% reduction in production deployment risk

---

## Epic Summary

Restore and stabilize the staging environment to enable confident feature development and deployment. Currently, the staging container is down due to MySQL permission issues, blocking all testing and Phase 2 feature work.

## Current State

- **Staging Container**: 🔴 DOWN (MySQL connection denied)
- **Test Pass Rate**: 44.5% (73/164 tests)
- **Security Tests**: ✅ 100% (17/17) - SOLID FOUNDATION
- **Blocker**: MySQL user permissions tied to specific IPs, not wildcards

## Target State

- **Staging Container**: ✅ UP and healthy
- **Test Pass Rate**: 85% (140/164 tests, excluding 27 intentionally skipped)
- **Infrastructure**: Reproducible deployments via docker-compose
- **Test Data**: Automated seeding and cleanup

## Epic Phases

### Phase 1: Recovery (2 hours) - P0 🚨
**Stories**: 001.1 → 001.5
**Goal**: Get staging container running and healthy
**Success**: Container UP, security tests passing (17/17)

### Phase 2: Quick Wins (4 hours) - P1 🎯
**Stories**: 001.6 → 001.9
**Goal**: Improve test pass rate with minimal effort
**Success**: 70% pass rate (115/164 tests)

### Phase 3: Strategic Improvements (8 hours) - P2 🏗️
**Stories**: 001.10 → 001.13
**Goal**: Build sustainable testing infrastructure
**Success**: 85% pass rate, automated test data management

## Story List

| Story | Title | Phase | Effort | Status |
|-------|-------|-------|--------|--------|
| 001.1 | Locate MySQL root password | 1 | 30m | 🔴 TODO |
| 001.2 | Grant MySQL wildcard permissions | 1 | 5m | 🔴 TODO |
| 001.3 | Restart staging backend container | 1 | 10m | 🔴 TODO |
| 001.4 | Verify staging health and connectivity | 1 | 5m | 🔴 TODO |
| 001.5 | Run security test suite validation | 1 | 10m | 🔴 TODO |
| 001.6 | Seed staging test data via SQL | 2 | 1h | 🔴 TODO |
| 001.7 | Deploy test files to VPS | 2 | 30m | 🔴 TODO |
| 001.8 | Fix API response format mismatches | 2 | 2h | 🔴 TODO |
| 001.9 | Run and document full test suite | 2 | 30m | 🔴 TODO |
| 001.10 | Implement docker-compose for staging | 3 | 3h | 🔴 TODO |
| 001.11 | Create test data lifecycle scripts | 3 | 2h | 🔴 TODO |
| 001.12 | Separate unit/integration/e2e tests | 3 | 2h | 🔴 TODO |
| 001.13 | Document staging testing strategy | 3 | 1h | 🔴 TODO |

## Business Impact

**Blocked Revenue**: $35K/month ($420K/year) in Phase 2 features
**Time Cost**: ~$1,200/day in lost feature development velocity
**Recovery Investment**: 14 hours (~$1,800)
**ROI**: 23,333% (1 year payback period: 3 days)

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| MySQL root password not found | 30% | HIGH | Use password reset procedure (Story 001.1) |
| Container won't restart | 20% | MEDIUM | Rebuild from docker-compose (Story 001.10) |
| Test fixes break security tests | 10% | HIGH | Run security tests after each change |
| Production affected | 5% | CRITICAL | No production changes in this epic |

## Dependencies

**External Dependencies**:
- MySQL root password (required for Story 001.2)
- VPS SSH access (required for all stories)
- Test files in local repository (required for Story 001.7)

**Story Dependencies**:
- 001.2 depends on 001.1 (need password first)
- 001.3 depends on 001.2 (need permissions first)
- 001.4 depends on 001.3 (need container running)
- 001.5 depends on 001.4 (need healthy endpoints)
- 001.6-001.9 depend on 001.5 (need working staging)
- 001.10-001.13 can run in parallel after 001.9

## Success Criteria

**Phase 1 Complete**:
- ✅ Staging container running and healthy
- ✅ Backend connects to MySQL successfully
- ✅ All 17 security tests passing
- ✅ Health endpoint returns 200 OK

**Phase 2 Complete**:
- ✅ 115/164 tests passing (70% pass rate)
- ✅ Test data exists for all test scenarios
- ✅ File upload tests working
- ✅ API response format issues resolved

**Phase 3 Complete**:
- ✅ 140/164 tests passing (85% pass rate)
- ✅ docker-compose.staging.yml created and tested
- ✅ Automated test data seeding script
- ✅ Testing strategy documented

## Timeline

**Phase 1**: Today (2 hours)
**Phase 2**: Tomorrow (4 hours)
**Phase 3**: Next week (8 hours spread over 2-3 days)

**Total**: 14 hours over 3-5 days

## References

**BMAD Team Analysis**:
- [STAGING_FULL_TEST_SUITE_RESULTS_2025-11-20.md](../../STAGING_FULL_TEST_SUITE_RESULTS_2025-11-20.md)
- [P0_P1_FIXES_COMPLETE_2025-11-20.md](../../P0_P1_FIXES_COMPLETE_2025-11-20.md)
- [FINAL_STATUS_2025-11-20.md](../../FINAL_STATUS_2025-11-20.md)

**Technical Context**:
- VPS: 141.136.44.168
- Backend Port: 3007
- MySQL Container: mysql-staging
- Database: pdflab_staging
- User: pdflab_staging (needs @'%' permissions)

---

**Created**: 2025-11-20
**Last Updated**: 2025-11-20
**BMAD Version**: v4.44.0
**Scrum Master**: Bob
