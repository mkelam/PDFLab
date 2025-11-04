# Epic 7: Audit Logs & Compliance

## Epic Overview
**Epic ID:** ADMIN-007
**Epic Name:** Audit Logs & Compliance
**Priority:** High
**Estimated Effort:** 1 day
**Dependencies:** ADMIN-001 (Admin Panel Foundation)

## Description
Build a comprehensive audit logging and compliance interface that tracks all admin actions, user activities, and system events for security, compliance, and forensic analysis. Supports GDPR/POPIA data subject access requests, security incident investigation, and regulatory compliance audits.

## Business Value
- **Compliance:** Meet GDPR, POPIA, SOC 2, ISO 27001 audit trail requirements
- **Security:** Detect unauthorized access attempts and suspicious activity
- **Accountability:** Track admin actions for internal governance and dispute resolution
- **Forensics:** Investigate security incidents and data breaches with complete audit trail
- **User Trust:** Demonstrate commitment to data privacy and security transparency

## User Personas
- **Compliance Officer:** Needs complete audit trails for regulatory audits and GDPR requests
- **Security Admin:** Needs to investigate suspicious activity and security incidents
- **Super Admin:** Needs to review admin actions for accountability
- **Legal/Privacy Team:** Needs exportable audit logs for legal disputes and data requests

## Epic Goals
1. All admin actions automatically logged to `admin_audit_logs` table
2. User activity events tracked (logins, failed attempts, data access)
3. Audit log viewer with advanced filtering and search
4. Security event detection (suspicious logins, rate limit triggers, multiple failed attempts)
5. Export functionality for compliance reports (CSV, JSON, PDF)
6. Data retention policies enforced (90-day default, configurable)
7. Tamper-proof logging (append-only, checksums)

## Technical Scope

### Backend Components

1. **Audit Log API Endpoints**
   - `GET /api/admin/audit-logs` - List all audit logs with filters
   - `GET /api/admin/audit-logs/:id` - Get audit log details
   - `GET /api/admin/audit-logs/admin-actions` - Filter admin actions only
   - `GET /api/admin/audit-logs/user-activity/:user_id` - User activity log for GDPR requests
   - `GET /api/admin/audit-logs/security-events` - Filter security events
   - `POST /api/admin/audit-logs/export` - Export logs (CSV, JSON, PDF)
   - `GET /api/admin/audit-logs/stats` - Audit log statistics
   - All endpoints support filtering: admin_user, action_type, entity_type, date_range

2. **Audit Logging Middleware**
   - Automatic logging middleware for all `/api/admin/*` routes
   - Capture: admin_user_id, action, entity_type, entity_id, changes (before/after), ip_address, user_agent, timestamp
   - Async logging (non-blocking)
   - Change detection (JSON diff for before/after snapshots)

3. **Security Event Detection**
   - Failed login tracking (trigger alert after 5 attempts)
   - Suspicious activity detection (unusual access patterns, unauthorized attempts)
   - Rate limit breach logging
   - Multi-account access from same IP (potential credential sharing)
   - Admin role changes logged with extra scrutiny

4. **Data Retention & Cleanup**
   - Configurable retention policy (default: 90 days)
   - Automated cleanup job (delete logs older than retention period)
   - Archive old logs to cold storage (optional)
   - Critical logs (security events) retained longer (1 year)

5. **Compliance Features**
   - GDPR data export (all user data + activity logs)
   - Tamper detection (optional checksums on log entries)
   - Log immutability (append-only, no updates/deletes except retention cleanup)

### Frontend Components

1. **Audit Logs Page (`/app/admin/audit-logs/page.tsx`)**
   - Audit logs table (admin actions + user activity)
   - Advanced filters (admin user, action type, entity type, date range, event severity)
   - Search by entity ID, admin user, user email
   - Pagination and sorting
   - Real-time log streaming (optional WebSocket)
   - Export button (CSV, JSON, PDF)

2. **Audit Log Detail Modal**
   - Log entry details (timestamp, admin user, action, entity, IP, user agent)
   - Before/after changes (JSON diff visualization)
   - Related logs (other actions on same entity)
   - Security flags (if suspicious activity detected)
   - Export single log entry

3. **Security Events Widget**
   - Recent security events (last 24 hours)
   - Event severity badges (info, warning, critical)
   - Failed login attempts count
   - Unauthorized access attempts
   - Rate limit breaches
   - Quick filter to view details

4. **User Activity Log (GDPR Export)**
   - Dedicated view for user-specific activity
   - All actions performed by user
   - All admin actions affecting user
   - Data access logs (who viewed user data, when)
   - Exportable for GDPR data subject access requests

5. **Components**
   - AuditLogsTable component
   - AuditLogDetailModal component
   - SecurityEventsWidget component
   - AuditLogFilters component
   - ChangesDiffViewer component (JSON diff)
   - UserActivityTimeline component
   - AuditLogExportDialog component

## Acceptance Criteria

### Audit Logging (Automatic)
- [ ] All admin API calls logged automatically via middleware
- [ ] Logs capture: admin_user_id, action, entity_type, entity_id, changes (JSON), ip_address, user_agent, timestamp
- [ ] Changes tracked as before/after JSON snapshots
- [ ] Logging is async (does not block API responses)
- [ ] Logging failures do not break admin operations (graceful degradation)
- [ ] Critical actions (user deletion, role changes) flagged in logs

### Audit Logs Viewer
- [ ] Audit logs table displays: timestamp, admin user, action, entity type, entity ID, IP address
- [ ] Filter by admin user, action type, entity type, date range, severity
- [ ] Search by entity ID, admin email, user email
- [ ] Pagination supports 10/25/50/100 logs per page
- [ ] Sortable by timestamp (default: newest first)
- [ ] Severity badges (info=blue, warning=yellow, critical=red)
- [ ] Empty state shown when no logs match filters

### Audit Log Detail
- [ ] Clicking log row opens detail modal
- [ ] Modal shows: full timestamp, admin user, action, entity, IP, user agent
- [ ] Before/after changes displayed as JSON diff (color-coded)
- [ ] Related logs shown (other actions on same entity within 1 hour)
- [ ] Security flags visible if suspicious activity
- [ ] "Export Log" button downloads single entry as JSON

### Security Events
- [ ] Security events widget shows recent events (last 24 hours)
- [ ] Events tracked: failed logins (≥5 attempts), unauthorized access, rate limit breaches
- [ ] Event severity: info, warning, critical
- [ ] Failed login attempts grouped by user/IP
- [ ] "View All Security Events" button filters audit logs
- [ ] Alert badge on widget if critical events detected

### User Activity Log (GDPR)
- [ ] GET /api/admin/audit-logs/user-activity/:user_id returns all user activity
- [ ] Includes: user logins, conversions created, payments, data changes
- [ ] Includes: admin actions affecting user (profile edits, plan changes, impersonation)
- [ ] Exportable as JSON for GDPR compliance
- [ ] Timestamps in ISO 8601 format (UTC)
- [ ] Readable by non-technical stakeholders (formatted descriptions)

### Export Functionality
- [ ] "Export" button opens format selector (CSV, JSON, PDF)
- [ ] CSV export includes all visible columns (respects active filters)
- [ ] JSON export includes full log entries with all metadata
- [ ] PDF export includes formatted table and summary
- [ ] Filename includes date range (audit_logs_2025-10-01_to_2025-10-31.csv)
- [ ] Large exports (>1000 logs) streamed to avoid timeout

### Data Retention
- [ ] Retention policy configurable (default: 90 days)
- [ ] Automated cleanup job runs daily
- [ ] Logs older than retention period deleted
- [ ] Critical security events retained for 1 year (override retention)
- [ ] Cleanup actions logged to audit trail
- [ ] Manual retention extension available for legal holds

### Performance & Quality
- [ ] Audit logs page loads within 2 seconds for ≤1M logs
- [ ] Filtering responds within 500ms
- [ ] Logging overhead <50ms per admin API call
- [ ] Database indexes on timestamp, admin_user_id, entity_type, entity_id
- [ ] All components TypeScript typed
- [ ] Responsive design works on tablet (768px+)
- [ ] Accessibility: keyboard navigation, screen reader support

## User Stories (Derived)

### Story 7.1: Automatic Admin Action Logging
**As a** compliance officer
**I want** all admin actions automatically logged
**So that** I have a complete audit trail for compliance and security

**Tasks:**
- Create audit logging middleware for `/api/admin/*` routes
- Capture admin_user_id, action, entity_type, entity_id, changes, IP, user agent
- Implement JSON diff for before/after changes
- Make logging async (non-blocking)
- Add error handling (graceful degradation)

**Acceptance Criteria:**
- All admin API calls logged automatically
- Logs include all required fields
- Before/after changes captured as JSON
- Logging does not block API responses
- Logging failures do not break operations

---

### Story 7.2: Audit Logs Viewer with Filtering
**As a** security admin
**I want** to view and filter audit logs
**So that** I can investigate security incidents and admin activity

**Tasks:**
- Create GET /api/admin/audit-logs endpoint with filters
- Build AuditLogsTable component
- Add filters: admin user, action type, entity type, date range, severity
- Implement search functionality
- Add pagination and sorting

**Acceptance Criteria:**
- Table shows: timestamp, admin user, action, entity, IP
- Filters: admin, action, entity, date, severity
- Search by entity ID, admin email
- Pagination and sorting functional
- Severity badges color-coded

---

### Story 7.3: Audit Log Detail with Changes Diff
**As a** security admin
**I want** detailed audit log entries with before/after changes
**So that** I can see exactly what was modified

**Tasks:**
- Create GET /api/admin/audit-logs/:id endpoint
- Build AuditLogDetailModal component
- Implement JSON diff viewer (before/after comparison)
- Show related logs (same entity, within 1 hour)
- Add export single log functionality

**Acceptance Criteria:**
- Modal shows full log details
- Before/after changes displayed as JSON diff
- Color-coded diff (green=added, red=removed, yellow=modified)
- Related logs shown
- Export log as JSON

---

### Story 7.4: Security Events Detection & Widget
**As a** security admin
**I want** automatic security event detection
**So that** I can respond quickly to suspicious activity

**Tasks:**
- Implement failed login tracking (alert after 5 attempts)
- Detect unauthorized access attempts
- Track rate limit breaches
- Build SecurityEventsWidget component
- Add event severity classification

**Acceptance Criteria:**
- Security events tracked: failed logins, unauthorized access, rate limits
- Events classified by severity (info, warning, critical)
- Widget shows recent events (last 24 hours)
- Failed logins grouped by user/IP
- Critical events highlighted

---

### Story 7.5: User Activity Log for GDPR Compliance
**As a** compliance officer
**I want** complete user activity logs
**So that** I can respond to GDPR data subject access requests

**Tasks:**
- Create GET /api/admin/audit-logs/user-activity/:user_id endpoint
- Aggregate all user actions (logins, conversions, payments)
- Include admin actions affecting user
- Build UserActivityTimeline component
- Add export as JSON functionality

**Acceptance Criteria:**
- Endpoint returns all user activity
- Includes user actions + admin actions on user
- Exportable as JSON
- Timestamps in ISO 8601 UTC
- Human-readable descriptions

---

### Story 7.6: Export Audit Logs (CSV, JSON, PDF)
**As a** compliance officer
**I want** to export audit logs
**So that** I can provide compliance reports to auditors

**Tasks:**
- Create POST /api/admin/audit-logs/export endpoint
- Generate CSV export with all columns
- Generate JSON export with full metadata
- Generate PDF export with formatted tables
- Build AuditLogExportDialog component
- Stream large exports

**Acceptance Criteria:**
- Export button opens format selector
- CSV includes all visible columns
- JSON includes full log entries
- PDF includes formatted table
- Filename includes date range
- Large exports streamed

---

### Story 7.7: Data Retention Policy Enforcement
**As a** compliance officer
**I want** automated audit log retention policies
**So that** I comply with data retention regulations

**Tasks:**
- Implement configurable retention policy (default: 90 days)
- Create automated cleanup job (runs daily)
- Delete logs older than retention period
- Retain critical security events for 1 year
- Log cleanup actions to audit trail

**Acceptance Criteria:**
- Retention policy configurable (90 days default)
- Cleanup job runs daily
- Old logs deleted automatically
- Critical events retained longer (1 year)
- Cleanup actions logged

---

### Story 7.8: Tamper-Proof Logging (Optional)
**As a** security admin
**I want** tamper-proof audit logs
**So that** I can trust log integrity for forensic investigations

**Tasks:**
- Implement append-only logging (no updates/deletes)
- Add checksums to log entries (SHA-256)
- Verify checksums on read (detect tampering)
- Flag tampered logs in UI
- Document tamper detection process

**Acceptance Criteria:**
- Logs are append-only (no updates allowed)
- Each log entry has checksum
- Checksums verified on read
- Tampered logs flagged
- Process documented

---

### Story 7.9: Admin Role Change Logging (Critical)
**As a** super admin
**I want** admin role changes logged with extra detail
**So that** I can track privilege escalation

**Tasks:**
- Flag role changes as critical events
- Capture detailed context (who changed, from what role, to what role, reason)
- Send alert notification (optional)
- Require approval for role changes (optional)

**Acceptance Criteria:**
- Role changes flagged as critical
- Detailed context captured
- Alerts sent for role changes (configurable)
- Logs easily filterable (action_type = 'role_change')

---

### Story 7.10: Audit Log Statistics Dashboard
**As a** compliance officer
**I want** audit log statistics
**So that** I can monitor logging health and compliance coverage

**Tasks:**
- Create GET /api/admin/audit-logs/stats endpoint
- Calculate: total logs, logs per day, top admin users, top actions
- Build audit statistics widget
- Add chart showing logs per day (last 30 days)

**Acceptance Criteria:**
- Stats show: total logs, logs/day, top admins, top actions
- Chart shows logs per day (last 30 days)
- Coverage metrics (% of API calls logged)
- Logging health indicator (green=healthy, red=issues)

---

## Dependencies & Risks

### Dependencies
- **ADMIN-001:** Admin Panel Foundation (RBAC, auth, audit_logs table)

### Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Logging impacts performance | Medium | Medium | Async logging, batch writes, optimize insert queries |
| Audit log table grows too large | High | Medium | Implement retention policy, partition table by month, archive to cold storage |
| Sensitive data in logs | Low | High | Filter sensitive fields (passwords, API keys), encrypt logs at rest |
| Compliance gaps | Low | High | Consult legal/compliance team, document logging coverage, regular audits |

---

## Success Metrics
- 100% of admin actions logged successfully
- Zero audit log integrity failures (tamper detection)
- GDPR data subject access requests fulfilled within 24 hours
- Security incidents detected within 5 minutes via audit logs
- Compliance audit pass rate: 100%

---

## Out of Scope (This Epic)
- Real-time alerting (email/SMS notifications for security events)
- Advanced anomaly detection (ML-based)
- Log forwarding to external SIEM (Splunk, Datadog)
- Multi-region log aggregation
- Blockchain-based immutable logging

---

## Technical Notes

### Audit Log Schema
```sql
CREATE TABLE admin_audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  admin_user_id VARCHAR(36) NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(36),
  changes JSON,  -- { before: {...}, after: {...} }
  ip_address VARCHAR(45),
  user_agent TEXT,
  severity ENUM('info', 'warning', 'critical') DEFAULT 'info',
  checksum VARCHAR(64),  -- SHA-256 of log entry (optional)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_user_id) REFERENCES users(id),
  INDEX idx_admin_user (admin_user_id),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_created (created_at),
  INDEX idx_severity (severity)
);
```

### Logging Middleware Example
```typescript
export const auditLogMiddleware = async (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    // Log after successful response
    setImmediate(async () => {
      try {
        await AuditLog.create({
          id: uuidv4(),
          admin_user_id: req.user.id,
          action: `${req.method} ${req.route.path}`,
          entity_type: req.body?.entity_type || 'unknown',
          entity_id: req.params?.id || req.body?.id,
          changes: { before: req.originalEntity, after: body.data },
          ip_address: req.ip,
          user_agent: req.get('user-agent'),
          severity: determineSeverity(req.method, req.route.path)
        });
      } catch (error) {
        // Log error but don't fail request
        console.error('Audit logging failed:', error);
      }
    });

    return originalJson(body);
  };

  next();
};
```

### Change Detection (JSON Diff)
```typescript
import { diff } from 'deep-diff';

const changes = diff(beforeObject, afterObject);
// Returns: [{ kind: 'E', path: ['name'], lhs: 'John', rhs: 'Jane' }, ...]

// Store in audit log:
{
  changes: {
    before: beforeObject,
    after: afterObject,
    diff: changes  // optional, for compact storage
  }
}
```

### GDPR User Activity Export
```typescript
// GET /api/admin/audit-logs/user-activity/:user_id
{
  user_id: "abc-123",
  exported_at: "2025-11-01T12:00:00Z",
  data: {
    user_actions: [
      { timestamp, action: "login", ip, user_agent },
      { timestamp, action: "conversion_created", details: {...} },
      ...
    ],
    admin_actions_on_user: [
      { timestamp, admin_user, action: "plan_changed", changes: {...} },
      { timestamp, admin_user, action: "impersonation", details: {...} },
      ...
    ],
    data_access: [
      { timestamp, admin_user, action: "viewed_profile", ip },
      ...
    ]
  }
}
```

---

**Epic Owner:** Sarah (Product Owner)
**Created:** 2025-11-01
**Status:** Ready for Development
