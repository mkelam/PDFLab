# Monitoring Dashboard - Phases 2, 3, 4 Detailed Implementation Plan

**Created**: 2025-11-16
**Status**: Ready for Execution
**Prerequisites**: Phase 1 Complete ✅

---

## Phase 2: SSL & Security Monitoring (Estimated: 6-8 hours)

### Overview
Add comprehensive SSL certificate monitoring, security event tracking, and compliance reporting to prevent certificate expiry and track security incidents.

### Task 2.1: SSL Certificate Monitoring Database Schema (1 hour)

**File**: `backend/src/migrations/20251116-create-ssl-monitoring.sql`

```sql
-- ============================================
-- SSL Certificate Monitoring
-- ============================================

CREATE TABLE IF NOT EXISTS ssl_certificates (
  id VARCHAR(36) PRIMARY KEY,
  domain VARCHAR(255) NOT NULL UNIQUE,
  certificate_path VARCHAR(500),

  -- Certificate details
  issuer VARCHAR(255),
  subject VARCHAR(255),
  issued_at DATETIME,
  expires_at DATETIME NOT NULL,

  -- Status
  is_valid BOOLEAN DEFAULT TRUE,
  days_until_expiry INT,
  last_checked DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Renewal tracking
  auto_renewal_enabled BOOLEAN DEFAULT TRUE,
  last_renewal_attempt DATETIME,
  last_renewal_status ENUM('success', 'failed', 'pending') DEFAULT NULL,

  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_expires_at (expires_at),
  INDEX idx_domain (domain),
  INDEX idx_days_until_expiry (days_until_expiry)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Security Events Log
-- ============================================

CREATE TABLE IF NOT EXISTS security_events (
  id VARCHAR(36) PRIMARY KEY,
  event_type ENUM(
    'failed_login',
    'suspicious_activity',
    'rate_limit_exceeded',
    'unauthorized_access',
    'sql_injection_attempt',
    'xss_attempt',
    'brute_force_attempt',
    'api_abuse'
  ) NOT NULL,
  severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,

  -- Event details
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_id VARCHAR(36),
  endpoint VARCHAR(500),
  user_agent TEXT,

  -- Context
  description TEXT,
  request_payload JSON,
  response_status INT,

  -- Action taken
  action_taken ENUM('blocked', 'logged', 'alerted', 'auto_banned') DEFAULT 'logged',
  blocked_until DATETIME,

  -- Investigation
  investigated BOOLEAN DEFAULT FALSE,
  investigated_by VARCHAR(255),
  investigated_at DATETIME,
  resolution_notes TEXT,

  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_event_type (event_type),
  INDEX idx_severity (severity),
  INDEX idx_ip_address (ip_address),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Security Compliance Checks
-- ============================================

CREATE TABLE IF NOT EXISTS security_compliance (
  id VARCHAR(36) PRIMARY KEY,
  check_type ENUM(
    'ssl_strength',
    'password_policy',
    'session_security',
    'api_key_rotation',
    'database_encryption',
    'backup_encryption',
    'cors_policy',
    'rate_limiting'
  ) NOT NULL,

  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pass', 'fail', 'warning') NOT NULL,
  score INT DEFAULT 0,

  -- Details
  findings JSON,
  recommendations TEXT,

  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_check_type (check_type),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Initial SSL Certificate Records
-- ============================================

INSERT INTO ssl_certificates (id, domain, expires_at, days_until_expiry) VALUES
(UUID(), 'pdflab.pro', DATE_ADD(NOW(), INTERVAL 90 DAY), 90),
(UUID(), 'www.pdflab.pro', DATE_ADD(NOW(), INTERVAL 90 DAY), 90)
ON DUPLICATE KEY UPDATE id=id;

-- ============================================
-- Views for Dashboard
-- ============================================

-- SSL certificates expiring soon
CREATE OR REPLACE VIEW ssl_expiring_soon AS
SELECT
  domain,
  expires_at,
  days_until_expiry,
  auto_renewal_enabled,
  last_renewal_status
FROM ssl_certificates
WHERE days_until_expiry <= 30 AND is_valid = TRUE
ORDER BY days_until_expiry ASC;

-- Security events summary (last 24 hours)
CREATE OR REPLACE VIEW security_events_24h AS
SELECT
  event_type,
  severity,
  COUNT(*) as event_count,
  COUNT(DISTINCT ip_address) as unique_ips,
  MAX(timestamp) as latest_event
FROM security_events
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY event_type, severity
ORDER BY event_count DESC;

-- Critical unresolved security events
CREATE OR REPLACE VIEW critical_security_events AS
SELECT *
FROM security_events
WHERE severity IN ('high', 'critical')
  AND investigated = FALSE
  AND timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY timestamp DESC;
```

**Deployment**:
```bash
# Copy to VPS
scp backend/src/migrations/20251116-create-ssl-monitoring.sql root@141.136.44.168:/var/pdflab/app/backend/src/migrations/

# Execute migration
ssh root@141.136.44.168 << 'EOF'
docker exec 57d5d601930a_pdflab-mysql-prod mysql -updflab -p***REMOVED*** pdflab_production < /var/pdflab/app/backend/src/migrations/20251116-create-ssl-monitoring.sql
EOF
```

**Verification**:
```bash
ssh root@141.136.44.168 "docker exec 57d5d601930a_pdflab-mysql-prod mysql -updflab -p***REMOVED*** pdflab_production -e 'SHOW TABLES LIKE \"ssl%\"; SHOW TABLES LIKE \"security%\";'"
```

---

### Task 2.2: Elite Guardian SSL Monitoring (2 hours)

**File**: `scripts/elite-health-guardian.sh`

Add SSL certificate checking and security event logging:

```bash
# ============================================
# SSL Certificate Monitoring
# ============================================

check_ssl_certificates() {
    log "INFO" "Checking SSL certificates..."

    local domains=("pdflab.pro" "www.pdflab.pro")

    for domain in "${domains[@]}"; do
        # Get certificate expiry date
        local expiry_date=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

        if [ -z "$expiry_date" ]; then
            log "ERROR" "Failed to retrieve SSL certificate for $domain"
            send_alert "critical" "SSL Certificate Check Failed" "$domain certificate could not be retrieved"
            continue
        fi

        # Calculate days until expiry
        local expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null)
        local current_epoch=$(date +%s)
        local days_until_expiry=$(( ($expiry_epoch - $current_epoch) / 86400 ))

        # Get certificate details
        local issuer=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -issuer 2>/dev/null | sed 's/issuer=//')
        local subject=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -subject 2>/dev/null | sed 's/subject=//')

        # Update database
        docker exec $MYSQL_CONTAINER mysql -u$DB_USER -p$DB_PASS "$METRICS_DB" -e "
            INSERT INTO ssl_certificates (
                id, domain, issuer, subject, expires_at, days_until_expiry, last_checked, is_valid
            ) VALUES (
                UUID(), '$domain', '$issuer', '$subject',
                FROM_UNIXTIME($expiry_epoch), $days_until_expiry, NOW(),
                $([ $days_until_expiry -gt 0 ] && echo "TRUE" || echo "FALSE")
            )
            ON DUPLICATE KEY UPDATE
                issuer = VALUES(issuer),
                subject = VALUES(subject),
                expires_at = VALUES(expires_at),
                days_until_expiry = VALUES(days_until_expiry),
                last_checked = NOW(),
                is_valid = VALUES(is_valid);
        " 2>/dev/null

        # Alert if expiring soon
        if [ $days_until_expiry -le 7 ]; then
            log "CRITICAL" "SSL certificate for $domain expires in $days_until_expiry days!"
            send_alert "critical" "SSL Certificate Expiring Soon" "$domain certificate expires in $days_until_expiry days. Immediate renewal required."
        elif [ $days_until_expiry -le 30 ]; then
            log "WARNING" "SSL certificate for $domain expires in $days_until_expiry days"
            send_alert "warning" "SSL Certificate Expiring" "$domain certificate expires in $days_until_expiry days. Plan renewal soon."
        else
            log "INFO" "SSL certificate for $domain is valid for $days_until_expiry days"
        fi
    done
}

# ============================================
# Security Event Logging (called from middleware)
# ============================================

log_security_event() {
    local event_type=$1
    local severity=$2
    local ip_address=$3
    local endpoint=$4
    local description=$5
    local action_taken=${6:-"logged"}

    docker exec $MYSQL_CONTAINER mysql -u$DB_USER -p$DB_PASS "$METRICS_DB" -e "
        INSERT INTO security_events (
            id, event_type, severity, timestamp, ip_address, endpoint, description, action_taken
        ) VALUES (
            UUID(), '$event_type', '$severity', NOW(), '$ip_address', '$endpoint', '$description', '$action_taken'
        );
    " 2>/dev/null

    log "$severity" "Security event: $event_type from $ip_address - $description"

    # Send alert for high/critical severity
    if [ "$severity" = "high" ] || [ "$severity" = "critical" ]; then
        send_alert "$severity" "Security Event: $event_type" "$description (IP: $ip_address, Endpoint: $endpoint)"
    fi
}

# ============================================
# Update main() function
# ============================================

main() {
    log "INFO" "=== Elite Health Guardian - Monitoring Cycle Started ==="

    # Existing checks...
    monitor_backend
    monitor_worker
    monitor_frontend
    monitor_partners
    monitor_mysql
    monitor_redis

    # NEW: SSL and Security checks
    check_ssl_certificates

    # Existing tasks...
    collect_resource_metrics
    optimize_database_if_needed

    log "INFO" "=== Monitoring Cycle Complete ==="
}
```

**Deployment**:
```bash
scp scripts/elite-health-guardian.sh root@141.136.44.168:/var/pdflab/scripts/
ssh root@141.136.44.168 "chmod +x /var/pdflab/scripts/elite-health-guardian.sh && sed -i 's/\r$//' /var/pdflab/scripts/elite-health-guardian.sh"
```

---

### Task 2.3: Backend Security API Endpoints (2 hours)

**File**: `backend/src/controllers/monitoring.admin.controller.ts`

Append these functions:

```typescript
// ============================================
// SSL Certificate Monitoring
// ============================================

export const getSSLCertificates = async (req: Request, res: Response) => {
  try {
    const certificates = await sequelize.query(
      `SELECT * FROM ssl_certificates ORDER BY days_until_expiry ASC`,
      { type: QueryTypes.SELECT }
    ) as any[]

    const expiringSoon = await sequelize.query(
      `SELECT * FROM ssl_expiring_soon`,
      { type: QueryTypes.SELECT }
    ) as any[]

    const summary = {
      total_certificates: certificates.length,
      expiring_within_30_days: expiringSoon.length,
      expiring_within_7_days: expiringSoon.filter((c: any) => c.days_until_expiry <= 7).length,
      expired: certificates.filter((c: any) => c.days_until_expiry < 0).length
    }

    res.json({
      success: true,
      data: {
        certificates,
        expiring_soon: expiringSoon,
        summary
      }
    })
  } catch (error: any) {
    console.error('SSL certificates error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

// ============================================
// Security Events
// ============================================

export const getSecurityEvents = async (req: Request, res: Response) => {
  try {
    const {
      severity,
      event_type,
      investigated = 'false',
      limit = '50',
      offset = '0'
    } = req.query

    let whereConditions = []
    if (severity) whereConditions.push(`severity = '${severity}'`)
    if (event_type) whereConditions.push(`event_type = '${event_type}'`)
    if (investigated === 'false') whereConditions.push(`investigated = FALSE`)

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : ''

    const events = await sequelize.query(
      `SELECT * FROM security_events
       ${whereClause}
       ORDER BY timestamp DESC
       LIMIT ${parseInt(limit as string)}
       OFFSET ${parseInt(offset as string)}`,
      { type: QueryTypes.SELECT }
    ) as any[]

    const totalCount = await sequelize.query(
      `SELECT COUNT(*) as count FROM security_events ${whereClause}`,
      { type: QueryTypes.SELECT }
    ) as any[]

    const summary24h = await sequelize.query(
      `SELECT * FROM security_events_24h`,
      { type: QueryTypes.SELECT }
    ) as any[]

    const criticalEvents = await sequelize.query(
      `SELECT * FROM critical_security_events LIMIT 10`,
      { type: QueryTypes.SELECT }
    ) as any[]

    res.json({
      success: true,
      data: {
        events,
        total: totalCount[0].count,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        summary_24h: summary24h,
        critical_unresolved: criticalEvents
      }
    })
  } catch (error: any) {
    console.error('Security events error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

// ============================================
// Mark Security Event as Investigated
// ============================================

export const investigateSecurityEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { resolution_notes } = req.body
    const admin_email = (req as any).user?.email || 'unknown'

    await sequelize.query(
      `UPDATE security_events
       SET investigated = TRUE,
           investigated_by = :admin,
           investigated_at = NOW(),
           resolution_notes = :notes
       WHERE id = :id`,
      {
        replacements: {
          id,
          admin: admin_email,
          notes: resolution_notes || 'Investigated by admin'
        },
        type: QueryTypes.UPDATE
      }
    )

    res.json({
      success: true,
      message: 'Security event marked as investigated'
    })
  } catch (error: any) {
    console.error('Investigate event error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

// ============================================
// Security Compliance Dashboard
// ============================================

export const getSecurityCompliance = async (req: Request, res: Response) => {
  try {
    const latestChecks = await sequelize.query(
      `SELECT
        check_type,
        status,
        score,
        findings,
        recommendations,
        timestamp
       FROM security_compliance
       WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       ORDER BY timestamp DESC`,
      { type: QueryTypes.SELECT }
    ) as any[]

    const overallScore = latestChecks.length > 0
      ? Math.round(latestChecks.reduce((sum: number, c: any) => sum + (c.score || 0), 0) / latestChecks.length)
      : 0

    const failedChecks = latestChecks.filter((c: any) => c.status === 'fail')
    const warningChecks = latestChecks.filter((c: any) => c.status === 'warning')

    res.json({
      success: true,
      data: {
        overall_score: overallScore,
        total_checks: latestChecks.length,
        failed_checks: failedChecks.length,
        warning_checks: warningChecks.length,
        checks: latestChecks,
        critical_issues: failedChecks.slice(0, 5)
      }
    })
  } catch (error: any) {
    console.error('Security compliance error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}
```

**Compile and Deploy**:
```bash
# Append compiled JavaScript
cd backend
node -e "const ts = require('typescript'); const code = require('fs').readFileSync('src/controllers/monitoring.admin.controller.ts', 'utf8'); const result = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }); require('fs').appendFileSync('dist/controllers/monitoring.admin.controller.js', '\n\n' + result.outputText);"

# Deploy
scp -r backend/dist root@141.136.44.168:/var/pdflab/app/backend/
ssh root@141.136.44.168 "docker restart pdflab-backend-prod"
```

---

### Task 2.4: Register Security Routes (30 min)

**File**: `backend/src/routes/monitoring.admin.routes.ts`

Add before `export default router`:

```typescript
// Import new functions
import {
  getSSLCertificates,
  getSecurityEvents,
  investigateSecurityEvent,
  getSecurityCompliance
} from '../controllers/monitoring.admin.controller'

// SSL Monitoring
router.get('/ssl-certificates', getSSLCertificates)

// Security Events
router.get('/security-events', getSecurityEvents)
router.post('/security-events/:id/investigate', auditLogMiddleware, investigateSecurityEvent)

// Security Compliance
router.get('/security-compliance', getSecurityCompliance)
```

**Compile and Deploy**:
```bash
cd backend
node -e "const ts = require('typescript'); const code = require('fs').readFileSync('src/routes/monitoring.admin.routes.ts', 'utf8'); const result = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }); require('fs').writeFileSync('dist/routes/monitoring.admin.routes.js', result.outputText);"

scp backend/dist/routes/monitoring.admin.routes.js root@141.136.44.168:/var/pdflab/app/backend/dist/routes/
ssh root@141.136.44.168 "docker restart pdflab-backend-prod"
```

---

### Task 2.5: Frontend Security Dashboard UI (2-3 hours)

**File**: `app/admin/monitoring/page.tsx`

Add new tab "Security" with SSL certificates and security events:

```typescript
// Add to imports
import { Shield, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'

// Add to state
const [sslCertificates, setSSLCertificates] = useState<any>(null)
const [securityEvents, setSecurityEvents] = useState<any>(null)
const [securityCompliance, setSecurityCompliance] = useState<any>(null)

// Add fetch functions
const fetchSSLCertificates = async () => {
  try {
    const response = await fetch(`${API_URL}/api/admin/monitoring/ssl-certificates`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    })
    const data = await response.json()
    if (data.success) setSSLCertificates(data.data)
  } catch (error) {
    console.error('Failed to fetch SSL certificates:', error)
  }
}

const fetchSecurityEvents = async () => {
  try {
    const response = await fetch(`${API_URL}/api/admin/monitoring/security-events?limit=20`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    })
    const data = await response.json()
    if (data.success) setSecurityEvents(data.data)
  } catch (error) {
    console.error('Failed to fetch security events:', error)
  }
}

const fetchSecurityCompliance = async () => {
  try {
    const response = await fetch(`${API_URL}/api/admin/monitoring/security-compliance`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    })
    const data = await response.json()
    if (data.success) setSecurityCompliance(data.data)
  } catch (error) {
    console.error('Failed to fetch security compliance:', error)
  }
}

// Update useEffect initial fetch
useEffect(() => {
  fetchDashboardData()
  fetchResourceMetrics()
  fetchRemediationLog()
  fetchSSLCertificates()
  fetchSecurityEvents()
  fetchSecurityCompliance()
}, [])

// Update auto-refresh useEffect
useEffect(() => {
  const interval = setInterval(() => {
    fetchDashboardData()
    fetchResourceMetrics()
    fetchRemediationLog()
    fetchSSLCertificates()
    fetchSecurityEvents()
    fetchSecurityCompliance()
  }, 30000)
  return () => clearInterval(interval)
}, [])

// Add Security tab content
{activeTab === 'security' && (
  <div className="space-y-6">
    {/* SSL Certificates */}
    <div className="glass-strong p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-500" />
          SSL Certificates
        </h3>
        <span className="text-sm text-gray-500">
          {sslCertificates?.summary.total_certificates || 0} certificates
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {sslCertificates?.summary.total_certificates || 0}
          </div>
          <div className="text-sm text-gray-600">Total Certificates</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {sslCertificates?.summary.expiring_within_30_days || 0}
          </div>
          <div className="text-sm text-gray-600">Expiring (30 days)</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-red-600">
            {sslCertificates?.summary.expiring_within_7_days || 0}
          </div>
          <div className="text-sm text-gray-600">Critical (7 days)</div>
        </div>
      </div>

      <div className="space-y-3">
        {sslCertificates?.certificates.map((cert: any) => (
          <div key={cert.id} className="flex items-center justify-between p-4 bg-white rounded-lg">
            <div className="flex items-center gap-3">
              {cert.days_until_expiry > 30 ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : cert.days_until_expiry > 7 ? (
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <div>
                <div className="font-medium">{cert.domain}</div>
                <div className="text-sm text-gray-500">
                  Expires: {new Date(cert.expires_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className={`text-sm font-medium ${
              cert.days_until_expiry > 30 ? 'text-green-600' :
              cert.days_until_expiry > 7 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {cert.days_until_expiry} days left
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Security Events */}
    <div className="glass-strong p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          Security Events (Last 24h)
        </h3>
        <span className="text-sm text-gray-500">
          {securityEvents?.critical_unresolved.length || 0} critical unresolved
        </span>
      </div>

      <div className="space-y-2">
        {securityEvents?.events.slice(0, 10).map((event: any) => (
          <div key={event.id} className={`p-4 rounded-lg border-l-4 ${
            event.severity === 'critical' ? 'bg-red-50 border-red-500' :
            event.severity === 'high' ? 'bg-orange-50 border-orange-500' :
            event.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
            'bg-blue-50 border-blue-500'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-sm">{event.event_type.replace(/_/g, ' ').toUpperCase()}</div>
                <div className="text-sm text-gray-600 mt-1">{event.description}</div>
                <div className="text-xs text-gray-500 mt-2 flex items-center gap-4">
                  <span>IP: {event.ip_address}</span>
                  <span>Endpoint: {event.endpoint}</span>
                  <span>{new Date(event.timestamp).toLocaleString()}</span>
                </div>
              </div>
              <div className={`text-xs px-2 py-1 rounded ${
                event.severity === 'critical' ? 'bg-red-200 text-red-800' :
                event.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                event.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                'bg-blue-200 text-blue-800'
              }`}>
                {event.severity.toUpperCase()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Security Compliance Score */}
    <div className="glass-strong p-6 rounded-xl">
      <h3 className="text-lg font-semibold mb-4">Security Compliance</h3>
      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className={`text-5xl font-bold ${
            (securityCompliance?.overall_score || 0) >= 90 ? 'text-green-600' :
            (securityCompliance?.overall_score || 0) >= 70 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {securityCompliance?.overall_score || 0}%
          </div>
          <div className="text-sm text-gray-600 mt-2">Overall Score</div>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{securityCompliance?.total_checks || 0}</div>
            <div className="text-sm text-gray-600">Total Checks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{securityCompliance?.warning_checks || 0}</div>
            <div className="text-sm text-gray-600">Warnings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{securityCompliance?.failed_checks || 0}</div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
```

**Deploy Frontend**:
```bash
npm run build
docker build -t mkelam/pdflab-frontend:latest .
docker push mkelam/pdflab-frontend:latest
ssh root@141.136.44.168 "cd /var/pdflab/app && docker-compose -f docker-compose.production.yml pull frontend && docker-compose -f docker-compose.production.yml up -d frontend"
```

---

### Phase 2 Verification Checklist

- [ ] Database tables created (ssl_certificates, security_events, security_compliance)
- [ ] Views created (ssl_expiring_soon, security_events_24h, critical_security_events)
- [ ] Elite Guardian checking SSL certificates every 30s
- [ ] SSL expiry alerts triggering at 30 days and 7 days
- [ ] Backend API endpoints responding:
  - GET /api/admin/monitoring/ssl-certificates
  - GET /api/admin/monitoring/security-events
  - POST /api/admin/monitoring/security-events/:id/investigate
  - GET /api/admin/monitoring/security-compliance
- [ ] Frontend Security tab displaying SSL certificates
- [ ] Frontend showing security events with severity colors
- [ ] Frontend showing compliance score

---

## Phase 3: Performance & Job Metrics (Estimated: 8-10 hours)

### Overview
Add comprehensive job processing analytics, queue monitoring, and performance insights to optimize conversion throughput and identify bottlenecks.

### Task 3.1: Job Performance Database Schema (1 hour)

**File**: `backend/src/migrations/20251116-create-job-performance.sql`

```sql
-- ============================================
-- Job Performance Metrics
-- ============================================

CREATE TABLE IF NOT EXISTS job_performance_metrics (
  id VARCHAR(36) PRIMARY KEY,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Job statistics
  jobs_total INT DEFAULT 0,
  jobs_completed INT DEFAULT 0,
  jobs_failed INT DEFAULT 0,
  jobs_pending INT DEFAULT 0,
  jobs_processing INT DEFAULT 0,

  -- Performance metrics
  avg_processing_time_seconds DECIMAL(10,2),
  median_processing_time_seconds DECIMAL(10,2),
  p95_processing_time_seconds DECIMAL(10,2),

  -- Throughput
  jobs_per_minute DECIMAL(10,2),
  success_rate_percent DECIMAL(5,2),

  -- Queue metrics
  queue_depth INT DEFAULT 0,
  queue_wait_time_seconds DECIMAL(10,2),

  -- Resource usage during jobs
  avg_cpu_percent DECIMAL(5,2),
  avg_memory_percent DECIMAL(5,2),

  INDEX idx_timestamp (timestamp DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Job Type Analytics
-- ============================================

CREATE TABLE IF NOT EXISTS job_type_analytics (
  id VARCHAR(36) PRIMARY KEY,
  job_type ENUM('pdf_to_pptx', 'pdf_to_docx', 'pdf_to_xlsx', 'pdf_to_png', 'pdf_merge', 'pdf_compress') NOT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Volume
  total_jobs INT DEFAULT 0,
  completed_jobs INT DEFAULT 0,
  failed_jobs INT DEFAULT 0,

  -- Performance
  avg_processing_time DECIMAL(10,2),
  avg_file_size_mb DECIMAL(10,2),

  -- Success metrics
  success_rate DECIMAL(5,2),

  -- Top failure reason
  top_failure_reason VARCHAR(500),
  failure_count INT DEFAULT 0,

  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_job_type (job_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Failure Analysis
-- ============================================

CREATE TABLE IF NOT EXISTS job_failure_analysis (
  id VARCHAR(36) PRIMARY KEY,
  job_id VARCHAR(36) NOT NULL,
  job_type VARCHAR(50),
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Failure details
  error_category ENUM(
    'timeout',
    'cloudconvert_error',
    'file_too_large',
    'invalid_pdf',
    'quota_exceeded',
    'network_error',
    'system_error',
    'unknown'
  ) NOT NULL,
  error_message TEXT,
  stack_trace TEXT,

  -- Context
  file_size_mb DECIMAL(10,2),
  user_plan VARCHAR(50),
  retry_count INT DEFAULT 0,

  -- Resolution
  auto_resolved BOOLEAN DEFAULT FALSE,
  resolution_action VARCHAR(255),

  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_error_category (error_category),
  INDEX idx_job_type (job_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Queue Health Snapshots
-- ============================================

CREATE TABLE IF NOT EXISTS queue_health_snapshots (
  id VARCHAR(36) PRIMARY KEY,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Queue status
  waiting_count INT DEFAULT 0,
  active_count INT DEFAULT 0,
  completed_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  delayed_count INT DEFAULT 0,

  -- Performance indicators
  oldest_job_age_minutes INT,
  avg_wait_time_seconds DECIMAL(10,2),

  -- Worker status
  worker_status ENUM('healthy', 'degraded', 'down') DEFAULT 'healthy',

  INDEX idx_timestamp (timestamp DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Views for Dashboard
-- ============================================

-- Job performance trend (last 24 hours)
CREATE OR REPLACE VIEW job_performance_24h AS
SELECT
  DATE_FORMAT(timestamp, '%Y-%m-%d %H:00') as hour,
  AVG(jobs_per_minute) as avg_throughput,
  AVG(success_rate_percent) as avg_success_rate,
  AVG(avg_processing_time_seconds) as avg_processing_time,
  AVG(queue_depth) as avg_queue_depth
FROM job_performance_metrics
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY hour
ORDER BY hour ASC;

-- Top failure reasons (last 7 days)
CREATE OR REPLACE VIEW top_failure_reasons AS
SELECT
  error_category,
  COUNT(*) as failure_count,
  AVG(file_size_mb) as avg_file_size,
  GROUP_CONCAT(DISTINCT job_type) as affected_job_types
FROM job_failure_analysis
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY error_category
ORDER BY failure_count DESC
LIMIT 10;

-- Most popular conversion types (last 30 days)
CREATE OR REPLACE VIEW popular_conversion_types AS
SELECT
  job_type,
  SUM(total_jobs) as total_conversions,
  AVG(success_rate) as avg_success_rate,
  AVG(avg_processing_time) as avg_time
FROM job_type_analytics
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY job_type
ORDER BY total_conversions DESC;
```

**Deployment**:
```bash
scp backend/src/migrations/20251116-create-job-performance.sql root@141.136.44.168:/var/pdflab/app/backend/src/migrations/
ssh root@141.136.44.168 "docker exec 57d5d601930a_pdflab-mysql-prod mysql -updflab -p***REMOVED*** pdflab_production < /var/pdflab/app/backend/src/migrations/20251116-create-job-performance.sql"
```

---

### Task 3.2: Job Performance Collector Script (2-3 hours)

**File**: `scripts/job-performance-collector.sh`

Create new script to run every minute:

```bash
#!/bin/bash

# ============================================
# Job Performance Metrics Collector
# ============================================
# Runs every minute to collect job queue stats
# ============================================

MYSQL_CONTAINER="57d5d601930a_pdflab-mysql-prod"
REDIS_CONTAINER="54dfd3ac119a_pdflab-redis-prod"
WORKER_CONTAINER="pdflab-worker-prod"
DB_USER="pdflab"
DB_PASS="***REMOVED***"
METRICS_DB="pdflab_production"

# Get current job counts from conversion_jobs table
get_job_stats() {
    docker exec $MYSQL_CONTAINER mysql -u$DB_USER -p$DB_PASS "$METRICS_DB" -N -e "
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing
        FROM conversion_jobs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE);
    " 2>/dev/null | tr '\t' ','
}

# Calculate processing time statistics
get_processing_time_stats() {
    docker exec $MYSQL_CONTAINER mysql -u$DB_USER -p$DB_PASS "$METRICS_DB" -N -e "
        SELECT
            AVG(TIMESTAMPDIFF(SECOND, created_at, updated_at)) as avg_time,
            SUBSTRING_INDEX(
                SUBSTRING_INDEX(
                    GROUP_CONCAT(TIMESTAMPDIFF(SECOND, created_at, updated_at) ORDER BY TIMESTAMPDIFF(SECOND, created_at, updated_at) SEPARATOR ','),
                    ',',
                    CEIL(COUNT(*) * 0.5)
                ),
                ',', -1
            ) as median_time,
            SUBSTRING_INDEX(
                SUBSTRING_INDEX(
                    GROUP_CONCAT(TIMESTAMPDIFF(SECOND, created_at, updated_at) ORDER BY TIMESTAMPDIFF(SECOND, created_at, updated_at) SEPARATOR ','),
                    ',',
                    CEIL(COUNT(*) * 0.95)
                ),
                ',', -1
            ) as p95_time
        FROM conversion_jobs
        WHERE status = 'completed'
        AND updated_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE);
    " 2>/dev/null | tr '\t' ','
}

# Get Redis queue depth
get_queue_depth() {
    local waiting=$(docker exec $REDIS_CONTAINER redis-cli LLEN "bull:conversion:wait" 2>/dev/null | tr -d '\r' || echo "0")
    local active=$(docker exec $REDIS_CONTAINER redis-cli LLEN "bull:conversion:active" 2>/dev/null | tr -d '\r' || echo "0")
    echo "$waiting,$active"
}

# Check worker health
check_worker_health() {
    local worker_running=$(docker inspect -f '{{.State.Running}}' $WORKER_CONTAINER 2>/dev/null)
    if [ "$worker_running" = "true" ]; then
        echo "healthy"
    else
        echo "down"
    fi
}

# Main collection function
collect_metrics() {
    # Get job statistics
    local job_stats=$(get_job_stats)
    local total=$(echo "$job_stats" | cut -d, -f1)
    local completed=$(echo "$job_stats" | cut -d, -f2)
    local failed=$(echo "$job_stats" | cut -d, -f3)
    local pending=$(echo "$job_stats" | cut -d, -f4)
    local processing=$(echo "$job_stats" | cut -d, -f5)

    # Get processing time stats
    local time_stats=$(get_processing_time_stats)
    local avg_time=$(echo "$time_stats" | cut -d, -f1)
    local median_time=$(echo "$time_stats" | cut -d, -f2)
    local p95_time=$(echo "$time_stats" | cut -d, -f3)

    # Handle null values
    avg_time=${avg_time:-0}
    median_time=${median_time:-0}
    p95_time=${p95_time:-0}

    # Calculate success rate
    local success_rate=0
    if [ "$total" -gt 0 ]; then
        success_rate=$(echo "scale=2; ($completed / $total) * 100" | bc)
    fi

    # Calculate jobs per minute
    local jobs_per_minute=$(echo "scale=2; $total / 1" | bc)

    # Get queue metrics
    local queue_info=$(get_queue_depth)
    local queue_waiting=$(echo "$queue_info" | cut -d, -f1)
    local queue_active=$(echo "$queue_info" | cut -d, -f2)
    local queue_depth=$((queue_waiting + queue_active))

    # Get worker status
    local worker_status=$(check_worker_health)

    # Insert job performance metrics
    docker exec $MYSQL_CONTAINER mysql -u$DB_USER -p$DB_PASS "$METRICS_DB" -e "
        INSERT INTO job_performance_metrics (
            id, timestamp,
            jobs_total, jobs_completed, jobs_failed, jobs_pending, jobs_processing,
            avg_processing_time_seconds, median_processing_time_seconds, p95_processing_time_seconds,
            jobs_per_minute, success_rate_percent, queue_depth
        ) VALUES (
            UUID(), NOW(),
            $total, $completed, $failed, $pending, $processing,
            $avg_time, $median_time, $p95_time,
            $jobs_per_minute, $success_rate, $queue_depth
        );
    " 2>/dev/null

    # Insert queue health snapshot
    docker exec $MYSQL_CONTAINER mysql -u$DB_USER -p$DB_PASS "$METRICS_DB" -e "
        INSERT INTO queue_health_snapshots (
            id, timestamp,
            waiting_count, active_count, worker_status
        ) VALUES (
            UUID(), NOW(),
            $queue_waiting, $queue_active, '$worker_status'
        );
    " 2>/dev/null

    echo "[$(date)] Collected metrics: Total=$total, Success=$success_rate%, Queue=$queue_depth, Worker=$worker_status"
}

# Collect job type analytics (hourly)
collect_job_type_analytics() {
    docker exec $MYSQL_CONTAINER mysql -u$DB_USER -p$DB_PASS "$METRICS_DB" -e "
        INSERT INTO job_type_analytics (
            id, job_type, timestamp,
            total_jobs, completed_jobs, failed_jobs,
            avg_processing_time, avg_file_size_mb, success_rate
        )
        SELECT
            UUID(), type, NOW(),
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
            AVG(TIMESTAMPDIFF(SECOND, created_at, updated_at)) as avg_time,
            AVG(file_size / 1024 / 1024) as avg_size_mb,
            (SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as success_rate
        FROM conversion_jobs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        GROUP BY type;
    " 2>/dev/null
}

# Run collection
collect_metrics

# Run job type analytics if hour boundary (XX:00)
current_minute=$(date +%M)
if [ "$current_minute" = "00" ]; then
    collect_job_type_analytics
fi
```

**Deploy and Schedule**:
```bash
# Make executable
chmod +x scripts/job-performance-collector.sh

# Copy to VPS
scp scripts/job-performance-collector.sh root@141.136.44.168:/var/pdflab/scripts/

# Add to crontab (run every minute)
ssh root@141.136.44.168 << 'EOF'
chmod +x /var/pdflab/scripts/job-performance-collector.sh
sed -i 's/\r$//' /var/pdflab/scripts/job-performance-collector.sh
(crontab -l 2>/dev/null | grep -v "job-performance-collector.sh"; echo "* * * * * /var/pdflab/scripts/job-performance-collector.sh >> /var/pdflab/logs/job-performance.log 2>&1") | crontab -
EOF
```

---

### Task 3.3: Backend Job Analytics API (2-3 hours)

**File**: `backend/src/controllers/monitoring.admin.controller.ts`

Append these functions:

```typescript
// ============================================
// Job Performance Dashboard
// ============================================

export const getJobPerformance = async (req: Request, res: Response) => {
  try {
    // Get latest metrics
    const latestMetrics = await sequelize.query(
      `SELECT * FROM job_performance_metrics ORDER BY timestamp DESC LIMIT 1`,
      { type: QueryTypes.SELECT }
    ) as any[]

    // Get 24-hour trend
    const trend24h = await sequelize.query(
      `SELECT * FROM job_performance_24h`,
      { type: QueryTypes.SELECT }
    ) as any[]

    // Get popular conversion types
    const popularTypes = await sequelize.query(
      `SELECT * FROM popular_conversion_types`,
      { type: QueryTypes.SELECT }
    ) as any[]

    // Get top failure reasons
    const topFailures = await sequelize.query(
      `SELECT * FROM top_failure_reasons`,
      { type: QueryTypes.SELECT }
    ) as any[]

    const current = latestMetrics.length > 0 ? latestMetrics[0] : null

    res.json({
      success: true,
      data: {
        current: current ? {
          jobs_total: current.jobs_total,
          jobs_completed: current.jobs_completed,
          jobs_failed: current.jobs_failed,
          jobs_pending: current.jobs_pending,
          jobs_processing: current.jobs_processing,
          avg_processing_time: parseFloat(current.avg_processing_time_seconds) || 0,
          success_rate: parseFloat(current.success_rate_percent) || 0,
          jobs_per_minute: parseFloat(current.jobs_per_minute) || 0,
          queue_depth: current.queue_depth || 0
        } : null,
        trends: {
          last_24h: trend24h,
          popular_types: popularTypes,
          top_failures: topFailures
        },
        timestamp: current?.timestamp || null
      }
    })
  } catch (error: any) {
    console.error('Job performance error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

// ============================================
// Queue Health Monitoring
// ============================================

export const getQueueHealth = async (req: Request, res: Response) => {
  try {
    const latestSnapshot = await sequelize.query(
      `SELECT * FROM queue_health_snapshots ORDER BY timestamp DESC LIMIT 1`,
      { type: QueryTypes.SELECT }
    ) as any[]

    const history = await sequelize.query(
      `SELECT * FROM queue_health_snapshots
       WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 6 HOUR)
       ORDER BY timestamp DESC`,
      { type: QueryTypes.SELECT }
    ) as any[]

    const current = latestSnapshot.length > 0 ? latestSnapshot[0] : null

    res.json({
      success: true,
      data: {
        current: current ? {
          waiting: current.waiting_count,
          active: current.active_count,
          completed: current.completed_count,
          failed: current.failed_count,
          delayed: current.delayed_count,
          worker_status: current.worker_status,
          oldest_job_age_minutes: current.oldest_job_age_minutes || 0
        } : null,
        history: history,
        timestamp: current?.timestamp || null
      }
    })
  } catch (error: any) {
    console.error('Queue health error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

// ============================================
// Job Type Analytics
// ============================================

export const getJobTypeAnalytics = async (req: Request, res: Response) => {
  try {
    const { timeframe = '24h' } = req.query

    let interval = '24 HOUR'
    if (timeframe === '7d') interval = '7 DAY'
    if (timeframe === '30d') interval = '30 DAY'

    const analytics = await sequelize.query(
      `SELECT
        job_type,
        SUM(total_jobs) as total,
        SUM(completed_jobs) as completed,
        SUM(failed_jobs) as failed,
        AVG(avg_processing_time) as avg_time,
        AVG(avg_file_size_mb) as avg_size,
        AVG(success_rate) as success_rate
       FROM job_type_analytics
       WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ${interval})
       GROUP BY job_type
       ORDER BY total DESC`,
      { type: QueryTypes.SELECT }
    ) as any[]

    res.json({
      success: true,
      data: {
        analytics: analytics.map((a: any) => ({
          job_type: a.job_type,
          total_jobs: parseInt(a.total) || 0,
          completed_jobs: parseInt(a.completed) || 0,
          failed_jobs: parseInt(a.failed) || 0,
          avg_processing_time: parseFloat(a.avg_time) || 0,
          avg_file_size_mb: parseFloat(a.avg_size) || 0,
          success_rate: parseFloat(a.success_rate) || 0
        })),
        timeframe: timeframe
      }
    })
  } catch (error: any) {
    console.error('Job type analytics error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}
```

---

### Task 3.4: Register Performance Routes (30 min)

**File**: `backend/src/routes/monitoring.admin.routes.ts`

Add imports and routes:

```typescript
import {
  getJobPerformance,
  getQueueHealth,
  getJobTypeAnalytics
} from '../controllers/monitoring.admin.controller'

// Job Performance Monitoring
router.get('/job-performance', getJobPerformance)
router.get('/queue-health', getQueueHealth)
router.get('/job-type-analytics', getJobTypeAnalytics)
```

---

### Task 3.5: Frontend Performance Dashboard (2-3 hours)

**File**: `app/admin/monitoring/page.tsx`

Add "Performance" tab with job metrics:

```typescript
// Add to imports
import { Zap, TrendingUp, Clock, CheckCircle } from 'lucide-react'

// Add to state
const [jobPerformance, setJobPerformance] = useState<any>(null)
const [queueHealth, setQueueHealth] = useState<any>(null)
const [jobTypeAnalytics, setJobTypeAnalytics] = useState<any>(null)

// Add fetch functions
const fetchJobPerformance = async () => {
  try {
    const response = await fetch(`${API_URL}/api/admin/monitoring/job-performance`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    })
    const data = await response.json()
    if (data.success) setJobPerformance(data.data)
  } catch (error) {
    console.error('Failed to fetch job performance:', error)
  }
}

const fetchQueueHealth = async () => {
  try {
    const response = await fetch(`${API_URL}/api/admin/monitoring/queue-health`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    })
    const data = await response.json()
    if (data.success) setQueueHealth(data.data)
  } catch (error) {
    console.error('Failed to fetch queue health:', error)
  }
}

const fetchJobTypeAnalytics = async () => {
  try {
    const response = await fetch(`${API_URL}/api/admin/monitoring/job-type-analytics?timeframe=24h`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    })
    const data = await response.json()
    if (data.success) setJobTypeAnalytics(data.data)
  } catch (error) {
    console.error('Failed to fetch job type analytics:', error)
  }
}

// Update useEffect
useEffect(() => {
  // ... existing fetches ...
  fetchJobPerformance()
  fetchQueueHealth()
  fetchJobTypeAnalytics()
}, [])

// Add Performance tab
{activeTab === 'performance' && (
  <div className="space-y-6">
    {/* Key Metrics */}
    <div className="grid grid-cols-4 gap-4">
      <div className="glass-strong p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">
              {jobPerformance?.current?.jobs_per_minute?.toFixed(1) || '0.0'}
            </div>
            <div className="text-sm text-gray-600 mt-1">Jobs/Minute</div>
          </div>
          <Zap className="w-8 h-8 text-yellow-500" />
        </div>
      </div>

      <div className="glass-strong p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-green-600">
              {jobPerformance?.current?.success_rate?.toFixed(1) || '0.0'}%
            </div>
            <div className="text-sm text-gray-600 mt-1">Success Rate</div>
          </div>
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
      </div>

      <div className="glass-strong p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">
              {jobPerformance?.current?.avg_processing_time?.toFixed(0) || '0'}s
            </div>
            <div className="text-sm text-gray-600 mt-1">Avg Time</div>
          </div>
          <Clock className="w-8 h-8 text-blue-500" />
        </div>
      </div>

      <div className="glass-strong p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">
              {queueHealth?.current?.waiting || 0}
            </div>
            <div className="text-sm text-gray-600 mt-1">Queue Depth</div>
          </div>
          <TrendingUp className="w-8 h-8 text-purple-500" />
        </div>
      </div>
    </div>

    {/* Job Type Breakdown */}
    <div className="glass-strong p-6 rounded-xl">
      <h3 className="text-lg font-semibold mb-4">Conversion Types (Last 24h)</h3>
      <div className="space-y-3">
        {jobTypeAnalytics?.analytics?.map((type: any) => (
          <div key={type.job_type} className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">
                  {type.job_type.replace(/_/g, ' ').toUpperCase()}
                </span>
                <span className="text-sm text-gray-600">
                  {type.total_jobs} jobs
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${type.success_rate}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-green-600">
                {type.success_rate?.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">
                {type.avg_processing_time?.toFixed(0)}s avg
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Top Failures */}
    <div className="glass-strong p-6 rounded-xl">
      <h3 className="text-lg font-semibold mb-4">Top Failure Reasons</h3>
      <div className="space-y-2">
        {jobPerformance?.trends?.top_failures?.slice(0, 5).map((failure: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
            <div>
              <div className="font-medium text-sm">
                {failure.error_category.replace(/_/g, ' ').toUpperCase()}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Affected: {failure.affected_job_types}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-red-600">
                {failure.failure_count}
              </div>
              <div className="text-xs text-gray-500">failures</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}
```

---

## Phase 4: Alert Intelligence & Auto-Diagnostics (Estimated: 10-12 hours)

### Overview
Add intelligent alert context, automated diagnostics, MTTR tracking, and predictive alerting to reduce mean time to resolution.

### Task 4.1: Alert Intelligence Database Schema (1-2 hours)

**File**: `backend/src/migrations/20251116-create-alert-intelligence.sql`

```sql
-- ============================================
-- Alert Intelligence & Diagnostics
-- ============================================

-- Add diagnostic data to existing monitoring_alerts table
ALTER TABLE monitoring_alerts
ADD COLUMN IF NOT EXISTS diagnostic_data JSON,
ADD COLUMN IF NOT EXISTS suggested_actions TEXT,
ADD COLUMN IF NOT EXISTS related_alerts JSON,
ADD COLUMN IF NOT EXISTS auto_diagnostic_run BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mttr_seconds INT,
ADD INDEX idx_auto_diagnostic (auto_diagnostic_run);

-- ============================================
-- Alert Resolution Tracking (MTTR)
-- ============================================

CREATE TABLE IF NOT EXISTS alert_resolution_tracking (
  id VARCHAR(36) PRIMARY KEY,
  alert_id VARCHAR(36) NOT NULL,

  -- Timeline
  created_at DATETIME NOT NULL,
  acknowledged_at DATETIME,
  resolved_at DATETIME,

  -- Resolution metrics
  time_to_acknowledge_seconds INT,
  time_to_resolve_seconds INT,
  resolution_method ENUM('auto', 'manual', 'external') DEFAULT 'manual',

  -- Context
  alert_type VARCHAR(50),
  severity VARCHAR(20),
  environment VARCHAR(20),

  -- Resolution details
  resolution_actions JSON,
  effectiveness_score INT DEFAULT 0,

  INDEX idx_alert_id (alert_id),
  INDEX idx_created_at (created_at DESC),
  INDEX idx_resolution_method (resolution_method)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Recurring Alert Detection
-- ============================================

CREATE TABLE IF NOT EXISTS recurring_alert_patterns (
  id VARCHAR(36) PRIMARY KEY,

  -- Pattern identification
  alert_type VARCHAR(50) NOT NULL,
  environment VARCHAR(20),
  pattern_signature VARCHAR(255) NOT NULL UNIQUE,

  -- Occurrence tracking
  first_occurrence DATETIME NOT NULL,
  last_occurrence DATETIME NOT NULL,
  occurrence_count INT DEFAULT 1,

  -- Timing analysis
  avg_interval_hours DECIMAL(10,2),
  is_periodic BOOLEAN DEFAULT FALSE,
  predicted_next_occurrence DATETIME,

  -- Impact
  total_downtime_minutes INT DEFAULT 0,
  affected_services JSON,

  -- Root cause analysis
  suspected_root_cause TEXT,
  permanent_fix_applied BOOLEAN DEFAULT FALSE,
  fix_notes TEXT,

  INDEX idx_pattern_signature (pattern_signature),
  INDEX idx_last_occurrence (last_occurrence DESC),
  INDEX idx_occurrence_count (occurrence_count DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Auto-Diagnostic Results
-- ============================================

CREATE TABLE IF NOT EXISTS auto_diagnostic_results (
  id VARCHAR(36) PRIMARY KEY,
  alert_id VARCHAR(36) NOT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Diagnostic checks performed
  checks_performed JSON NOT NULL,

  -- Findings
  root_cause_identified BOOLEAN DEFAULT FALSE,
  suspected_root_cause TEXT,
  contributing_factors JSON,

  -- Recommendations
  suggested_actions JSON,
  auto_remediation_available BOOLEAN DEFAULT FALSE,
  auto_remediation_applied BOOLEAN DEFAULT FALSE,

  -- Metadata
  diagnostic_duration_seconds INT,
  confidence_score DECIMAL(5,2),

  INDEX idx_alert_id (alert_id),
  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_root_cause_identified (root_cause_identified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Views for Alert Intelligence
-- ============================================

-- MTTR by alert type (last 30 days)
CREATE OR REPLACE VIEW mttr_by_alert_type AS
SELECT
  alert_type,
  COUNT(*) as total_alerts,
  AVG(time_to_resolve_seconds) as avg_resolution_time,
  MIN(time_to_resolve_seconds) as min_resolution_time,
  MAX(time_to_resolve_seconds) as max_resolution_time,
  SUM(CASE WHEN resolution_method = 'auto' THEN 1 ELSE 0 END) as auto_resolved_count
FROM alert_resolution_tracking
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  AND resolved_at IS NOT NULL
GROUP BY alert_type
ORDER BY avg_resolution_time DESC;

-- Top recurring alerts
CREATE OR REPLACE VIEW top_recurring_alerts AS
SELECT *
FROM recurring_alert_patterns
WHERE permanent_fix_applied = FALSE
  AND occurrence_count >= 3
ORDER BY occurrence_count DESC, last_occurrence DESC
LIMIT 20;

-- Alert effectiveness (how often suggested actions worked)
CREATE OR REPLACE VIEW alert_effectiveness AS
SELECT
  a.alert_type,
  COUNT(*) as total_diagnostics,
  AVG(d.confidence_score) as avg_confidence,
  SUM(CASE WHEN d.auto_remediation_applied = TRUE THEN 1 ELSE 0 END) as auto_fix_applied,
  SUM(CASE WHEN r.resolution_method = 'auto' THEN 1 ELSE 0 END) as auto_resolved
FROM auto_diagnostic_results d
JOIN monitoring_alerts a ON d.alert_id = a.id
LEFT JOIN alert_resolution_tracking r ON a.id = r.alert_id
WHERE d.timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY a.alert_type
ORDER BY avg_confidence DESC;
```

---

### Task 4.2: Elite Guardian Auto-Diagnostics (3-4 hours)

**File**: `scripts/elite-health-guardian.sh`

Add intelligent diagnostic functions:

```bash
# ============================================
# Auto-Diagnostic Engine
# ============================================

run_auto_diagnostics() {
    local alert_id=$1
    local alert_type=$2
    local environment=$3

    log "INFO" "Running auto-diagnostics for alert $alert_id ($alert_type)..."

    local diagnostic_start=$(date +%s)
    local checks_performed='[]'
    local suspected_root_cause=""
    local suggested_actions='[]'
    local confidence_score=0

    case "$alert_type" in
        "health")
            # Container health diagnostic
            checks_performed='["container_status", "healthcheck_logs", "resource_usage", "network_connectivity"]'

            # Check recent container restarts
            local restart_count=$(docker inspect --format='{{.RestartCount}}' $BACKEND_CONTAINER 2>/dev/null || echo "0")
            if [ "$restart_count" -gt 3 ]; then
                suspected_root_cause="Container repeatedly crashing (${restart_count} restarts). Check application logs for errors."
                suggested_actions='["Check application logs", "Review recent deployments", "Verify environment variables"]'
                confidence_score=85
            fi

            # Check memory usage
            local mem_usage=$(docker stats --no-stream --format '{{.MemPerc}}' $BACKEND_CONTAINER 2>/dev/null | sed 's/%//')
            if [ "$(echo "$mem_usage > 90" | bc)" -eq 1 ]; then
                suspected_root_cause="High memory usage (${mem_usage}%). Container may be OOM killed."
                suggested_actions='["Increase container memory limit", "Check for memory leaks", "Review application memory usage"]'
                confidence_score=90
            fi
            ;;

        "drift")
            # Configuration drift diagnostic
            checks_performed='["docker_compose_diff", "env_file_diff", "volume_mounts", "network_config"]'

            # Compare production vs staging configs
            local prod_image=$(docker inspect --format='{{.Config.Image}}' $BACKEND_CONTAINER 2>/dev/null)
            suspected_root_cause="Configuration drift detected. Production image: ${prod_image}"
            suggested_actions='["Compare docker-compose files", "Verify environment variables", "Check volume mounts"]'
            confidence_score=75
            ;;

        "validation")
            # Pre-deployment validation diagnostic
            checks_performed='["test_suite_results", "database_migrations", "api_endpoints", "ssl_certificates"]'

            suspected_root_cause="Deployment validation failed. Review specific failed checks."
            suggested_actions='["Run test suite locally", "Verify database schema", "Check API connectivity"]'
            confidence_score=60
            ;;

        "system")
            # System resource diagnostic
            checks_performed='["disk_usage", "inode_usage", "cpu_load", "memory_pressure"]'

            local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
            if [ "$disk_usage" -gt 85 ]; then
                suspected_root_cause="Disk usage critical (${disk_usage}%). System may run out of space."
                suggested_actions='["Clean up old logs", "Remove unused Docker images", "Archive old data"]'
                confidence_score=95
            fi
            ;;
    esac

    local diagnostic_end=$(date +%s)
    local duration=$((diagnostic_end - diagnostic_start))

    # Insert diagnostic results
    docker exec $MYSQL_CONTAINER mysql -u$DB_USER -p$DB_PASS "$METRICS_DB" -e "
        INSERT INTO auto_diagnostic_results (
            id, alert_id, timestamp,
            checks_performed, suspected_root_cause, suggested_actions,
            diagnostic_duration_seconds, confidence_score,
            root_cause_identified
        ) VALUES (
            UUID(), '$alert_id', NOW(),
            '$checks_performed', '$suspected_root_cause', '$suggested_actions',
            $duration, $confidence_score,
            $([ -n "$suspected_root_cause" ] && echo "TRUE" || echo "FALSE")
        );
    " 2>/dev/null

    # Update alert with diagnostic data
    docker exec $MYSQL_CONTAINER mysql -u$DB_USER -p$DB_PASS "$METRICS_DB" -e "
        UPDATE monitoring_alerts
        SET diagnostic_data = JSON_OBJECT(
                'checks_performed', JSON_ARRAY($checks_performed),
                'suspected_root_cause', '$suspected_root_cause',
                'confidence_score', $confidence_score
            ),
            suggested_actions = '$suggested_actions',
            auto_diagnostic_run = TRUE
        WHERE id = '$alert_id';
    " 2>/dev/null

    log "INFO" "Auto-diagnostics complete. Confidence: ${confidence_score}%. Root cause: ${suspected_root_cause}"
}

# ============================================
# Detect Recurring Alert Patterns
# ============================================

detect_recurring_patterns() {
    # Find alerts that have occurred multiple times with same signature
    local recurring_alerts=$(docker exec $MYSQL_CONTAINER mysql -u$DB_USER -p$DB_PASS "$METRICS_DB" -N -e "
        SELECT
            alert_type,
            environment,
            MD5(CONCAT(alert_type, title, LEFT(message, 100))) as pattern_signature,
            COUNT(*) as occurrence_count,
            MIN(timestamp) as first_occurrence,
            MAX(timestamp) as last_occurrence
        FROM monitoring_alerts
        WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY pattern_signature
        HAVING occurrence_count >= 3;
    " 2>/dev/null)

    if [ -n "$recurring_alerts" ]; then
        while IFS=$'\t' read -r alert_type env signature count first_occ last_occ; do
            # Calculate average interval
            local time_diff=$(( $(date -d "$last_occ" +%s) - $(date -d "$first_occ" +%s) ))
            local avg_interval_hours=$(echo "scale=2; $time_diff / 3600 / ($count - 1)" | bc)

            # Insert or update recurring pattern
            docker exec $MYSQL_CONTAINER mysql -u$DB_USER -p$DB_PASS "$METRICS_DB" -e "
                INSERT INTO recurring_alert_patterns (
                    id, alert_type, environment, pattern_signature,
                    first_occurrence, last_occurrence, occurrence_count, avg_interval_hours
                ) VALUES (
                    UUID(), '$alert_type', '$env', '$signature',
                    '$first_occ', '$last_occ', $count, $avg_interval_hours
                )
                ON DUPLICATE KEY UPDATE
                    occurrence_count = VALUES(occurrence_count),
                    last_occurrence = VALUES(last_occurrence),
                    avg_interval_hours = VALUES(avg_interval_hours);
            " 2>/dev/null

            # Alert admin if high-frequency recurring issue
            if [ "$count" -ge 10 ]; then
                log "WARNING" "Recurring alert pattern detected: $alert_type (${count} occurrences, avg ${avg_interval_hours}h interval)"
                send_alert "warning" "Recurring Alert Pattern" "Alert type '$alert_type' has occurred $count times. This may indicate a systemic issue requiring permanent fix."
            fi
        done <<< "$recurring_alerts"
    fi
}

# ============================================
# Update send_alert to trigger diagnostics
# ============================================

send_alert() {
    local severity=$1
    local title=$2
    local message=$3
    local alert_type=${4:-"system"}
    local environment=${5:-"prod"}

    # Generate alert ID
    local alert_id=$(uuidgen)

    # Insert alert (existing code)
    docker exec $MYSQL_CONTAINER mysql -u$DB_USER -p$DB_PASS "$METRICS_DB" -e "
        INSERT INTO monitoring_alerts (
            id, alert_type, severity, environment, timestamp, title, message
        ) VALUES (
            '$alert_id', '$alert_type', '$severity', '$environment', NOW(), '$title', '$message'
        );
    " 2>/dev/null

    # Send email (existing code)
    # ...

    # NEW: Trigger auto-diagnostics for high-severity alerts
    if [ "$severity" = "critical" ] || [ "$severity" = "high" ]; then
        run_auto_diagnostics "$alert_id" "$alert_type" "$environment"
    fi
}

# ============================================
# Update main() function
# ============================================

main() {
    log "INFO" "=== Elite Health Guardian - Monitoring Cycle Started ==="

    # Existing monitoring...
    monitor_backend
    monitor_worker
    monitor_frontend
    monitor_partners
    monitor_mysql
    monitor_redis
    check_ssl_certificates
    collect_resource_metrics

    # NEW: Alert intelligence
    detect_recurring_patterns

    # Run once per hour (check minute)
    if [ "$(date +%M)" = "00" ]; then
        cleanup_old_data
    fi

    log "INFO" "=== Monitoring Cycle Complete ==="
}
```

---

### Task 4.3: Backend Alert Intelligence API (2-3 hours)

**File**: `backend/src/controllers/monitoring.admin.controller.ts`

```typescript
// ============================================
// Alert Intelligence Dashboard
// ============================================

export const getAlertIntelligence = async (req: Request, res: Response) => {
  try {
    // Get MTTR statistics
    const mttrStats = await sequelize.query(
      `SELECT * FROM mttr_by_alert_type`,
      { type: QueryTypes.SELECT }
    ) as any[]

    // Get recurring alerts
    const recurringAlerts = await sequelize.query(
      `SELECT * FROM top_recurring_alerts`,
      { type: QueryTypes.SELECT }
    ) as any[]

    // Get alert effectiveness
    const effectiveness = await sequelize.query(
      `SELECT * FROM alert_effectiveness`,
      { type: QueryTypes.SELECT }
    ) as any[]

    // Calculate overall MTTR
    const overallMTTR = mttrStats.length > 0
      ? Math.round(mttrStats.reduce((sum: number, s: any) => sum + parseFloat(s.avg_resolution_time || 0), 0) / mttrStats.length)
      : 0

    // Get recent auto-diagnostics
    const recentDiagnostics = await sequelize.query(
      `SELECT d.*, a.title, a.severity
       FROM auto_diagnostic_results d
       JOIN monitoring_alerts a ON d.alert_id = a.id
       WHERE d.timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
       ORDER BY d.timestamp DESC
       LIMIT 10`,
      { type: QueryTypes.SELECT }
    ) as any[]

    res.json({
      success: true,
      data: {
        mttr: {
          overall_seconds: overallMTTR,
          by_alert_type: mttrStats
        },
        recurring_alerts: recurringAlerts,
        effectiveness: effectiveness,
        recent_diagnostics: recentDiagnostics,
        summary: {
          total_alerts_30d: mttrStats.reduce((sum: number, s: any) => sum + parseInt(s.total_alerts || 0), 0),
          auto_resolved_count: mttrStats.reduce((sum: number, s: any) => sum + parseInt(s.auto_resolved_count || 0), 0),
          recurring_patterns: recurringAlerts.length
        }
      }
    })
  } catch (error: any) {
    console.error('Alert intelligence error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

// ============================================
// Get Auto-Diagnostic Details
// ============================================

export const getAutoDiagnostics = async (req: Request, res: Response) => {
  try {
    const { alert_id } = req.params

    const diagnostics = await sequelize.query(
      `SELECT * FROM auto_diagnostic_results WHERE alert_id = :alert_id ORDER BY timestamp DESC`,
      {
        replacements: { alert_id },
        type: QueryTypes.SELECT
      }
    ) as any[]

    if (diagnostics.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No diagnostics found for this alert'
      })
    }

    res.json({
      success: true,
      data: diagnostics[0]
    })
  } catch (error: any) {
    console.error('Auto-diagnostics error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

// ============================================
// Mark Recurring Pattern as Fixed
// ============================================

export const markRecurringPatternFixed = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { fix_notes } = req.body
    const admin_email = (req as any).user?.email || 'unknown'

    await sequelize.query(
      `UPDATE recurring_alert_patterns
       SET permanent_fix_applied = TRUE,
           fix_notes = :notes
       WHERE id = :id`,
      {
        replacements: { id, notes: fix_notes || `Fixed by ${admin_email}` },
        type: QueryTypes.UPDATE
      }
    )

    res.json({
      success: true,
      message: 'Recurring pattern marked as fixed'
    })
  } catch (error: any) {
    console.error('Mark pattern fixed error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}
```

---

### Task 4.4: Register Alert Intelligence Routes (30 min)

**File**: `backend/src/routes/monitoring.admin.routes.ts`

```typescript
import {
  getAlertIntelligence,
  getAutoDiagnostics,
  markRecurringPatternFixed
} from '../controllers/monitoring.admin.controller'

// Alert Intelligence
router.get('/alert-intelligence', getAlertIntelligence)
router.get('/auto-diagnostics/:alert_id', getAutoDiagnostics)
router.post('/recurring-patterns/:id/mark-fixed', auditLogMiddleware, markRecurringPatternFixed)
```

---

### Task 4.5: Frontend Alert Intelligence UI (3-4 hours)

**File**: `app/admin/monitoring/page.tsx`

Add "Alerts" tab with intelligence features:

```typescript
// Add to imports
import { Brain, Repeat, Target, TrendingDown } from 'lucide-react'

// Add to state
const [alertIntelligence, setAlertIntelligence] = useState<any>(null)

// Add fetch function
const fetchAlertIntelligence = async () => {
  try {
    const response = await fetch(`${API_URL}/api/admin/monitoring/alert-intelligence`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    })
    const data = await response.json()
    if (data.success) setAlertIntelligence(data.data)
  } catch (error) {
    console.error('Failed to fetch alert intelligence:', error)
  }
}

// Add Alerts tab
{activeTab === 'alerts' && (
  <div className="space-y-6">
    {/* MTTR Overview */}
    <div className="grid grid-cols-4 gap-4">
      <div className="glass-strong p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">
              {Math.round((alertIntelligence?.mttr?.overall_seconds || 0) / 60)}m
            </div>
            <div className="text-sm text-gray-600 mt-1">Avg MTTR</div>
          </div>
          <Target className="w-8 h-8 text-blue-500" />
        </div>
      </div>

      <div className="glass-strong p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">
              {alertIntelligence?.summary?.total_alerts_30d || 0}
            </div>
            <div className="text-sm text-gray-600 mt-1">Alerts (30d)</div>
          </div>
          <AlertTriangle className="w-8 h-8 text-yellow-500" />
        </div>
      </div>

      <div className="glass-strong p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-green-600">
              {alertIntelligence?.summary?.auto_resolved_count || 0}
            </div>
            <div className="text-sm text-gray-600 mt-1">Auto-Resolved</div>
          </div>
          <Brain className="w-8 h-8 text-green-500" />
        </div>
      </div>

      <div className="glass-strong p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {alertIntelligence?.recurring_alerts?.length || 0}
            </div>
            <div className="text-sm text-gray-600 mt-1">Recurring</div>
          </div>
          <Repeat className="w-8 h-8 text-orange-500" />
        </div>
      </div>
    </div>

    {/* MTTR by Alert Type */}
    <div className="glass-strong p-6 rounded-xl">
      <h3 className="text-lg font-semibold mb-4">Resolution Time by Alert Type</h3>
      <div className="space-y-3">
        {alertIntelligence?.mttr?.by_alert_type?.map((type: any) => (
          <div key={type.alert_type} className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{type.alert_type}</span>
                <span className="text-sm text-gray-600">
                  {Math.round(type.avg_resolution_time / 60)}m avg
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{
                    width: `${Math.min(100, (type.auto_resolved_count / type.total_alerts) * 100)}%`
                  }}
                />
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">
                {type.total_alerts} alerts
              </div>
              <div className="text-xs text-green-600">
                {type.auto_resolved_count} auto-fixed
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Recurring Alerts */}
    <div className="glass-strong p-6 rounded-xl">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Repeat className="w-5 h-5 text-orange-500" />
        Recurring Alert Patterns
      </h3>
      <div className="space-y-2">
        {alertIntelligence?.recurring_alerts?.slice(0, 5).map((pattern: any) => (
          <div key={pattern.id} className="p-4 bg-orange-50 border-l-4 border-orange-500 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-sm">{pattern.alert_type}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {pattern.suspected_root_cause || 'Root cause under investigation'}
                </div>
                <div className="text-xs text-gray-500 mt-2 flex items-center gap-4">
                  <span>{pattern.occurrence_count} occurrences</span>
                  <span>Avg interval: {parseFloat(pattern.avg_interval_hours || 0).toFixed(1)}h</span>
                  <span>Last: {new Date(pattern.last_occurrence).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="text-xs px-2 py-1 bg-orange-200 text-orange-800 rounded">
                RECURRING
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Recent Auto-Diagnostics */}
    <div className="glass-strong p-6 rounded-xl">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Brain className="w-5 h-5 text-purple-500" />
        Recent Auto-Diagnostics
      </h3>
      <div className="space-y-2">
        {alertIntelligence?.recent_diagnostics?.slice(0, 5).map((diagnostic: any) => (
          <div key={diagnostic.id} className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-sm">{diagnostic.title}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {diagnostic.suspected_root_cause || 'Diagnostic in progress...'}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Confidence: {parseFloat(diagnostic.confidence_score || 0).toFixed(0)}%
                  {' • '}
                  {new Date(diagnostic.timestamp).toLocaleString()}
                </div>
              </div>
              <div className={`text-xs px-2 py-1 rounded ${
                diagnostic.severity === 'critical' ? 'bg-red-200 text-red-800' :
                diagnostic.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                'bg-yellow-200 text-yellow-800'
              }`}>
                {diagnostic.severity?.toUpperCase()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}
```

---

## Deployment Timeline

### Week 1: Phase 2 (SSL & Security)
- **Day 1-2**: Database schema + Elite Guardian SSL monitoring
- **Day 3**: Backend API endpoints + routes
- **Day 4-5**: Frontend Security tab + testing

### Week 2: Phase 3 (Performance Metrics)
- **Day 1-2**: Database schema + job performance collector script
- **Day 3**: Backend API endpoints + routes
- **Day 4-5**: Frontend Performance tab + testing

### Week 3: Phase 4 (Alert Intelligence)
- **Day 1-2**: Database schema + auto-diagnostics engine
- **Day 3**: Backend API endpoints + routes
- **Day 4-5**: Frontend Alerts tab + testing

---

## Success Criteria

### Phase 2 Complete When:
- [ ] SSL certificates monitored with expiry alerts
- [ ] Security events logged and displayed
- [ ] Compliance score visible in dashboard
- [ ] Email alerts sent for SSL expiry

### Phase 3 Complete When:
- [ ] Job throughput metrics collected every minute
- [ ] Queue health visible in real-time
- [ ] Failure reasons analyzed and displayed
- [ ] Performance trends shown over 24h

### Phase 4 Complete When:
- [ ] Auto-diagnostics run on critical alerts
- [ ] MTTR calculated per alert type
- [ ] Recurring patterns detected automatically
- [ ] Suggested actions displayed for alerts

---

**Total Estimated Time**: 24-30 hours
**Completion Target**: Week 3 (2025-11-23)
