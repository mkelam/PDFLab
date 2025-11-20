# PDFLab Development Stories

**BMAD-METHOD™ Story Management**
**Epic**: EPIC-001 - Staging Environment Recovery & Stabilization
**Created**: 2025-11-20
**Scrum Master**: Bob (BMAD)

---

## Quick Start

### For Developers

**Start with Epic Overview**:
Read [EPIC-001-staging-recovery-overview.md](EPIC-001-staging-recovery-overview.md) for complete context.

**Pick Up a Story**:
1. Check status in Epic overview (find TODO stories)
2. Open story file (e.g., `001.1.locate-mysql-root-password.md`)
3. Read entire story (especially Dev Notes section)
4. Execute tasks sequentially
5. Update "Dev Agent Record" section as you work
6. Mark story DONE when all AC satisfied

**Story Naming Convention**:
```
{epic}.{story}.{short-title}.md

Example: 001.1.locate-mysql-root-password.md
         └─┬─┘ └┬┘ └──────────┬──────────┘
          Epic  Story    Short Title
```

---

## Available Stories

### Phase 1: Recovery (2 hours) 🚨
**Goal**: Get staging container running
**Status**: Ready to start

| Story | File | Effort | Status |
|-------|------|--------|--------|
| 001.1 | [locate-mysql-root-password.md](001.1.locate-mysql-root-password.md) | 30m | 🔴 TODO |
| 001.2 | [grant-mysql-wildcard-permissions.md](001.2.grant-mysql-wildcard-permissions.md) | 5m | 🔴 TODO |
| 001.3 | [restart-staging-container.md](001.3.restart-staging-container.md) | 10m | 🔴 TODO |
| 001.4 | Verify staging health | 5m | 🔴 TODO |
| 001.5 | Run security test validation | 10m | 🔴 TODO |

**Dependencies**: Sequential (must complete in order)

---

### Phase 2: Quick Wins (4 hours) 🎯
**Goal**: Improve test pass rate to 70%
**Status**: Blocked by Phase 1

| Story | Description | Effort | Status |
|-------|-------------|--------|--------|
| 001.6 | Seed staging test data via SQL | 1h | 🔴 TODO |
| 001.7 | Deploy test files to VPS | 30m | 🔴 TODO |
| 001.8 | Fix API response format mismatches | 2h | 🔴 TODO |
| 001.9 | Run and document full test suite | 30m | 🔴 TODO |

**Dependencies**: Stories 001.6 and 001.7 can run in parallel

---

### Phase 3: Strategic Improvements (8 hours) 🏗️
**Goal**: Build sustainable testing infrastructure
**Status**: Blocked by Phase 2

| Story | Description | Effort | Status |
|-------|-------------|--------|--------|
| 001.10 | Implement docker-compose for staging | 3h | 🔴 TODO |
| 001.11 | Create test data lifecycle scripts | 2h | 🔴 TODO |
| 001.12 | Separate unit/integration/e2e tests | 2h | 🔴 TODO |
| 001.13 | Document staging testing strategy | 1h | 🔴 TODO |

**Dependencies**: All can run in parallel after Phase 2

---

## Story Structure

Each story contains:

### Core Information
- **Status**: TODO, InProgress, Review, Done
- **Epic**, **Phase**, **Priority**, **Estimate**
- **Assigned To**: Developer/team member

### User Story
- **As a** [role]
- **I want** [action]
- **so that** [benefit]

### Implementation Details
1. **Context**: Background and problem statement
2. **Acceptance Criteria**: Numbered, testable requirements
3. **Tasks / Subtasks**: Step-by-step implementation guide
4. **Dev Notes**: Technical details, commands, code snippets
5. **Risks & Mitigations**: What could go wrong and how to handle it
6. **Definition of Done**: Clear completion checklist

### Tracking
- **Dependencies**: Upstream/downstream story links
- **References**: Related documents and resources
- **Change Log**: Version history
- **Dev Agent Record**: Implementation notes (populated during work)
- **QA Results**: Quality assurance outcomes

---

## How to Use Stories

### As a Developer

**1. Before Starting**:
```bash
# Navigate to story directory
cd docs/stories/

# Read epic overview
cat EPIC-001-staging-recovery-overview.md

# Pick your story
cat 001.1.locate-mysql-root-password.md
```

**2. During Implementation**:
- Follow tasks sequentially
- Use commands from Dev Notes section
- Document issues in Dev Agent Record
- Run tests after each major change

**3. After Completion**:
- Update story status to "Done"
- Fill in Dev Agent Record section
- Note any deviations from plan
- Commit changes to story file

### As a Scrum Master

**Creating New Stories**:
```bash
# Use BMAD template
cp .bmad-core/templates/story-tmpl.yaml new-story.md

# Or follow existing story format
cp 001.1.locate-mysql-root-password.md 001.X.new-story.md
```

**Tracking Progress**:
- Update Epic overview with story status
- Mark dependencies as they complete
- Document blockers in story files
- Update estimates if needed

---

## Story Status Indicators

- 🔴 **TODO**: Not started, ready to begin
- 🟡 **InProgress**: Currently being worked on
- 🟢 **Done**: Complete, all AC satisfied
- 🔵 **Review**: Awaiting code review or QA
- ⏸️ **Blocked**: Cannot proceed (dependency issue)
- ⚠️ **At Risk**: Behind schedule or technical issues

---

## Dependency Management

### Phase 1 (Sequential)
```
001.1 → 001.2 → 001.3 → 001.4 → 001.5
```
**Must complete in order**. Each story depends on previous.

### Phase 2 (Parallel Possible)
```
        ┌─ 001.6 ─┐
001.5 ──┼─ 001.7 ─┼─→ 001.9
        └─ 001.8 ─┘
```
**Stories 001.6, 001.7, 001.8 can run in parallel**. All must complete before 001.9.

### Phase 3 (Fully Parallel)
```
        ┌─ 001.10 ─┐
001.9 ──┼─ 001.11 ─┼─→ COMPLETE
        ├─ 001.12 ─┤
        └─ 001.13 ─┘
```
**All Phase 3 stories can run in parallel**.

---

## Detailed Stories

**Fully Detailed** (ready to implement):
- [001.1 - Locate MySQL Root Password](001.1.locate-mysql-root-password.md)
- [001.2 - Grant MySQL Wildcard Permissions](001.2.grant-mysql-wildcard-permissions.md)
- [001.3 - Restart Staging Container](001.3.restart-staging-container.md)

**Summary Format** (ready for detailing):
- [Phase 1 & 2 Remaining Stories](PHASE-1-PHASE-2-REMAINING-STORIES.md)

---

## Expected Outcomes

### Phase 1 Complete ✅
- Staging container: UP and healthy
- MySQL: Connected with wildcard permissions
- Security tests: 17/17 passing (100%)
- Time: 60 minutes

### Phase 2 Complete ✅
- Test pass rate: 44.5% → 72.0%
- Test data: Seeded and available
- File uploads: Working
- Time: 4 hours

### Phase 3 Complete ✅
- Test pass rate: 72.0% → 85.0%
- Infrastructure: Reproducible
- Test data: Automated
- Time: 8 hours

**Total: 14 hours, $420K/year unblocked**

---

## Commands Reference

### Check Story Status
```bash
# List all stories
ls -l docs/stories/*.md

# Count stories by status
grep -r "Status.*TODO" docs/stories/ | wc -l
grep -r "Status.*Done" docs/stories/ | wc -l
```

### Update Story Status
```bash
# Mark story as In Progress
sed -i 's/Status.*TODO/Status: 🟡 InProgress/' docs/stories/001.1.*.md

# Mark story as Done
sed -i 's/Status.*InProgress/Status: 🟢 Done/' docs/stories/001.1.*.md
```

---

## Support

**Questions?** Ask the BMAD team:
- Scrum Master (Bob): Story creation, epic management
- Dev Agent (James): Implementation details
- QA Agent (Quinn): Testing strategy
- Architect (Winston): Technical design
- PM (John): Priority and scope

**BMAD Commands**:
- `*help` - Show available commands
- `*agent sm` - Transform to Scrum Master
- `*agent dev` - Transform to Developer
- `*status` - Show current progress

---

**Last Updated**: 2025-11-20
**BMAD Version**: v4.44.0
**Next Update**: After Phase 1 completion
