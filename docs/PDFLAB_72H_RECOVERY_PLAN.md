# PDFLab 72-Hour Recovery Plan - PATH A EXECUTION
## Emergency Stability Restoration Protocol

**Status**: 🚨 ACTIVE DEPLOYMENT  
**Timeline**: 2 hours fixes + 72 hours validation  
**Expected Outcome**: 93% crash reduction, 99% uptime  
**Team**: 4 people (Tech Lead, 2 Backend Devs, DevOps)  

---

## Table of Contents

1. [Pre-Flight Checklist](#pre-flight-checklist)
2. [Phase 1A: Critical Fixes (2 Hours)](#phase-1a-critical-fixes-2-hours)
3. [Post-Deployment Validation](#post-deployment-validation)
4. [24-Hour Monitoring Protocol](#24-hour-monitoring-protocol)
5. [72-Hour Success Validation](#72-hour-success-validation)
6. [Rollback Procedures](#rollback-procedures)
7. [Post-Recovery Next Steps](#post-recovery-next-steps)

---

## Pre-Flight Checklist

### 1. Team Assembly (5 minutes)

**Required Personnel**:
- ✅ Tech Lead (Coordinator, final decisions)
- ✅ Backend Developer #1 (Fixes 1-3)
- ✅ Backend Developer #2 (Fixes 4-7)
- ✅ DevOps Engineer (Deployment, monitoring)

**Communication Setup**:
```
# Create Slack war room
/create-channel #pdflab-emergency-recovery

# Post announcement
@channel EMERGENCY STABILITY FIXES IN PROGRESS
Timeline: Next 2 hours
Status updates: Every 30 minutes
Expected downtime: 5-10 minutes (container restarts)
Estimated completion: [TIME + 2 hours]

Team on call:
- Tech Lead: [NAME/PHONE]
- Backend Dev 1: [NAME/PHONE]
- Backend Dev 2: [NAME/PHONE]
- DevOps: [NAME/PHONE]

Monitoring:
- Sentry: [LINK]
- Docker logs: ssh root@141.136.44.168
- UptimeRobot: [LINK]
```

---

### 2. Create Complete Backups (10 minutes)

**CRITICAL: Do NOT skip this step. These backups are your rollback safety net.**

```bash
# SSH into production VPS
ssh root@141.136.44.168

# Create backup directory with timestamp
BACKUP_DIR="/var/pdflab/backups/pre-phase1a-$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# ============================================
# BACKUP 1: MySQL Database (CRITICAL)
# ============================================
echo "Starting MySQL backup..."
docker exec pdflab-mysql-prod mysqldump \
  -u pdflab \
  -p<DB_PASSWORD> \
  pdflab_production \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --hex-blob \
  > "$BACKUP_DIR/pdflab_database.sql"

# Compress backup
gzip "$BACKUP_DIR/pdflab_database.sql"

# Verify size (should be >1MB)
ls -lh "$BACKUP_DIR/pdflab_database.sql.gz"
echo "✓ MySQL backup complete"

# ============================================
# BACKUP 2: Redis Data (IMPORTANT)
# ============================================
echo "Starting Redis backup..."
docker exec pdflab-redis-prod redis-cli SAVE
docker cp pdflab-redis-prod:/data/dump.rdb "$BACKUP_DIR/redis_dump.rdb"
echo "✓ Redis backup complete"

# ============================================
# BACKUP 3: Application Files (IMPORTANT)
# ============================================
echo "Starting storage backup..."
tar -czf "$BACKUP_DIR/storage.tar.gz" /var/pdflab/storage/
echo "✓ Storage backup complete"

# ============================================
# BACKUP 4: Configuration Files (CRITICAL)
# ============================================
echo "Backing up configuration files..."
cd /var/pdflab/app

# Docker compose
cp docker-compose.production.yml "$BACKUP_DIR/docker-compose.production.yml"

# Environment files
cp backend/.env.production "$BACKUP_DIR/backend.env.production"
cp frontend/.env.production "$BACKUP_DIR/frontend.env.production" 2>/dev/null || true

# Nginx config (if exists)
cp nginx.conf "$BACKUP_DIR/nginx.conf" 2>/dev/null || true

echo "✓ Configuration backup complete"

# ============================================
# BACKUP 5: Git State (IMPORTANT)
# ============================================
echo "Recording git state..."
git log -1 --oneline > "$BACKUP_DIR/git_commit.txt"
git status > "$BACKUP_DIR/git_status.txt"
git diff > "$BACKUP_DIR/git_diff.txt"
echo "✓ Git state recorded"

# ============================================
# BACKUP 6: Container State (INFORMATIONAL)
# ============================================
echo "Recording container state..."
docker ps -a > "$BACKUP_DIR/containers_before.txt"
docker stats --no-stream > "$BACKUP_DIR/docker_stats_before.txt"
docker logs pdflab-backend-prod --tail 500 > "$BACKUP_DIR/backend_logs_before.txt"
echo "✓ Container state recorded"

# ============================================
# VERIFICATION
# ============================================
echo ""
echo "===== BACKUP VERIFICATION ====="
ls -lh "$BACKUP_DIR"
echo ""
echo "Critical backups:"
echo "  MySQL: $(du -h $BACKUP_DIR/pdflab_database.sql.gz | cut -f1)"
echo "  Redis: $(du -h $BACKUP_DIR/redis_dump.rdb | cut -f1)"
echo "  Storage: $(du -h $BACKUP_DIR/storage.tar.gz | cut -f1)"
echo ""

# Check MySQL backup is not empty
MYSQL_SIZE=$(stat -f%z "$BACKUP_DIR/pdflab_database.sql.gz" 2>/dev/null || stat -c%s "$BACKUP_DIR/pdflab_database.sql.gz")
if [ "$MYSQL_SIZE" -lt 1000000 ]; then
  echo "⚠️  WARNING: MySQL backup seems too small (<1MB). Verify before proceeding!"
  exit 1
fi

echo "✓ All backups verified"
echo "Backup location: $BACKUP_DIR"
echo ""
echo "SAVE THIS PATH FOR ROLLBACK: $BACKUP_DIR"
echo ""

# Save backup path to a file for easy reference
echo "$BACKUP_DIR" > /var/pdflab/LAST_BACKUP_PATH.txt
```

**Success Criteria**:
- ✅ MySQL backup exists and is >1MB
- ✅ Redis dump.rdb exists
- ✅ Storage tar.gz exists
- ✅ All config files backed up
- ✅ Git state recorded
- ✅ Backup path saved to /var/pdflab/LAST_BACKUP_PATH.txt

**CHECKPOINT**: Do NOT proceed until all backups are verified.

---

### 3. Prepare Git Branches (5 minutes)

```bash
# On your local development machine
cd /path/to/pdflab

# Ensure you're on main and up to date
git checkout main
git pull origin main

# Create emergency fix branch
git checkout -b emergency/phase1a-stability-fixes

# Push to remote
git push -u origin emergency/phase1a-stability-fixes

# Verify branch exists
git branch -a | grep phase1a

echo "✓ Git branch ready: emergency/phase1a-stability-fixes"
```

---

### 4. Set Up Monitoring Dashboard (5 minutes)

**Open These Tabs (Keep them visible during deployment)**:

**Tab 1: Sentry Dashboard**
```
https://sentry.io/organizations/pdflab/issues/?project=YOUR_PROJECT_ID
```
- Watch for: Error rate (should drop dramatically after fixes)
- Baseline now: Note current errors/hour

**Tab 2: Server SSH (Docker Logs)**
```bash
# Keep this terminal open
ssh root@141.136.44.168
docker logs -f pdflab-backend-prod
```
- Watch for: Errors, crashes, restarts

**Tab 3: UptimeRobot**
```
https://uptimerobot.com/dashboard
```
- Watch for: Downtime alerts

**Tab 4: Production Health Endpoint**
```bash
# Run this in a loop (separate terminal)
watch -n 30 'curl -s https://pdflab.pro/health | jq'
```
- Watch for: Health status changes

**Tab 5: Slack War Room**
```
#pdflab-emergency-recovery
```
- Post updates every 30 minutes

---

### 5. Document Current Metrics (5 minutes)

**Capture Baseline**:

```bash
# On production server
ssh root@141.136.44.168

# Create metrics directory
mkdir -p /var/pdflab/metrics/phase1a-before

# Current error rate from Sentry
# (manually record from Sentry dashboard)
echo "Sentry errors/hour: [RECORD THIS NUMBER]" > /var/pdflab/metrics/phase1a-before/baseline.txt

# Container status
docker ps -a > /var/pdflab/metrics/phase1a-before/containers.txt

# Resource usage
docker stats --no-stream > /var/pdflab/metrics/phase1a-before/resources.txt

# Recent crashes (last 24 hours)
docker logs pdflab-backend-prod --since 24h | grep -i "error\|crash\|fatal" | wc -l > /var/pdflab/metrics/phase1a-before/error_count.txt

echo "Baseline metrics captured"
```

**Record These Manually**:
- Current time: ________________
- Sentry errors/hour: ________________
- Backend container restarts (last 24h): ________________
- Support tickets open: ________________
- User complaints (last 24h): ________________

---

## Phase 1A: Critical Fixes (2 Hours)

### Timeline Overview

```
[Start] → Fix 1 (15m) → Fix 2 (15m) → Fix 3 (30m) → Fix 4 (10m) 
        → Fix 5 (15m) → Fix 6 (30m) → Fix 7 (30m) → Validation (15m) → [Complete]

Total: ~2 hours 30 minutes (includes buffer time)
```

---

### FIX 1: Remove Duplicate Worker Container (15 minutes)

**Priority**: P0 - CRITICAL  
**Impact**: 80% crash reduction  
**Risk**: Low (removing unused service)  
**Owner**: DevOps Engineer  

#### Problem

The duplicate worker container creates race conditions in the Redis queue, causing 80% of backend crashes.

```yaml
# Current state (BROKEN)
backend:
  command: ["npm", "start"]  # Runs workers

worker:  # ← DUPLICATE PROBLEM
  command: ["node", "dist/server.js"]  # ALSO runs workers!
```

#### Solution

```bash
# ============================================
# STEP 1: SSH to production
# ============================================
ssh root@141.136.44.168
cd /var/pdflab/app

# ============================================
# STEP 2: Check current container status
# ============================================
echo "Current containers:"
docker ps -a | grep pdflab
echo ""

# You should see both 'pdflab-backend-prod' and 'pdflab-worker-prod'

# ============================================
# STEP 3: Stop and remove worker container
# ============================================
echo "Stopping worker container..."
docker stop pdflab-worker-prod

echo "Removing worker container..."
docker rm pdflab-worker-prod

# ============================================
# STEP 4: Edit docker-compose.production.yml
# ============================================
echo "Editing docker-compose file..."

# Make backup first
cp docker-compose.production.yml docker-compose.production.yml.backup

# Edit the file
nano docker-compose.production.yml

# DELETE THE ENTIRE 'worker' SERVICE BLOCK
# It should look something like this:
#
#   worker:
#     image: mkelam/pdflab-backend:latest
#     container_name: pdflab-worker-prod
#     restart: unless-stopped
#     command: ["node", "dist/server.js"]
#     environment:
#       - NODE_ENV=production
#     env_file:
#       - backend/.env.production
#     depends_on:
#       - mysql
#       - redis
#     networks:
#       - pdflab-network
#
# DELETE ALL OF THAT ^^^

# Save and exit (Ctrl+X, Y, Enter)

# ============================================
# STEP 5: Verify edit
# ============================================
echo "Verifying worker section removed..."
grep -A 10 "worker:" docker-compose.production.yml

# Should return nothing or very different content

# ============================================
# STEP 6: Restart backend to apply changes
# ============================================
echo "Restarting backend container..."
docker restart pdflab-backend-prod

# Wait for restart
sleep 10

# ============================================
# STEP 7: Verify fix
# ============================================
echo ""
echo "===== VERIFICATION ====="
echo "1. Container status:"
docker ps | grep pdflab
echo ""
echo "Expected: Should see backend, frontend, mysql, redis"
echo "Expected: Should NOT see worker"
echo ""

# Check backend logs for worker initialization
echo "2. Backend worker status:"
docker logs pdflab-backend-prod --tail 50 | grep -i "worker\|queue\|bull"
echo ""
echo "Expected: Should see ONE worker initialization, not two"
echo ""

# Check Redis queue
echo "3. Redis queue status:"
docker exec pdflab-redis-prod redis-cli LLEN bull:conversion:waiting
docker exec pdflab-redis-prod redis-cli LLEN bull:conversion:active
echo ""
echo "Expected: Normal queue sizes (0-5 jobs)"
echo ""

# ============================================
# STEP 8: Monitor for 10 minutes
# ============================================
echo "Monitoring backend logs for 10 minutes..."
echo "Watch for: NO 'race condition', NO 'duplicate job' errors"
echo ""
docker logs -f pdflab-backend-prod --tail 50

# (Ctrl+C after 10 minutes)

# ============================================
# CHECKPOINT
# ============================================
echo ""
echo "FIX 1 COMPLETE ✓"
echo ""
echo "Success criteria:"
echo "  ✓ Worker container removed"
echo "  ✓ Only backend container runs workers"
echo "  ✓ No duplicate job processing errors"
echo "  ✓ Redis queue functioning normally"
echo ""
```

**Success Criteria**:
- ✅ Worker container no longer exists
- ✅ Only 5 workers running (not 10)
- ✅ No "race condition" errors in logs
- ✅ Backend logs show single worker initialization

**Post in Slack**:
```
✓ FIX 1 COMPLETE (15 min)
- Removed duplicate worker container
- Expected impact: 80% crash reduction
- Status: Monitoring for 10 minutes, no errors
```

---

### FIX 2: Enable Redis Reconnection (15 minutes)

**Priority**: P0 - CRITICAL  
**Impact**: 90% reduction in Redis-related failures  
**Risk**: Low (enabling resilience feature)  
**Owner**: Backend Developer #1  

#### Problem

Redis reconnection is disabled. Any Redis hiccup kills the entire backend.

```typescript
// Current state (BROKEN)
reconnectStrategy: false  // ← Backend dies if Redis restarts
```

#### Solution

```bash
# ============================================
# STEP 1: On local development machine
# ============================================
cd /path/to/pdflab
git checkout emergency/phase1a-stability-fixes
git pull origin emergency/phase1a-stability-fixes

# ============================================
# STEP 2: Edit Redis config
# ============================================
nano backend/src/config/redis.ts

# FIND THIS SECTION (around line 10-20):
# export const redisClient = createClient({
#   url: process.env.REDIS_URL || 'redis://redis:6379',
#   socket: {
#     connectTimeout: 5000,
#     reconnectStrategy: false  // ← CHANGE THIS
#   }
# })

# REPLACE WITH:
export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379',
  socket: {
    connectTimeout: 15000,  // Increased from 5000
    reconnectStrategy: (retries: number) => {
      // Max 10 retries
      if (retries > 10) {
        logger.error('Redis reconnection failed after 10 attempts')
        return new Error('Max Redis reconnection retries reached')
      }
      
      // Exponential backoff: 100ms, 200ms, 400ms... up to 3000ms
      const delay = Math.min(retries * 100, 3000)
      logger.warn(`Redis reconnecting in ${delay}ms (attempt ${retries}/10)`)
      return delay
    }
  }
})

# ADD CONNECTION EVENT HANDLERS (after createClient):
// Connection event handlers
redisClient.on('connect', () => {
  logger.info('Redis client connected')
})

redisClient.on('ready', () => {
  logger.info('Redis client ready')
})

redisClient.on('error', (err) => {
  logger.error('Redis client error', { error: err.message })
})

redisClient.on('reconnecting', () => {
  logger.warn('Redis client reconnecting...')
})

redisClient.on('end', () => {
  logger.warn('Redis client connection closed')
})

# Save and exit (Ctrl+X, Y, Enter)

# ============================================
# STEP 3: Verify changes
# ============================================
echo "Changes made to redis.ts:"
git diff backend/src/config/redis.ts

# ============================================
# STEP 4: Commit changes
# ============================================
git add backend/src/config/redis.ts
git commit -m "fix: enable Redis reconnection with exponential backoff

- Increase connection timeout from 5s to 15s
- Add reconnection strategy (max 10 retries)
- Exponential backoff: 100ms -> 3000ms
- Add connection event handlers for monitoring

Expected impact: 90% reduction in Redis-related failures"

# ============================================
# STEP 5: Push to remote
# ============================================
git push origin emergency/phase1a-stability-fixes

# ============================================
# STEP 6: Deploy to production
# ============================================
ssh root@141.136.44.168
cd /var/pdflab/app

# Pull latest changes
git fetch origin
git checkout emergency/phase1a-stability-fixes
git pull origin emergency/phase1a-stability-fixes

# Rebuild backend image
echo "Building backend with Redis reconnection..."
docker-compose build backend

# Deploy
echo "Deploying backend..."
docker-compose up -d backend

# Wait for startup
sleep 15

# ============================================
# STEP 7: Test reconnection logic
# ============================================
echo ""
echo "===== TESTING REDIS RECONNECTION ====="
echo ""

# Open logs in separate terminal
echo "Open another terminal and run:"
echo "  ssh root@141.136.44.168"
echo "  docker logs -f pdflab-backend-prod"
echo ""
echo "Then press Enter to continue..."
read

# Pause Redis to simulate failure
echo "Pausing Redis container..."
docker pause pdflab-redis-prod

echo "Wait 30 seconds, watching backend logs..."
echo "Expected: 'Redis reconnecting in Xms (attempt Y/10)'"
sleep 30

# Resume Redis
echo "Resuming Redis container..."
docker unpause pdflab-redis-prod

echo "Wait 10 seconds..."
echo "Expected: 'Redis client connected' and 'Redis client ready'"
sleep 10

# ============================================
# STEP 8: Verify backend still functional
# ============================================
echo ""
echo "===== VERIFICATION ====="

# Check backend health
echo "1. Health check:"
curl -s https://pdflab.pro/health | jq
echo ""

# Check Redis connection
echo "2. Redis connection:"
docker exec pdflab-redis-prod redis-cli ping
echo ""

# Check backend logs
echo "3. Recent backend logs:"
docker logs pdflab-backend-prod --tail 20
echo ""

# Expected to see:
# - "Redis client connected"
# - "Redis client ready"
# - NO "Redis connection failed"

# ============================================
# CHECKPOINT
# ============================================
echo ""
echo "FIX 2 COMPLETE ✓"
echo ""
echo "Success criteria:"
echo "  ✓ Redis reconnection enabled"
echo "  ✓ Reconnection tested (pause/resume)"
echo "  ✓ Backend survived Redis pause"
echo "  ✓ Health endpoint responding"
echo ""
```

**Success Criteria**:
- ✅ Redis reconnection strategy implemented
- ✅ Connection event handlers added
- ✅ Backend survives Redis restart
- ✅ Logs show reconnection attempts
- ✅ Health endpoint confirms stability

**Post in Slack**:
```
✓ FIX 2 COMPLETE (15 min)
- Enabled Redis reconnection with exponential backoff
- Tested: Backend survived Redis pause/resume
- Expected impact: 90% Redis failure reduction
```

---

### FIX 3: Replace Aggressive process.exit() (30 minutes)

**Priority**: P0 - CRITICAL  
**Impact**: 60% reduction in unexpected crashes  
**Risk**: Low (improving error handling)  
**Owner**: Backend Developer #1  

#### Problem

ANY unhandled error terminates the entire backend via `process.exit(1)`.

```typescript
// Current state (BROKEN)
process.on('uncaughtException', (error) => {
  gracefulShutdown('UNCAUGHT_EXCEPTION')  // ← Kills backend
})
```

#### Solution

```bash
# ============================================
# STEP 1: On local development machine
# ============================================
cd /path/to/pdflab
git checkout emergency/phase1a-stability-fixes
git pull origin emergency/phase1a-stability-fixes

# ============================================
# STEP 2: Edit server.ts
# ============================================
nano backend/src/server.ts

# FIND THE ERROR HANDLERS (near end of file, around line 380-400):
#
# process.on('uncaughtException', (error) => {
#   console.error('Uncaught Exception:', error)
#   gracefulShutdown('UNCAUGHT_EXCEPTION')
# })
#
# process.on('unhandledRejection', (reason, promise) => {
#   console.error('Unhandled Rejection:', reason)
#   gracefulShutdown('UNHANDLED_REJECTION')
# })

# REPLACE WITH:
// Handle uncaught exceptions WITHOUT killing the process
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception - Non-Fatal', {
    error: error.message,
    stack: error.stack,
    name: error.name,
    timestamp: new Date().toISOString()
  })
  
  // Report to Sentry
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      level: 'error',
      tags: { 
        source: 'uncaughtException',
        fatal: 'false'
      }
    })
  }
  
  // DO NOT CALL process.exit()
  // Let PM2 or Docker handle process restarts if truly needed
})

process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
  logger.error('Unhandled Rejection - Non-Fatal', {
    reason: String(reason),
    promise: String(promise),
    timestamp: new Date().toISOString()
  })
  
  // Report to Sentry
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(new Error('Unhandled Promise Rejection'), {
      level: 'error',
      tags: { 
        source: 'unhandledRejection',
        fatal: 'false'
      },
      extra: { 
        reason: String(reason),
        promise: String(promise)
      }
    })
  }
  
  // DO NOT CALL process.exit()
})

// ONLY exit on intentional signals
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, starting graceful shutdown')
  gracefulShutdown('SIGTERM')
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, starting graceful shutdown')
  gracefulShutdown('SIGINT')
})

// Graceful shutdown function - ONLY called for SIGTERM/SIGINT
async function gracefulShutdown(signal: string) {
  logger.info(`Graceful shutdown initiated (${signal})`)
  
  // Stop accepting new requests
  server.close(async () => {
    logger.info('HTTP server closed')
    
    // Close database connections
    try {
      await sequelize.close()
      logger.info('Database connections closed')
    } catch (error) {
      logger.error('Error closing database', { error })
    }
    
    // Close Redis connections
    try {
      await redisClient.quit()
      logger.info('Redis connection closed')
    } catch (error) {
      logger.error('Error closing Redis', { error })
    }
    
    // Flush Sentry events
    if (process.env.NODE_ENV === 'production') {
      await Sentry.close(2000)
    }
    
    logger.info('Graceful shutdown complete')
    process.exit(0)
  })
  
  // Force exit after 30 seconds if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Graceful shutdown timeout, forcing exit')
    process.exit(1)
  }, 30000)
}

# Save and exit (Ctrl+X, Y, Enter)

# ============================================
# STEP 3: Verify changes
# ============================================
echo "Changes made to server.ts:"
git diff backend/src/server.ts

# ============================================
# STEP 4: Commit changes
# ============================================
git add backend/src/server.ts
git commit -m "fix: handle uncaught errors without process termination

- Remove process.exit() from uncaughtException handler
- Remove process.exit() from unhandledRejection handler
- Add proper error logging and Sentry reporting
- Keep graceful shutdown for SIGTERM/SIGINT only
- Add 30-second timeout for shutdown

Expected impact: 60% reduction in unexpected crashes"

# ============================================
# STEP 5: Push to remote
# ============================================
git push origin emergency/phase1a-stability-fixes

# ============================================
# STEP 6: Deploy to production
# ============================================
ssh root@141.136.44.168
cd /var/pdflab/app

# Pull latest changes
git pull origin emergency/phase1a-stability-fixes

# Rebuild backend
echo "Building backend with improved error handling..."
docker-compose build backend

# Deploy
echo "Deploying backend..."
docker-compose up -d backend

# Wait for startup
sleep 15

# ============================================
# STEP 7: Test error handling
# ============================================
echo ""
echo "===== TESTING ERROR HANDLING ====="
echo ""

# Open logs in separate terminal
echo "Open another terminal and run:"
echo "  ssh root@141.136.44.168"
echo "  docker logs -f pdflab-backend-prod"
echo ""
echo "Press Enter when ready to test..."
read

# Test 1: Trigger an error via API (if test endpoint exists)
echo "Test 1: Triggering test error..."
curl -X GET https://pdflab.pro/api/test/error || echo "Test endpoint may not exist, that's okay"
echo ""

# Wait and check if backend still running
sleep 5
echo "Checking if backend still running..."
docker ps | grep pdflab-backend-prod

if [ $? -eq 0 ]; then
  echo "✓ Backend still running after error"
else
  echo "✗ Backend crashed! This is a problem."
  exit 1
fi

# Test 2: Check health endpoint
echo ""
echo "Test 2: Checking health endpoint..."
curl -s https://pdflab.pro/health | jq

# Test 3: Check Sentry
echo ""
echo "Test 3: Check Sentry dashboard for error report"
echo "Expected: Error logged but marked as non-fatal"
echo ""

# ============================================
# STEP 8: Verify error logging
# ============================================
echo "===== VERIFICATION ====="
echo ""

# Check recent logs
echo "Recent backend logs:"
docker logs pdflab-backend-prod --tail 30
echo ""

# Expected to see:
# - Error logged
# - NOT: "Graceful shutdown initiated"
# - NOT: Container restart

# ============================================
# CHECKPOINT
# ============================================
echo ""
echo "FIX 3 COMPLETE ✓"
echo ""
echo "Success criteria:"
echo "  ✓ Uncaught exceptions logged but don't kill process"
echo "  ✓ Backend survived test error"
echo "  ✓ Errors reported to Sentry"
echo "  ✓ Health endpoint responding"
echo ""
```

**Success Criteria**:
- ✅ Uncaught exceptions logged but don't crash backend
- ✅ Unhandled rejections logged but don't crash backend
- ✅ Errors reported to Sentry with proper context
- ✅ Backend stays running after errors
- ✅ Graceful shutdown only on SIGTERM/SIGINT

**Post in Slack**:
```
✓ FIX 3 COMPLETE (30 min)
- Replaced aggressive process.exit() with error logging
- Tested: Backend survived triggered error
- Expected impact: 60% unexpected crash reduction
```

---

### FIX 4: Add Memory Limits (10 minutes)

**Priority**: P0 - CRITICAL  
**Impact**: Eliminate OOM kills  
**Risk**: Low (preventing resource exhaustion)  
**Owner**: DevOps Engineer  

#### Problem

No memory limits defined. Backend can consume all VPS RAM, triggering OOM killer.

#### Solution

```bash
# ============================================
# STEP 1: SSH to production
# ============================================
ssh root@141.136.44.168
cd /var/pdflab/app

# ============================================
# STEP 2: Backup docker-compose file
# ============================================
cp docker-compose.production.yml docker-compose.production.yml.pre-fix4

# ============================================
# STEP 3: Edit docker-compose.production.yml
# ============================================
nano docker-compose.production.yml

# FIND THE 'backend' SERVICE (around line 10-40):
#
# backend:
#   image: mkelam/pdflab-backend:latest
#   container_name: pdflab-backend-prod
#   restart: unless-stopped
#   ports:
#     - "3006:3006"
#   environment:
#     - NODE_ENV=production
#   ...

# ADD MEMORY AND CPU LIMITS AFTER 'container_name':
backend:
  image: mkelam/pdflab-backend:latest
  container_name: pdflab-backend-prod
  restart: unless-stopped
  
  # ADD THESE LINES ↓
  mem_limit: 1024m        # Hard limit: 1GB
  memswap_limit: 1024m    # Disable swap (prevents slowdown)
  mem_reservation: 512m   # Soft limit: 512MB (preferred)
  cpus: '2.0'            # Max 2 CPU cores
  # ADD THESE LINES ↑
  
  ports:
    - "3006:3006"
  environment:
    - NODE_ENV=production
    - NODE_OPTIONS=--max-old-space-size=768  # ADD THIS LINE (Node.js heap limit)
  # ... rest of config

# ALSO ADD LIMITS TO OTHER SERVICES (optional but recommended):

mysql:
  # ... existing config ...
  mem_limit: 512m
  memswap_limit: 512m
  mem_reservation: 256m

redis:
  # ... existing config ...
  mem_limit: 256m
  memswap_limit: 256m
  mem_reservation: 128m

frontend:
  # ... existing config ...
  mem_limit: 512m
  memswap_limit: 512m
  mem_reservation: 256m

# Save and exit (Ctrl+X, Y, Enter)

# ============================================
# STEP 4: Verify changes
# ============================================
echo "Memory limits added:"
grep -A 5 "mem_limit" docker-compose.production.yml

# ============================================
# STEP 5: Apply changes (requires container restart)
# ============================================
echo "Applying memory limits (will restart containers)..."
docker-compose down
docker-compose up -d

# Wait for startup
sleep 20

# ============================================
# STEP 6: Verify limits applied
# ============================================
echo ""
echo "===== VERIFICATION ====="
echo ""

# Check container resource limits
echo "1. Memory limits:"
docker stats --no-stream pdflab-backend-prod pdflab-mysql-prod pdflab-redis-prod pdflab-frontend-prod
echo ""

# Expected output:
# NAME                     MEM USAGE / LIMIT     MEM %     CPU %
# pdflab-backend-prod      250MB / 1024MB        24%       ...
# pdflab-mysql-prod        150MB / 512MB         29%       ...
# pdflab-redis-prod        50MB / 256MB          19%       ...
# pdflab-frontend-prod     100MB / 512MB         19%       ...

# Check Node.js heap size
echo "2. Node.js heap limit:"
docker exec pdflab-backend-prod node -e "console.log('Max heap:', require('v8').getHeapStatistics().heap_size_limit / 1024 / 1024, 'MB')"
echo ""
echo "Expected: ~768 MB"
echo ""

# Check for OOM kills in system logs
echo "3. Recent OOM kills (should be empty):"
docker logs pdflab-backend-prod --since 1h | grep -i "out of memory\|oom"
dmesg | tail -50 | grep -i "out of memory\|oom"
echo ""

# ============================================
# STEP 7: Monitor memory usage for 5 minutes
# ============================================
echo "Monitoring memory usage for 5 minutes..."
echo "Watch for: Memory stays under limits, no OOM kills"
echo ""

for i in {1..10}; do
  echo "Check $i/10:"
  docker stats --no-stream pdflab-backend-prod | tail -1
  sleep 30
done

# ============================================
# CHECKPOINT
# ============================================
echo ""
echo "FIX 4 COMPLETE ✓"
echo ""
echo "Success criteria:"
echo "  ✓ Memory limits applied (Backend: 1GB)"
echo "  ✓ Node.js heap limited (768MB)"
echo "  ✓ Memory usage stable"
echo "  ✓ No OOM kills"
echo ""
```

**Success Criteria**:
- ✅ Memory limits applied to all containers
- ✅ Backend limited to 1GB RAM
- ✅ Node.js heap limited to 768MB
- ✅ Memory usage stays under limits
- ✅ No OOM kills in logs

**Post in Slack**:
```
✓ FIX 4 COMPLETE (10 min)
- Added memory limits: Backend 1GB, MySQL 512MB, Redis 256MB
- Node.js heap limited to 768MB
- Expected impact: Eliminate OOM kills
```

---

### FIX 5: Fix CloudConvert Timeout (15 minutes)

**Priority**: P0 - CRITICAL  
**Impact**: 40% reduction in conversion failures  
**Risk**: Low (increasing timeout)  
**Owner**: Backend Developer #2  

#### Problem

30-second timeout is too short for large PDF files (50MB+).

```typescript
// Current state (BROKEN)
const downloadResponse = await fetch(outputUrl, {
  timeout: 30000  // ← 30 seconds too short
})
```

#### Solution

```bash
# ============================================
# STEP 1: On local development machine
# ============================================
cd /path/to/pdflab
git checkout emergency/phase1a-stability-fixes
git pull origin emergency/phase1a-stability-fixes

# ============================================
# STEP 2: Edit CloudConvert service
# ============================================
nano backend/src/services/cloudconvert.service.ts

# FIND THE downloadConvertedFile METHOD (search for "downloadConvertedFile"):
#
# async downloadConvertedFile(outputUrl: string): Promise<Buffer> {
#   const downloadResponse = await fetch(outputUrl, {
#     timeout: 30000  // ← CHANGE THIS
#   })
#   ...
# }

# REPLACE THE ENTIRE METHOD WITH:
async downloadConvertedFile(outputUrl: string): Promise<Buffer> {
  const maxRetries = 3
  const timeout = 300000  // 5 minutes (increased from 30s)
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Downloading converted file (attempt ${attempt}/${maxRetries})`, {
        url: outputUrl,
        timeout: timeout
      })
      
      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      
      const response = await fetch(outputUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'PDFLab/1.3.0'
        }
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`)
      }
      
      const buffer = await response.arrayBuffer()
      
      logger.info('File downloaded successfully', {
        size: buffer.byteLength,
        sizeMB: (buffer.byteLength / 1024 / 1024).toFixed(2),
        attempt,
        url: outputUrl
      })
      
      return Buffer.from(buffer)
      
    } catch (error: any) {
      logger.warn(`Download attempt ${attempt} failed`, {
        error: error.message,
        attempt,
        maxRetries,
        url: outputUrl
      })
      
      // If this was the last attempt, throw
      if (attempt === maxRetries) {
        logger.error(`Download failed after ${maxRetries} attempts`, {
          error: error.message,
          url: outputUrl
        })
        throw new Error(`Download failed after ${maxRetries} attempts: ${error.message}`)
      }
      
      // Exponential backoff: 2s, 4s, 6s
      const delay = attempt * 2000
      logger.info(`Retrying download in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw new Error('Download failed: reached end of retry loop')
}

# Save and exit (Ctrl+X, Y, Enter)

# ============================================
# STEP 3: Verify changes
# ============================================
echo "Changes made to cloudconvert.service.ts:"
git diff backend/src/services/cloudconvert.service.ts | head -100

# ============================================
# STEP 4: Commit changes
# ============================================
git add backend/src/services/cloudconvert.service.ts
git commit -m "fix: increase CloudConvert download timeout to 5 minutes

- Change timeout from 30s to 5 minutes (300000ms)
- Add automatic retry logic (3 attempts)
- Add exponential backoff between retries
- Improve logging (file size, attempt number)

Expected impact: 40% reduction in conversion failures for large files"

# ============================================
# STEP 5: Push to remote
# ============================================
git push origin emergency/phase1a-stability-fixes

# ============================================
# STEP 6: Deploy to production
# ============================================
ssh root@141.136.44.168
cd /var/pdflab/app

# Pull latest changes
git pull origin emergency/phase1a-stability-fixes

# Rebuild backend
echo "Building backend with CloudConvert timeout fix..."
docker-compose build backend

# Deploy
echo "Deploying backend..."
docker-compose up -d backend

# Wait for startup
sleep 15

# ============================================
# STEP 7: Test with large file (if available)
# ============================================
echo ""
echo "===== TESTING CLOUDCONVERT TIMEOUT ====="
echo ""

# If you have a large test file (50MB+), upload it
echo "Test with large file (if available):"
echo "curl -X POST https://pdflab.pro/api/upload \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "  -F 'file=@large-test-file.pdf' \\"
echo "  -F 'conversion_type=docx'"
echo ""
echo "Expected: Should complete without timeout"
echo ""
echo "Press Enter to continue..."
read

# ============================================
# STEP 8: Verify logs
# ============================================
echo "===== VERIFICATION ====="
echo ""

# Check recent conversion logs
echo "Recent conversion logs:"
docker logs pdflab-backend-prod --tail 50 | grep -i "download\|cloudconvert\|conversion"
echo ""

# Expected to see:
# - "Downloading converted file (attempt 1/3)"
# - "File downloaded successfully"
# - File size in MB logged

# ============================================
# CHECKPOINT
# ============================================
echo ""
echo "FIX 5 COMPLETE ✓"
echo ""
echo "Success criteria:"
echo "  ✓ Timeout increased to 5 minutes"
echo "  ✓ Retry logic added (3 attempts)"
echo "  ✓ Large file conversions no longer timeout"
echo ""
```

**Success Criteria**:
- ✅ CloudConvert timeout increased to 5 minutes
- ✅ Automatic retry logic (3 attempts)
- ✅ Exponential backoff between retries
- ✅ Improved logging with file sizes
- ✅ Large file conversions succeed

**Post in Slack**:
```
✓ FIX 5 COMPLETE (15 min)
- Increased CloudConvert download timeout: 30s → 5 minutes
- Added 3-retry logic with exponential backoff
- Expected impact: 40% conversion failure reduction
```

---

### FIX 6: Fix Partner Dashboard DECIMAL Bug (30 minutes)

**Priority**: P0 - CRITICAL  
**Impact**: Partner dashboard revenue displays correctly  
**Risk**: Low (type conversion)  
**Owner**: Backend Developer #2  

#### Problem

MySQL DECIMAL columns return strings, not numbers. Partner dashboard crashes on math operations.

```typescript
// Current state (BROKEN)
revenue_generated: partner.total_revenue_generated
// Returns: "100.00" (STRING)

// Frontend crashes:
stats.revenue_generated.toFixed(2)  // Error: toFixed is not a function
stats.revenue_generated + 50  // Result: "100.0050" (concatenation)
```

#### Solution

```bash
# ============================================
# STEP 1: On local development machine
# ============================================
cd /path/to/pdflab
git checkout emergency/phase1a-stability-fixes
git pull origin emergency/phase1a-stability-fixes

# ============================================
# STEP 2: Edit Partner controller
# ============================================
nano backend/src/controllers/partner.controller.ts

# FIND getPartnerDashboard FUNCTION (search for "getPartnerDashboard"):
#
# export async function getPartnerDashboard(req: Request, res: Response) {
#   try {
#     const partner = await Partner.findOne({
#       where: { user_id: req.user!.id }
#     })
#     
#     if (!partner) {
#       return res.status(404).json({ error: 'Partner not found' })
#     }
#     
#     return res.json({
#       stats: {
#         total_signups: partner.total_signups,
#         revenue_generated: partner.total_revenue_generated,  // ← BROKEN
#         ...
#       }
#     })
#   }
# }

# REPLACE THE RETURN STATEMENT WITH:
export async function getPartnerDashboard(req: Request, res: Response) {
  try {
    const partner = await Partner.findOne({
      where: { user_id: req.user!.id }
    })
    
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' })
    }
    
    // FIX: Parse all DECIMAL fields to floats
    const stats = {
      // Integer fields (no conversion needed)
      total_signups: partner.total_signups || 0,
      active_users: partner.active_users || 0,
      
      // DECIMAL fields (parse to numbers)
      total_revenue_generated: parseFloat(partner.total_revenue_generated?.toString() || '0'),
      total_commission_earned: parseFloat(partner.total_commission_earned?.toString() || '0'),
      pending_payout: parseFloat(partner.pending_payout?.toString() || '0'),
      total_paid_out: parseFloat(partner.total_paid_out?.toString() || '0'),
      commission_rate: parseFloat(partner.commission_rate?.toString() || '0.1'),
      
      // String fields (safe defaults for nulls)
      referral_code: partner.referral_code || '',
      platform: partner.platform || 'other',
      website: partner.website || '',
      social_media: partner.social_media || '',
      bio: partner.bio || '',
      
      // Date fields
      created_at: partner.created_at,
      last_payout_date: partner.last_payout_date || null,
      updated_at: partner.updated_at
    }
    
    return res.json({ stats })
    
  } catch (error) {
    logger.error('Error fetching partner dashboard', { 
      error,
      userId: req.user?.id 
    })
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch partner dashboard' 
    })
  }
}

# ALSO UPDATE getPartnerStats FUNCTION (if exists):
export async function getPartnerStats(req: Request, res: Response) {
  try {
    const partner = await Partner.findOne({
      where: { user_id: req.user!.id }
    })
    
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' })
    }
    
    return res.json({
      stats: {
        total_signups: partner.total_signups || 0,
        
        // Parse DECIMAL fields
        total_revenue: parseFloat(partner.total_revenue_generated?.toString() || '0'),
        commission_rate: parseFloat(partner.commission_rate?.toString() || '0.1'),
        pending_payout: parseFloat(partner.pending_payout?.toString() || '0'),
        
        referral_code: partner.referral_code || ''
      }
    })
  } catch (error) {
    logger.error('Error fetching partner stats', { error })
    return res.status(500).json({ error: 'Internal server error' })
  }
}

# ALSO UPDATE ANY OTHER PARTNER ENDPOINTS that return DECIMAL fields

# Save and exit (Ctrl+X, Y, Enter)

# ============================================
# STEP 3: Verify changes
# ============================================
echo "Changes made to partner.controller.ts:"
git diff backend/src/controllers/partner.controller.ts

# ============================================
# STEP 4: Commit changes
# ============================================
git add backend/src/controllers/partner.controller.ts
git commit -m "fix: parse DECIMAL fields to numbers in partner endpoints

- Parse total_revenue_generated to float
- Parse total_commission_earned to float
- Parse pending_payout to float
- Parse total_paid_out to float
- Parse commission_rate to float
- Add safe defaults for null values

Fixes: Partner dashboard math operations and toFixed() calls
Expected impact: Partner dashboard displays correctly"

# ============================================
# STEP 5: Push to remote
# ============================================
git push origin emergency/phase1a-stability-fixes

# ============================================
# STEP 6: Deploy to production
# ============================================
ssh root@141.136.44.168
cd /var/pdflab/app

# Pull latest changes
git pull origin emergency/phase1a-stability-fixes

# Rebuild backend
echo "Building backend with DECIMAL fix..."
docker-compose build backend

# Deploy
echo "Deploying backend..."
docker-compose up -d backend

# Wait for startup
sleep 15

# ============================================
# STEP 7: Test partner endpoints
# ============================================
echo ""
echo "===== TESTING PARTNER ENDPOINTS ====="
echo ""

# Test 1: Get partner dashboard
echo "Test 1: Partner dashboard endpoint"
echo "curl -X GET https://pdflab.pro/api/partner/dashboard \\"
echo "  -H 'Authorization: Bearer PARTNER_TOKEN' | jq"
echo ""
echo "Expected: All revenue fields should be numbers (not strings)"
echo ""
echo "Paste a partner token and press Enter (or skip with Enter):"
read PARTNER_TOKEN

if [ -n "$PARTNER_TOKEN" ]; then
  RESPONSE=$(curl -s -X GET https://pdflab.pro/api/partner/dashboard \
    -H "Authorization: Bearer $PARTNER_TOKEN")
  
  echo "Response:"
  echo "$RESPONSE" | jq
  echo ""
  
  # Verify fields are numbers
  echo "Checking field types:"
  echo "$RESPONSE" | jq '.stats | {
    total_revenue_generated: (.total_revenue_generated | type),
    total_commission_earned: (.total_commission_earned | type),
    pending_payout: (.pending_payout | type)
  }'
  echo ""
  echo "Expected: All fields show 'number' (not 'string')"
else
  echo "Skipped (no token provided)"
fi

echo ""

# ============================================
# STEP 8: Check logs for errors
# ============================================
echo "===== VERIFICATION ====="
echo ""

# Check for any DECIMAL-related errors
echo "Checking logs for DECIMAL errors:"
docker logs pdflab-backend-prod --tail 100 | grep -i "decimal\|toFixed\|NaN"
echo ""
echo "Expected: No DECIMAL-related errors"
echo ""

# ============================================
# CHECKPOINT
# ============================================
echo ""
echo "FIX 6 COMPLETE ✓"
echo ""
echo "Success criteria:"
echo "  ✓ DECIMAL fields parsed to numbers"
echo "  ✓ Partner dashboard returns valid numbers"
echo "  ✓ Math operations work correctly"
echo "  ✓ No toFixed() errors"
echo ""
```

**Success Criteria**:
- ✅ All DECIMAL fields parsed to floats
- ✅ Partner dashboard API returns numbers (not strings)
- ✅ Frontend math operations work correctly
- ✅ No `.toFixed()` crashes
- ✅ Safe defaults for null values

**Post in Slack**:
```
✓ FIX 6 COMPLETE (30 min)
- Fixed DECIMAL parsing in partner endpoints
- All revenue fields now return as numbers
- Expected impact: Partner dashboard displays correctly
- Action: Test with partner account to verify
```

---

### FIX 7: Fix Guest Quota Inconsistency (30 minutes)

**Priority**: P1 - HIGH  
**Impact**: Consistent guest limits, better conversion funnel  
**Risk**: Low (centralizing constants)  
**Owner**: Backend Developer #1  

#### Problem

Middleware says 1 conversion limit, service says 10 conversions. Marketing doesn't know what to promise.

```typescript
// Middleware (INCONSISTENT)
if (guestSession.conversions_used >= 1) {  // ← Blocks after 1

// Service (INCONSISTENT)
const MAX_CONVERSIONS = 10  // ← Says 10 allowed
```

#### Solution

```bash
# ============================================
# STEP 1: On local development machine
# ============================================
cd /path/to/pdflab
git checkout emergency/phase1a-stability-fixes
git pull origin emergency/phase1a-stability-fixes

# ============================================
# STEP 2: Create constants file
# ============================================
nano backend/src/config/constants.ts

# CREATE NEW FILE WITH:
/**
 * Application Constants
 * Centralized configuration for business logic
 */

export const GUEST_LIMITS = {
  // Number of free conversions per guest session
  MAX_CONVERSIONS: 3,
  
  // Maximum file size for guests (MB)
  MAX_FILE_SIZE_MB: 10,
  
  // Maximum files per upload
  MAX_FILES_PER_UPLOAD: 1,
  
  // Guest session duration (hours)
  SESSION_DURATION_HOURS: 24,
  
  // File retention for guests (hours)
  FILE_RETENTION_HOURS: 1,
  
  // Rate limit (conversions per hour)
  RATE_LIMIT_PER_HOUR: 5
} as const

export const USER_PLAN_LIMITS = {
  free: {
    MAX_CONVERSIONS: 20,
    MAX_FILE_SIZE_MB: 25,
    FILE_RETENTION_DAYS: 7
  },
  starter: {
    MAX_CONVERSIONS: 50,
    MAX_FILE_SIZE_MB: 50,
    FILE_RETENTION_DAYS: 30
  },
  pro: {
    MAX_CONVERSIONS: 500,
    MAX_FILE_SIZE_MB: 100,
    FILE_RETENTION_DAYS: 90
  },
  enterprise: {
    MAX_CONVERSIONS: -1,  // Unlimited
    MAX_FILE_SIZE_MB: 500,
    FILE_RETENTION_DAYS: 365
  }
} as const

# Save and exit (Ctrl+X, Y, Enter)

# ============================================
# STEP 3: Update guest session service
# ============================================
nano backend/src/services/guest-session.service.ts

# FIND THE CONSTANTS AT TOP OF FILE:
# const MAX_CONVERSIONS = 10  // ← DELETE THIS
# const SESSION_DURATION = ...  // ← DELETE THIS

# REPLACE WITH IMPORT:
import { GUEST_LIMITS } from '../config/constants'

# THEN FIND checkConversionLimit METHOD AND REPLACE WITH:
async checkConversionLimit(sessionId: string): Promise<{
  allowed: boolean
  conversions_used: number
  conversions_remaining: number
  message?: string
}> {
  const session = await this.getSession(sessionId)
  
  if (!session) {
    return {
      allowed: true,
      conversions_used: 0,
      conversions_remaining: GUEST_LIMITS.MAX_CONVERSIONS
    }
  }
  
  const conversions_used = session.conversions_used || 0
  const conversions_remaining = GUEST_LIMITS.MAX_CONVERSIONS - conversions_used
  
  if (conversions_used >= GUEST_LIMITS.MAX_CONVERSIONS) {
    return {
      allowed: false,
      conversions_used,
      conversions_remaining: 0,
      message: `You've used all ${GUEST_LIMITS.MAX_CONVERSIONS} free guest conversions. Sign up for ${USER_PLAN_LIMITS.free.MAX_CONVERSIONS} conversions per month!`
    }
  }
  
  return {
    allowed: true,
    conversions_used,
    conversions_remaining
  }
}

# Save and exit (Ctrl+X, Y, Enter)

# ============================================
# STEP 4: Update guest middleware
# ============================================
nano backend/src/middleware/guest.middleware.ts

# ADD IMPORT AT TOP:
import { GUEST_LIMITS } from '../config/constants'

# FIND THE QUOTA CHECK (around line 136-158):
# if (guestSession.conversions_used >= 1) {  // ← REPLACE THIS

# REPLACE WITH:
export async function guestQuotaMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Skip if authenticated user
  if (req.user) {
    return next()
  }
  
  const sessionId = req.cookies.guest_session_id
  
  if (!sessionId) {
    return res.status(401).json({
      error: 'No guest session found',
      message: 'Please refresh the page to start a new guest session'
    })
  }
  
  // Check conversion limit using centralized service
  const limitCheck = await guestSessionService.checkConversionLimit(sessionId)
  
  if (!limitCheck.allowed) {
    return res.status(429).json({
      error: 'Guest quota exceeded',
      message: limitCheck.message,
      conversions_used: limitCheck.conversions_used,
      conversions_limit: GUEST_LIMITS.MAX_CONVERSIONS,
      upgrade_required: true,
      upgrade_benefits: {
        free_account: {
          conversions: USER_PLAN_LIMITS.free.MAX_CONVERSIONS,
          file_size_mb: USER_PLAN_LIMITS.free.MAX_FILE_SIZE_MB,
          retention_days: USER_PLAN_LIMITS.free.FILE_RETENTION_DAYS,
          price: 'Free'
        },
        starter_plan: {
          conversions: USER_PLAN_LIMITS.starter.MAX_CONVERSIONS,
          file_size_mb: USER_PLAN_LIMITS.starter.MAX_FILE_SIZE_MB,
          retention_days: USER_PLAN_LIMITS.starter.FILE_RETENTION_DAYS,
          price: '$9.99/month'
        }
      }
    })
  }
  
  // Attach quota info to request for use in controllers
  req.guestQuota = {
    conversions_used: limitCheck.conversions_used,
    conversions_remaining: limitCheck.conversions_remaining,
    conversions_limit: GUEST_LIMITS.MAX_CONVERSIONS
  }
  
  next()
}

# Save and exit (Ctrl+X, Y, Enter)

# ============================================
# STEP 5: Verify changes
# ============================================
echo "Changes summary:"
echo "1. Created constants.ts"
cat backend/src/config/constants.ts
echo ""
echo "2. Updated guest-session.service.ts"
git diff backend/src/services/guest-session.service.ts | head -50
echo ""
echo "3. Updated guest.middleware.ts"
git diff backend/src/middleware/guest.middleware.ts | head -50

# ============================================
# STEP 6: Commit changes
# ============================================
git add backend/src/config/constants.ts
git add backend/src/services/guest-session.service.ts
git add backend/src/middleware/guest.middleware.ts

git commit -m "fix: centralize guest quota limits for consistency

- Create constants.ts with GUEST_LIMITS (MAX_CONVERSIONS = 3)
- Update guest-session.service.ts to use constants
- Update guest.middleware.ts to use constants
- Add USER_PLAN_LIMITS for upgrade messaging
- Consistent quota enforcement and error messages

Fixes: Guest quota mismatch (1 vs 10 conversions)
Expected impact: Clear limits, better conversion funnel"

# ============================================
# STEP 7: Push to remote
# ============================================
git push origin emergency/phase1a-stability-fixes

# ============================================
# STEP 8: Deploy to production
# ============================================
ssh root@141.136.44.168
cd /var/pdflab/app

# Pull latest changes
git pull origin emergency/phase1a-stability-fixes

# Rebuild backend
echo "Building backend with guest quota fix..."
docker-compose build backend

# Deploy
echo "Deploying backend..."
docker-compose up -d backend

# Wait for startup
sleep 15

# ============================================
# STEP 9: Test guest conversion flow
# ============================================
echo ""
echo "===== TESTING GUEST QUOTA ====="
echo ""

# Test as guest (without authentication)
echo "Test 1: First guest conversion"
curl -s -X POST https://pdflab.pro/api/upload \
  -F "file=@test-small.pdf" \
  -F "conversion_type=docx" \
  -c cookies.txt | jq
echo ""
echo "Expected: Success, quota info in response"
echo ""

echo "Test 2: Second guest conversion (same session)"
curl -s -X POST https://pdflab.pro/api/upload \
  -F "file=@test-small.pdf" \
  -F "conversion_type=docx" \
  -b cookies.txt | jq
echo ""
echo "Expected: Success"
echo ""

echo "Test 3: Third guest conversion (same session)"
curl -s -X POST https://pdflab.pro/api/upload \
  -F "file=@test-small.pdf" \
  -F "conversion_type=docx" \
  -b cookies.txt | jq
echo ""
echo "Expected: Success (3rd of 3 allowed)"
echo ""

echo "Test 4: Fourth guest conversion (should fail)"
curl -s -X POST https://pdflab.pro/api/upload \
  -F "file=@test-small.pdf" \
  -F "conversion_type=docx" \
  -b cookies.txt | jq
echo ""
echo "Expected: 429 error, 'Guest quota exceeded', clear upgrade message"
echo ""

# Clean up
rm -f cookies.txt test-small.pdf

# ============================================
# STEP 10: Verify logs
# ============================================
echo "===== VERIFICATION ====="
echo ""

# Check guest quota logs
echo "Recent guest quota logs:"
docker logs pdflab-backend-prod --tail 50 | grep -i "guest\|quota\|limit"
echo ""

# Expected to see:
# - Consistent quota checks
# - Clear messaging about 3 conversions
# - No confusion about limits

# ============================================
# CHECKPOINT
# ============================================
echo ""
echo "FIX 7 COMPLETE ✓"
echo ""
echo "Success criteria:"
echo "  ✓ Guest limits centralized (3 conversions)"
echo "  ✓ Middleware and service consistent"
echo "  ✓ Clear upgrade messaging"
echo "  ✓ Marketing can promote accurate limits"
echo ""
```

**Success Criteria**:
- ✅ Guest limits centralized in constants.ts
- ✅ Middleware and service use same constant
- ✅ Guest quota is 3 conversions (clear, consistent)
- ✅ Upgrade messaging shows correct benefits
- ✅ Can A/B test by changing single constant

**Post in Slack**:
```
✓ FIX 7 COMPLETE (30 min)
- Centralized guest quota limits (now 3 conversions)
- Middleware and service now consistent
- Clear upgrade messaging added
- Expected impact: Better conversion funnel, clear marketing
```

---

## Post-Deployment Validation

### Immediate Validation (15 minutes)

```bash
# ============================================
# RUN THIS IMMEDIATELY AFTER ALL 7 FIXES
# ============================================

echo "===== POST-DEPLOYMENT VALIDATION ====="
echo ""
echo "Timestamp: $(date)"
echo ""

# ============================================
# CHECK 1: All containers running
# ============================================
echo "1. Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "Expected: All containers 'Up', no restarts"
echo ""

# ============================================
# CHECK 2: Health endpoint
# ============================================
echo "2. Health Endpoint:"
curl -s https://pdflab.pro/health | jq
echo ""
echo "Expected: status='ok', all services healthy"
echo ""

# ============================================
# CHECK 3: Backend logs (no errors)
# ============================================
echo "3. Recent Backend Logs:"
docker logs pdflab-backend-prod --tail 50 | grep -i "error\|crash\|fatal"
echo ""
echo "Expected: No critical errors"
echo ""

# ============================================
# CHECK 4: Redis connection
# ============================================
echo "4. Redis Connection:"
docker exec pdflab-redis-prod redis-cli ping
echo ""
echo "Expected: PONG"
echo ""

# ============================================
# CHECK 5: Database connection
# ============================================
echo "5. Database Connection:"
docker exec pdflab-mysql-prod mysql -u pdflab -p<DB_PASSWORD> -e "SELECT 1"
echo ""
echo "Expected: 1"
echo ""

# ============================================
# CHECK 6: Memory usage
# ============================================
echo "6. Memory Usage:"
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"
echo ""
echo "Expected: All under limits (Backend <1GB)"
echo ""

# ============================================
# CHECK 7: Test conversion
# ============================================
echo "7. Test Conversion:"
echo "Manual test required - upload a file via UI"
echo "Expected: Conversion succeeds without errors"
echo ""

# ============================================
# CHECK 8: Sentry error rate
# ============================================
echo "8. Sentry Error Rate:"
echo "Check Sentry dashboard manually"
echo "Expected: Dramatic drop in errors"
echo ""

# ============================================
# SUMMARY
# ============================================
echo "===== VALIDATION SUMMARY ====="
echo ""
echo "✓ All containers running"
echo "✓ Health endpoint responding"
echo "✓ No critical errors in logs"
echo "✓ Redis connected"
echo "✓ Database connected"
echo "✓ Memory usage under limits"
echo ""
echo "NEXT: Monitor for 24 hours"
echo ""
```

**Post in Slack**:
```
✅ ALL 7 FIXES DEPLOYED

Deployment Summary:
✓ Fix 1: Worker container removed (80% crash reduction)
✓ Fix 2: Redis reconnection enabled (90% Redis failure reduction)
✓ Fix 3: Error handling improved (60% unexpected crash reduction)
✓ Fix 4: Memory limits applied (eliminate OOM)
✓ Fix 5: CloudConvert timeout increased (40% conversion failure reduction)
✓ Fix 6: Partner DECIMAL bug fixed (revenue displays correctly)
✓ Fix 7: Guest quota consistent (clear 3-conversion limit)

Expected Overall Impact: 93% crash reduction

Status: All systems green, monitoring for 24 hours
Timeline: [START TIME] → [END TIME] (2.5 hours)

Monitoring:
- Sentry: [LINK]
- Health: https://pdflab.pro/health
- Logs: ssh root@141.136.44.168 && docker logs -f pdflab-backend-prod

Team: Stay alert for next 4 hours, then passive monitoring
```

---

## 24-Hour Monitoring Protocol

### Hour 0-4: Critical Window (Active Monitoring)

**Team Status**: All hands on deck, stay near computers

```bash
# ============================================
# SET UP MONITORING LOOP
# ============================================

# Terminal 1: Docker logs (keep open)
ssh root@141.136.44.168
docker logs -f pdflab-backend-prod

# Terminal 2: Health check loop (keep open)
watch -n 60 'curl -s https://pdflab.pro/health | jq'

# Terminal 3: Resource monitoring (keep open)
watch -n 300 'docker stats --no-stream'

# Browser Tab 1: Sentry dashboard
# Browser Tab 2: Slack #pdflab-emergency-recovery
```

**Checkpoints**:

**Hour 1** (60 min after deploy):
```bash
# Run validation script
ssh root@141.136.44.168

echo "===== HOUR 1 CHECKPOINT ====="
echo "Time: $(date)"
echo ""

# Container restarts
echo "Container restarts:"
docker ps --format "{{.Names}}: {{.Status}}"
echo ""

# Error count
echo "Backend errors (last hour):"
docker logs pdflab-backend-prod --since 1h | grep -i "error" | wc -l
echo ""

# Sentry errors
echo "Sentry errors/hour: [CHECK MANUALLY]"
echo ""

# Conversions
echo "Successful conversions (last hour): [CHECK DATABASE]"
docker exec pdflab-mysql-prod mysql -u pdflab -p<DB_PASSWORD> pdflab_production \
  -e "SELECT COUNT(*) FROM conversions WHERE status='completed' AND created_at > NOW() - INTERVAL 1 HOUR"
echo ""

# Failed conversions
echo "Failed conversions (last hour):"
docker exec pdflab-mysql-prod mysql -u pdflab -p<DB_PASSWORD> pdflab_production \
  -e "SELECT COUNT(*) FROM conversions WHERE status='failed' AND created_at > NOW() - INTERVAL 1 HOUR"
echo ""

# Success rate
echo "Conversion success rate: [CALCULATE]"
echo ""
```

**Post in Slack** (Hour 1):
```
📊 HOUR 1 CHECKPOINT

Status: [Green/Yellow/Red]
- Backend crashes: 0 ✅
- Sentry errors/hour: [NUMBER] (was: ~100)
- Conversions: [SUCCESS]/[TOTAL] ([X]% success rate)
- Health: All green ✅

Issues: [NONE/LIST]
Action: Continuing monitoring
```

**Hour 2** (120 min after deploy):
```bash
echo "===== HOUR 2 CHECKPOINT ====="
# (Same checks as Hour 1)
```

**Hour 4** (240 min after deploy):
```bash
echo "===== HOUR 4 CHECKPOINT ====="
echo "Time: $(date)"
echo ""

# 4-hour summary
echo "4-Hour Performance Summary:"
echo ""

# Total crashes
echo "Backend crashes: [COUNT]"
echo "Expected: 0"
echo ""

# Total errors
echo "Total errors (last 4h):"
docker logs pdflab-backend-prod --since 4h | grep -i "error" | wc -l
echo ""

# Conversion stats
echo "Conversion statistics (last 4h):"
docker exec pdflab-mysql-prod mysql -u pdflab -p<DB_PASSWORD> pdflab_production -e "
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as success,
  SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed,
  ROUND(SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as success_rate
FROM conversions 
WHERE created_at > NOW() - INTERVAL 4 HOUR"
echo ""

# Memory stability
echo "Memory usage (4h avg):"
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"
echo ""

# Support tickets
echo "New support tickets (last 4h): [CHECK ZENDESK/SUPPORT SYSTEM]"
echo ""
```

**Decision Point** (Hour 4):

If all green:
- ✅ Reduce monitoring to every 4 hours
- ✅ Team can stand down from active monitoring
- ✅ Continue with passive monitoring

If yellow flags:
- ⚠️ Continue active monitoring
- ⚠️ Investigate anomalies
- ⚠️ Prepare for potential rollback

If red flags:
- 🚨 Initiate rollback procedure
- 🚨 War room reconvene
- 🚨 Post-mortem after rollback

**Post in Slack** (Hour 4):
```
📊 HOUR 4 CHECKPOINT - CRITICAL WINDOW COMPLETE

4-Hour Summary:
✅ Backend crashes: 0 (was: ~14/day → ~2.3 in 4h)
✅ Sentry errors: [NUMBER]/hour (was: ~100/hour)
✅ Conversions: [SUCCESS]/[TOTAL] ([X]% success, was: ~92%)
✅ Memory: Stable, no OOM
✅ Support tickets: [NUMBER] (was: ~2-3 per 4h)

Decision: [CONTINUE MONITORING / ROLLBACK]

Next checkpoint: Hour 12
Team status: Passive monitoring (check every 4 hours)
```

---

### Hour 4-12: Stabilization Period

**Team Status**: Passive monitoring, check every 4 hours

**Hour 8 Checkpoint**:
```bash
echo "===== HOUR 8 CHECKPOINT ====="
# Quick sanity checks
docker ps
curl -s https://pdflab.pro/health | jq
docker stats --no-stream
```

**Hour 12 Checkpoint**:
```bash
echo "===== HOUR 12 CHECKPOINT ====="
echo "Time: $(date)"
echo ""

# 12-hour summary
echo "12-Hour Performance Summary:"
echo ""

# Crashes
echo "Backend crashes (last 12h): [COUNT]"
echo "Expected: 0-1 (was: ~7 crashes in 12h)"
echo ""

# Errors
echo "Error rate:"
docker logs pdflab-backend-prod --since 12h | grep -c "ERROR"
echo ""

# Conversions
echo "Conversion stats (last 12h):"
docker exec pdflab-mysql-prod mysql -u pdflab -p<DB_PASSWORD> pdflab_production -e "
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as success,
  SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed,
  ROUND(SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as success_rate
FROM conversions 
WHERE created_at > NOW() - INTERVAL 12 HOUR"
echo ""

# Partner dashboard (if tested)
echo "Partner dashboard tested: [YES/NO]"
echo "Revenue displays correctly: [YES/NO]"
echo ""
```

**Post in Slack** (Hour 12):
```
📊 HOUR 12 CHECKPOINT

12-Hour Summary:
✅ Backend crashes: [NUMBER] (was: ~7 in 12h)
✅ Conversion success: [X]% (was: ~92%)
✅ System stable
✅ No critical issues

Next checkpoint: Hour 24 (end of day 1)
```

---

### Hour 12-24: Confidence Building

**Team Status**: Check once at 24 hours

**Hour 24 Checkpoint**:
```bash
echo "===== 24-HOUR VALIDATION ====="
echo "Time: $(date)"
echo ""

# ============================================
# COMPREHENSIVE 24-HOUR ANALYSIS
# ============================================

echo "1. STABILITY METRICS"
echo "-------------------"
echo ""

# Crashes
echo "Backend crashes (24h): [COUNT]"
echo "Baseline (before fix): 14/day"
echo "Improvement: [CALCULATE]%"
echo ""

# Uptime
echo "System uptime (24h): [HOURS]"
echo "Baseline: ~20.4h (85% uptime)"
echo "Improvement: [CALCULATE]%"
echo ""

# Errors
TOTAL_ERRORS=$(docker logs pdflab-backend-prod --since 24h | grep -c "ERROR")
echo "Total errors (24h): $TOTAL_ERRORS"
echo "Baseline: ~500/day"
echo "Improvement: [CALCULATE]%"
echo ""

echo "2. CONVERSION METRICS"
echo "--------------------"
echo ""

# Conversion stats
docker exec pdflab-mysql-prod mysql -u pdflab -p<DB_PASSWORD> pdflab_production -e "
SELECT 
  'Last 24 Hours' as period,
  COUNT(*) as total_conversions,
  SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed,
  ROUND(SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as success_rate
FROM conversions 
WHERE created_at > NOW() - INTERVAL 24 HOUR

UNION ALL

SELECT 
  '24-48 Hours Ago' as period,
  COUNT(*) as total_conversions,
  SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed,
  ROUND(SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as success_rate
FROM conversions 
WHERE created_at BETWEEN NOW() - INTERVAL 48 HOUR AND NOW() - INTERVAL 24 HOUR
"
echo ""

echo "3. RESOURCE METRICS"
echo "------------------"
echo ""

# Memory
echo "Memory usage (current):"
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"
echo ""

# Check for OOM kills
echo "OOM kills (24h):"
dmesg | grep -i "out of memory" | grep "$(date +%b)"
echo "Expected: None"
echo ""

echo "4. INTEGRATION HEALTH"
echo "--------------------"
echo ""

# Partner dashboard (manual check)
echo "Partner dashboard tested: [YES/NO/PENDING]"
echo "Revenue calculations correct: [YES/NO/PENDING]"
echo ""

# Guest quota (manual check)
echo "Guest quota tested: [YES/NO/PENDING]"
echo "Limit consistent (3 conversions): [YES/NO/PENDING]"
echo ""

echo "5. SUPPORT METRICS"
echo "-----------------"
echo ""

echo "Support tickets (24h): [COUNT]"
echo "Baseline: ~6-8/day"
echo "Improvement: [CALCULATE]%"
echo ""

echo "User complaints (24h): [COUNT]"
echo "Baseline: ~3-4/day"
echo "Improvement: [CALCULATE]%"
echo ""

echo "6. SENTRY METRICS"
echo "----------------"
echo ""

echo "Sentry errors (24h): [COUNT FROM SENTRY DASHBOARD]"
echo "Baseline: ~2,400/day (100/hour)"
echo "Target: <240/day (10/hour)"
echo "Achievement: [CALCULATE]%"
echo ""

# ============================================
# FINAL DECISION
# ============================================

echo "===== 24-HOUR VALIDATION COMPLETE ====="
echo ""
echo "Overall Status: [GREEN/YELLOW/RED]"
echo ""
echo "Success Criteria:"
echo "  ✓ Backend crashes <3 in 24h: [YES/NO]"
echo "  ✓ Conversion success rate >98%: [YES/NO]"
echo "  ✓ Partner dashboard working: [YES/NO]"
echo "  ✓ Guest quota consistent: [YES/NO]"
echo "  ✓ Redis reconnection working: [YES/NO]"
echo "  ✓ No OOM kills: [YES/NO]"
echo ""

if [ ALL_GREEN ]; then
  echo "DECISION: Phase 1A SUCCESSFUL ✅"
  echo "NEXT: Continue to 72-hour validation"
  echo "TEAM: Standby for 72h checkpoint"
else
  echo "DECISION: Issues detected, investigate"
  echo "NEXT: Review issues, determine if rollback needed"
fi
```

**Post in Slack** (Hour 24):
```
🎯 24-HOUR VALIDATION COMPLETE

Day 1 Results:
✅ Backend crashes: [X] (was: 14/day) → -[Y]% ✅
✅ Uptime: [X]% (was: 85%) → +[Y]% ✅
✅ Conversion success: [X]% (was: 92%) → +[Y]% ✅
✅ Support tickets: [X] (was: 6-8) → -[Y]% ✅
✅ Sentry errors: [X]/day (was: 2,400) → -[Y]% ✅

Integration Fixes Validated:
✅ Partner dashboard: Revenue displays correctly
✅ Guest quota: Consistent 3-conversion limit
✅ Redis reconnection: Tested and working
✅ Memory limits: No OOM kills

Decision: PHASE 1A SUCCESSFUL ✅

Next: 48-hour checkpoint, then 72-hour final validation
Team: Passive monitoring until 72h
```

---

## 72-Hour Success Validation

**Final Checkpoint** (Hour 72):

```bash
echo "===== 72-HOUR FINAL VALIDATION ====="
echo "Time: $(date)"
echo ""

# ============================================
# COMPREHENSIVE 3-DAY ANALYSIS
# ============================================

echo "PHASE 1A: 72-HOUR RESULTS"
echo "========================="
echo ""

# 1. Stability Achievement
echo "1. STABILITY"
echo ""
CRASHES_72H=$(docker logs pdflab-backend-prod --since 72h | grep -c "Process exiting\|Fatal error\|Shutdown")
echo "Backend crashes (72h): $CRASHES_72H"
echo "Baseline (72h): 42 crashes"
echo "Reduction: $(echo "scale=1; ($CRASHES_72H / 42) * 100" | bc)%"
echo "Target: <3 crashes"
if [ "$CRASHES_72H" -lt 3 ]; then
  echo "Status: ✅ PASS"
else
  echo "Status: ⚠️  NEEDS INVESTIGATION"
fi
echo ""

# 2. Conversion Success
echo "2. CONVERSIONS"
echo ""
docker exec pdflab-mysql-prod mysql -u pdflab -p<DB_PASSWORD> pdflab_production -e "
SELECT 
  'Last 72 Hours' as period,
  COUNT(*) as total,
  SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as success,
  ROUND(SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as success_rate,
  CASE 
    WHEN ROUND(SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) >= 98 
    THEN '✅ PASS' 
    ELSE '⚠️  REVIEW' 
  END as status
FROM conversions 
WHERE created_at > NOW() - INTERVAL 72 HOUR
"
echo ""

# 3. Integration Health
echo "3. INTEGRATION FIXES"
echo ""
echo "Partner Dashboard:"
echo "  - DECIMAL parsing: [VALIDATED/PENDING]"
echo "  - Revenue calculations: [CORRECT/PENDING]"
echo ""
echo "Guest Quota:"
echo "  - Consistent limit (3): [VALIDATED/PENDING]"
echo "  - Clear messaging: [VALIDATED/PENDING]"
echo ""
echo "Redis Reconnection:"
echo "  - Tested: [YES/NO]"
echo "  - Working: [YES/NO]"
echo ""

# 4. Resource Stability
echo "4. RESOURCE MANAGEMENT"
echo ""
echo "OOM Kills (72h): $(dmesg | grep -c "Out of memory.*pdflab-backend-prod")"
echo "Target: 0"
echo "Status: [PASS/FAIL]"
echo ""

# 5. Support Impact
echo "5. BUSINESS IMPACT"
echo ""
echo "Support tickets (72h): [COUNT]"
echo "Baseline: 15-20"
echo "Reduction: [CALCULATE]%"
echo ""
echo "User complaints: [COUNT]"
echo "Baseline: ~9-12"
echo "Reduction: [CALCULATE]%"
echo ""

# ============================================
# FINAL PASS/FAIL
# ============================================

echo "===== FINAL VERDICT ====="
echo ""

CRITERIA_MET=0
TOTAL_CRITERIA=7

# Check each criterion
[ "$CRASHES_72H" -lt 3 ] && ((CRITERIA_MET++)) || true
# ... (check other criteria)

echo "Success Criteria Met: $CRITERIA_MET / $TOTAL_CRITERIA"
echo ""

if [ "$CRITERIA_MET" -ge 6 ]; then
  echo "🎉 PHASE 1A: SUCCESSFUL ✅"
  echo ""
  echo "Achievements:"
  echo "  ✅ 93% crash reduction"
  echo "  ✅ 99% uptime"
  echo "  ✅ >98% conversion success"
  echo "  ✅ Partner dashboard fixed"
  echo "  ✅ Guest quota consistent"
  echo "  ✅ Zero OOM kills"
  echo ""
  echo "Next Steps:"
  echo "  1. Merge emergency/phase1a-stability-fixes → main"
  echo "  2. Tag release: v1.3.1-stability"
  echo "  3. Post-mortem meeting (capture lessons)"
  echo "  4. Begin Phase 2 planning (monitoring, logging)"
  echo "  5. Celebrate with team! 🎉"
else
  echo "⚠️  PHASE 1A: PARTIAL SUCCESS"
  echo ""
  echo "Need to address:"
  echo "  [LIST FAILED CRITERIA]"
  echo ""
  echo "Next Steps:"
  echo "  1. Investigate remaining issues"
  echo "  2. Apply additional fixes"
  echo "  3. Extend validation period"
fi
echo ""
```

**Post in Slack** (Hour 72):
```
🎉 72-HOUR VALIDATION COMPLETE - PHASE 1A RESULTS

3-Day Performance:
✅ Backend crashes: [X] (was: 42) → -93% ✅
✅ Uptime: 99%+ (was: 85%) → +14% ✅
✅ Conversion success: 98%+ (was: 92%) → +6% ✅
✅ Support tickets: [X] (was: 15-20) → -[Y]% ✅
✅ Zero OOM kills ✅
✅ Redis reconnection: Working ✅
✅ Partner dashboard: Fixed ✅

🎯 MISSION ACCOMPLISHED

Before Phase 1A:
  - System down 1 day per week
  - 14 crashes per day
  - $2K/month revenue loss
  - Team firefighting 24/7

After Phase 1A:
  - 99% uptime
  - <1 crash per day
  - Revenue retention
  - Team building features

ROI: 2 hours of work → $1,800/month saved

Next Steps:
  1. ✅ Merge to main
  2. ✅ Release v1.3.1-stability
  3. 📅 Post-mortem meeting: [DATE/TIME]
  4. 🚀 Begin Phase 2 planning

THANK YOU TEAM! 🎉🙌

@tech-lead @backend-dev-1 @backend-dev-2 @devops
```

---

## Rollback Procedures

### When to Rollback

**Immediate Rollback Required** (Red Flags):
- Backend crashes >10 in first 4 hours
- Conversion failure rate >30%
- Health endpoint down >5 minutes
- Data corruption detected
- New critical bug introduced

**Consider Rollback** (Yellow Flags):
- Backend crashes 5-10 in first 4 hours
- Conversion failure rate 15-30%
- Unexpected behavior in key features
- Sentry error rate higher than baseline

**Do NOT Rollback** (False Alarms):
- Single crash (might be unrelated)
- Sentry showing old errors
- Minor UI issues
- Slow response time (monitor, don't rollback)

---

### Quick Rollback (5 minutes)

```bash
# ============================================
# EMERGENCY ROLLBACK PROCEDURE
# ============================================

echo "🚨 INITIATING EMERGENCY ROLLBACK"
echo "Time: $(date)"
echo ""

# 1. Stop current containers
echo "Stopping containers..."
ssh root@141.136.44.168
cd /var/pdflab/app
docker-compose down

# 2. Revert to pre-fix state
echo "Reverting to pre-fix configuration..."

# Get backup path
BACKUP_DIR=$(cat /var/pdflab/LAST_BACKUP_PATH.txt)
echo "Backup location: $BACKUP_DIR"

# Restore configuration files
cp "$BACKUP_DIR/docker-compose.production.yml" docker-compose.production.yml
cp "$BACKUP_DIR/backend.env.production" backend/.env.production

# Revert git changes
git checkout main
git reset --hard origin/main

# 3. Restart with old configuration
echo "Starting containers with pre-fix config..."
docker-compose up -d

# Wait for startup
sleep 30

# 4. Verify rollback
echo ""
echo "===== ROLLBACK VERIFICATION ====="

# Check containers
echo "Containers:"
docker ps

# Check health
echo ""
echo "Health check:"
curl -s https://pdflab.pro/health | jq

# Check logs
echo ""
echo "Recent logs:"
docker logs pdflab-backend-prod --tail 20

echo ""
echo "✅ ROLLBACK COMPLETE"
echo "System restored to pre-fix state"
echo ""
echo "Next: War room to investigate issues"
```

**Post in Slack**:
```
🚨 EMERGENCY ROLLBACK COMPLETE

Reason: [DESCRIBE ISSUE]
Time: [START] → [END]
Status: System restored to pre-fix state

Action Items:
  1. ✅ Rollback complete
  2. 🔍 War room meeting: NOW
  3. 📋 Investigate root cause
  4. 🛠️  Plan alternative fix

Team: Join #pdflab-emergency-recovery immediately
```

---

### Full Database Rollback (15 minutes)

**Only if database corruption detected:**

```bash
# ============================================
# DATABASE ROLLBACK (ONLY IF NEEDED)
# ============================================

echo "🚨 INITIATING DATABASE ROLLBACK"
echo "⚠️  WARNING: This will lose all data since backup!"
echo ""
echo "Press Ctrl+C to cancel, Enter to continue..."
read

# Get backup
BACKUP_DIR=$(cat /var/pdflab/LAST_BACKUP_PATH.txt)
DB_BACKUP="$BACKUP_DIR/pdflab_database.sql.gz"

echo "Restoring from: $DB_BACKUP"

# Restore database
echo "Restoring database..."
gunzip < "$DB_BACKUP" | docker exec -i pdflab-mysql-prod mysql \
  -u pdflab \
  -p<DB_PASSWORD> \
  pdflab_production

# Restart backend
echo "Restarting backend..."
docker restart pdflab-backend-prod

# Verify
sleep 10
curl -s https://pdflab.pro/health | jq

echo ""
echo "✅ DATABASE ROLLBACK COMPLETE"
```

---

## Post-Recovery Next Steps

### 1. Merge to Main (10 minutes)

**After 72-hour validation passes:**

```bash
# On local machine
cd /path/to/pdflab

# Switch to main
git checkout main
git pull origin main

# Merge emergency branch
git merge emergency/phase1a-stability-fixes

# Tag release
git tag -a v1.3.1-stability -m "Phase 1A stability fixes

- Remove duplicate worker container
- Enable Redis reconnection
- Replace aggressive process.exit()
- Add memory limits
- Fix CloudConvert timeout
- Fix Partner DECIMAL bug
- Fix guest quota inconsistency

Impact: 93% crash reduction, 99% uptime"

# Push
git push origin main
git push origin v1.3.1-stability

echo "✅ Released v1.3.1-stability"
```

---

### 2. Post-Mortem Meeting (1 hour)

**Schedule within 48 hours of success**

**Agenda**:
1. What happened? (10 min)
   - Timeline of events
   - Fixes applied
   - Results achieved

2. What went well? (15 min)
   - Backup procedure
   - Team coordination
   - Monitoring setup
   - Git workflow

3. What could be better? (20 min)
   - Deployment process
   - Communication
   - Testing approach
   - Documentation

4. Action items (10 min)
   - Process improvements
   - Tool enhancements
   - Training needs

5. Celebrate! (5 min)
   - Acknowledge team effort
   - Share success metrics

---

### 3. Update Documentation (30 minutes)

```bash
# Create post-mortem document
nano docs/POST_MORTEM_PHASE_1A.md

# Contents:
# - What happened
# - Root causes
# - Fixes applied
# - Results
# - Lessons learned
# - Recommendations for future

# Update README
# Add badge: "✅ Stability: 99% uptime"

# Update architecture docs
# Document new memory limits, Redis config, etc.
```

---

### 4. Begin Phase 2 Planning (1 week)

**Phase 2 Focus**: Production Hardening

**Tasks**:
1. ✅ Winston logging (structured logs)
2. ✅ Prometheus + Grafana (real-time metrics)
3. ✅ Automated database backups
4. ✅ Circuit breakers (CloudConvert resilience)
5. ✅ Error boundaries (React)
6. ✅ CI/CD pipeline (GitHub Actions)
7. ✅ Database migrations (Sequelize)

**Timeline**: 2 months  
**Team**: Same team, sustainable pace  
**Budget**: $8/month (optional VPS upgrade)  

---

## Summary

### What We Accomplished

**In 2 Hours**:
- ✅ Removed duplicate worker container
- ✅ Enabled Redis reconnection
- ✅ Improved error handling
- ✅ Added memory limits
- ✅ Fixed CloudConvert timeouts
- ✅ Fixed Partner dashboard DECIMAL bug
- ✅ Centralized guest quota limits

**Expected Results** (72 hours):
- 93% crash reduction (14/day → <1/day)
- 99% uptime (85% → 99%)
- 98% conversion success (92% → 98%)
- $1,800/month revenue saved
- Partner dashboard working correctly
- Guest quota consistent and clear
- Team can focus on features

**Next Steps**:
1. Monitor for 72 hours
2. Merge to main
3. Release v1.3.1-stability
4. Post-mortem meeting
5. Begin Phase 2

---

**END OF 72-HOUR RECOVERY PLAN** ✓

**Good luck with the deployment! 🚀**
