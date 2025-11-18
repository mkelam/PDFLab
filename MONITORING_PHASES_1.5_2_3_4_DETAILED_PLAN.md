# Monitoring Dashboard - Phases 1.5, 2, 3, 4 Detailed Implementation Plan

**Created**: 2025-11-16
**Status**: Ready for Execution
**Prerequisites**: Phase 1 Complete ✅

---

## Phase 1.5: UI Polish - Resource Cards & Remediation Log (OPTIONAL - Estimated: 1-2 hours)

### Overview
Complete the remaining UI components from Phase 1 that were skipped due to token limits. All backend infrastructure is already in place - this is purely visual polish.

**Status**: ⏳ Optional Enhancement
**Priority**: 🟡 MEDIUM (Nice-to-have)
**Data Ready**: ✅ YES - All APIs working and collecting data

---

### Task 1.5.1: Add 3 Resource Monitoring Cards (45 minutes)

**File**: `app/admin/monitoring/page.tsx`

Add these cards after the "Active Alerts" card (after the top KPI summary):

```typescript
{/* Resource Usage Cards - PHASE 1.5 */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
  {/* Disk Space Card */}
  <Card className="glass-strong border-border/50">
    <CardHeader className="pb-3">
      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <HardDrive className="w-4 h-4" />
        Disk Space
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-bold">
              {resourceMetrics?.current.disk.used_percent.toFixed(1)}%
            </span>
            <Badge variant={
              resourceMetrics?.current.disk.used_percent >= 95 ? 'destructive' :
              resourceMetrics?.current.disk.used_percent >= 85 ? 'secondary' : 'default'
            }>
              {resourceMetrics?.current.disk.used_gb.toFixed(1)} / {resourceMetrics?.current.disk.total_gb.toFixed(1)} GB
            </Badge>
          </div>
          <div className="w-full bg-border/50 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                resourceMetrics?.current.disk.used_percent >= 95 ? 'bg-red-500' :
                resourceMetrics?.current.disk.used_percent >= 85 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${resourceMetrics?.current.disk.used_percent || 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Warning: 85%</span>
            <span>Critical: 95%</span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>

  {/* Memory Usage Card */}
  <Card className="glass-strong border-border/50">
    <CardHeader className="pb-3">
      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Activity className="w-4 h-4" />
        Memory Usage
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        {/* Backend */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center gap-1">
              <Server className="w-3 h-3" /> Backend
            </span>
            <span className="font-semibold">{resourceMetrics?.current.memory.backend.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-border/50 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${
                resourceMetrics?.current.memory.backend >= 80 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${resourceMetrics?.current.memory.backend || 0}%` }}
            />
          </div>
        </div>

        {/* Worker */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3" /> Worker
            </span>
            <span className="font-semibold">{resourceMetrics?.current.memory.worker.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-border/50 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${
                resourceMetrics?.current.memory.worker >= 80 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${resourceMetrics?.current.memory.worker || 0}%` }}
            />
          </div>
        </div>

        {/* MySQL */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3" /> MySQL
            </span>
            <span className="font-semibold">{resourceMetrics?.current.memory.mysql.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-border/50 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${
                resourceMetrics?.current.memory.mysql >= 80 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${resourceMetrics?.current.memory.mysql || 0}%` }}
            />
          </div>
        </div>

        {/* Redis */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3" /> Redis
            </span>
            <span className="font-semibold">{resourceMetrics?.current.memory.redis.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-border/50 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${
                resourceMetrics?.current.memory.redis >= 80 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${resourceMetrics?.current.memory.redis || 0}%` }}
            />
          </div>
        </div>

        {/* Frontend */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center gap-1">
              <Monitor className="w-3 h-3" /> Frontend
            </span>
            <span className="font-semibold">{resourceMetrics?.current.memory.frontend.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-border/50 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${
                resourceMetrics?.current.memory.frontend >= 80 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${resourceMetrics?.current.memory.frontend || 0}%` }}
            />
          </div>
        </div>

        {/* Partners */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" /> Partners
            </span>
            <span className="font-semibold">{resourceMetrics?.current.memory.partners.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-border/50 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${
                resourceMetrics?.current.memory.partners >= 80 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${resourceMetrics?.current.memory.partners || 0}%` }}
            />
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-3">Warning threshold: 80%</p>
    </CardContent>
  </Card>

  {/* Redis Cache Card */}
  <Card className="glass-strong border-border/50">
    <CardHeader className="pb-3">
      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <HardDrive className="w-4 h-4" />
        Redis Cache
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Cache Hit Rate</p>
          <p className="text-2xl font-bold">
            {((resourceMetrics?.current.redis.hit_rate || 0) * 100).toFixed(1)}%
          </p>
          <div className="w-full bg-border/50 rounded-full h-2 mt-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${(resourceMetrics?.current.redis.hit_rate || 0) * 100}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">Total Keys</p>
            <p className="font-semibold text-lg">{(resourceMetrics?.current.redis.keys || 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Memory</p>
            <p className="font-semibold text-lg">{resourceMetrics?.current.redis.memory_percent.toFixed(1)}%</p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</div>
```

**Note**: Resource metrics are already being fetched via `fetchResourceMetrics()` in the existing code from Phase 1, so no additional API calls needed.

---

### Task 1.5.2: Add Remediation Log Tab (45 minutes)

**File**: `app/admin/monitoring/page.tsx`

Add new tab to the existing Tabs component (update the TabsList and add TabsContent):

```typescript
{/* Update TabsList to include Remediation tab */}
<Tabs defaultValue="alerts" className="space-y-6">
  <TabsList className="glass-subtle border border-border/50">
    <TabsTrigger value="alerts">Alerts ({alerts.length})</TabsTrigger>
    <TabsTrigger value="remediation">Auto-Remediation</TabsTrigger>  {/* NEW */}
    <TabsTrigger value="health">Health Checks ({healthChecks.length})</TabsTrigger>
    <TabsTrigger value="drift">Drift Checks ({driftChecks.length})</TabsTrigger>
  </TabsList>

  {/* ... existing Alerts tab ... */}

  {/* NEW: Remediation Log Tab */}
  <TabsContent value="remediation">
    <Card className="glass-strong border-border/50">
      <CardHeader>
        <CardTitle>Auto-Remediation Activity Log</CardTitle>
        <CardDescription>
          Actions taken automatically by Elite Health Guardian to maintain system health
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {!remediationLog || remediationLog.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold text-foreground">No Remediation Actions Yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Elite Guardian will log automated fixes here when issues are detected
              </p>
            </div>
          ) : (
            remediationLog.map((action) => (
              <div
                key={action.id}
                className="p-4 rounded-lg border border-border/50 hover:border-border transition-colors bg-background/30"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-2">
                      <Badge
                        variant={action.status === 'success' ? 'default' : 'destructive'}
                        className="capitalize"
                      >
                        {action.status === 'success' ? '✅ Success' : '❌ Failed'}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {action.action_type.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {action.target}
                      </span>
                    </div>

                    {/* Reason */}
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong className="text-foreground">Reason:</strong> {action.reason}
                    </p>

                    {/* Metrics Before/After */}
                    {action.metrics_before && action.metrics_after && (
                      <div className="bg-background/50 rounded p-3 mb-2 text-xs border border-border/30">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-muted-foreground font-semibold">Before:</span>
                            <pre className="text-foreground mt-1 font-mono">
                              {JSON.stringify(
                                typeof action.metrics_before === 'string'
                                  ? JSON.parse(action.metrics_before)
                                  : action.metrics_before,
                                null,
                                2
                              )}
                            </pre>
                          </div>
                          <div>
                            <span className="text-green-600 font-semibold">After:</span>
                            <pre className="text-green-500 mt-1 font-mono">
                              {JSON.stringify(
                                typeof action.metrics_after === 'string'
                                  ? JSON.parse(action.metrics_after)
                                  : action.metrics_after,
                                null,
                                2
                              )}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Duration & Timestamp */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Duration: {action.duration_seconds}s
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(action.timestamp).toLocaleString()}
                      </span>
                    </div>

                    {/* Error Message */}
                    {action.error_message && (
                      <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
                        <strong>Error:</strong> {action.error_message}
                      </div>
                    )}
                  </div>

                  {/* Action Icon */}
                  <div className="ml-4">
                    {action.action_type === 'restart' && <RefreshCw className="w-6 h-6 text-blue-500" />}
                    {action.action_type === 'cache_clear' && <XCircle className="w-6 h-6 text-yellow-500" />}
                    {action.action_type === 'disk_cleanup' && <HardDrive className="w-6 h-6 text-green-500" />}
                    {action.action_type === 'db_optimize' && <Database className="w-6 h-6 text-purple-500" />}
                    {action.action_type === 'ssl_renew' && <Shield className="w-6 h-6 text-teal-500" />}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Statistics Footer */}
        {remediationLog && remediationLog.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Showing {remediationLog.length} most recent remediation actions
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  </TabsContent>

  {/* ... existing Health and Drift tabs ... */}
</Tabs>
```

**Note**: Remediation log data is already being fetched via `fetchRemediationLog()` in the existing code from Phase 1, so no additional API calls needed.

---

### Task 1.5.3: Add Missing Icon Imports (5 minutes)

**File**: `app/admin/monitoring/page.tsx`

Add these icons to the existing import statement at the top of the file:

```typescript
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  RefreshCw,
  Server,
  Database,
  Wifi,
  HardDrive,
  Bell,
  BellOff,
  Eye,
  Filter,
  Monitor,    // Already added in Phase 1
  Users,      // Already added in Phase 1
  Shield,     // NEW for Phase 1.5
  Clock,      // NEW for Phase 1.5
  Calendar    // NEW for Phase 1.5
} from 'lucide-react'
```

---

### Deployment Steps (15 minutes)

Since all backend infrastructure is already deployed, only frontend changes are needed:

```bash
# 1. Make changes to app/admin/monitoring/page.tsx locally
# 2. Test locally
npm run dev
# Navigate to http://localhost:3000/admin/monitoring

# 3. Build and deploy to production
npm run build

# 4. Build Docker image
docker build -t mkelam/pdflab-frontend:latest .

# 5. Push to registry
docker push mkelam/pdflab-frontend:latest

# 6. Deploy on VPS
ssh root@141.136.44.168 << 'EOF'
cd /var/pdflab/app
docker-compose -f docker-compose.production.yml pull frontend
docker-compose -f docker-compose.production.yml up -d frontend
EOF

# 7. Verify deployment
# Visit https://pdflab.pro/admin/monitoring
```

---

### Verification Checklist

- [ ] Resource cards display with live data (Disk, Memory, Redis)
- [ ] Disk space shows percentage, GB used/total, and color-coded progress bar
- [ ] Memory usage shows all 6 services with individual bars
- [ ] Redis cache card shows hit rate, keys count, and memory usage
- [ ] Remediation log tab exists and is accessible
- [ ] Remediation log displays actions with before/after metrics
- [ ] Remediation log shows icons for each action type
- [ ] All icons render correctly (Shield, Clock, Calendar)
- [ ] Auto-refresh updates resource cards every 30s
- [ ] Mobile responsive layout works for all cards
- [ ] No console errors in browser
- [ ] No TypeScript compilation errors

---

### Why This is Optional

**Pros of Implementing**:
- ✅ Better visual representation of resource utilization
- ✅ Transparency into automated remediation actions
- ✅ Complete picture of system health in one dashboard
- ✅ Helps identify resource trends at a glance

**Cons / Why It Can Wait**:
- ⚠️ Data is already being collected and stored
- ⚠️ Can access same data via database queries if needed
- ⚠️ Phases 2-4 add more critical functionality
- ⚠️ Pure UI enhancement with no functional impact

**Recommendation**: Skip for now and proceed directly to **Phase 2: SSL & Security Monitoring** unless you want the visual polish immediately. You can always come back to Phase 1.5 later since the backend infrastructure is ready.

---

## Phase 2: SSL & Security Monitoring (Estimated: 6-8 hours)

[Rest of the phases 2, 3, and 4 continue exactly as in the original file...]
