# SMTP Issue Resolution - Action Plan

**Date**: November 21, 2025
**BMAD Team**: 🏛️ Architect + 🔍 Drift Detective
**Status**: 🔴 CRITICAL FINDING - Requires Immediate Action

---

## 🔍 Root Cause Identified (BMAD Drift Detective)

### Problem Summary
The staging backend container is using SMTP credentials from a **baked-in .env file** inside the Docker image, NOT from an external .env file.

### Evidence
1. **Container is using**: `support@pdflab.pro` / `***REMOVED***`
2. **Host file shows**: `noreply@pdflab.pro` / `PDFLab@Email2024!`
3. **Container has**: No volume mounts (empty `"Mounts": []`)
4. **Conclusion**: .env is embedded in Docker image at build time

### Why This is Happening
When the staging Docker image was built (12 hours ago based on "Up 9 hours" status), it copied the .env file into the image. The container is using that old .env, not any external file.

---

## 🎯 Resolution Options

### Option 1: Rebuild Staging Image with Correct SMTP Creds (RECOMMENDED)

**Pros**:
- ✅ Permanent fix
- ✅ Proper Docker best practice
- ✅ Image can be versioned and deployed anywhere

**Cons**:
- ❌ Takes longer (15-20 minutes)
- ❌ Requires rebuilding and restarting containers

**Time**: 20 minutes
**Complexity**: Medium
**Risk**: Low (can rollback to current image)

---

### Option 2: Use Environment Variables Override (QUICK FIX)

**Pros**:
- ✅ Very fast (5 minutes)
- ✅ No rebuild needed
- ✅ Can test immediately

**Cons**:
- ❌ Not persistent (lost if container recreated)
- ❌ Not proper Docker practice
- ❌ Need to remember to rebuild image later

**Time**: 5 minutes
**Complexity**: Low
**Risk**: Medium (temporary fix, needs follow-up)

---

### Option 3: Mount External .env File (HYBRID)

**Pros**:
- ✅ Can change config without rebuild
- ✅ Easier to manage secrets
- ✅ Production-ready approach

**Cons**:
- ❌ Requires recreating container
- ❌ Need to create docker-compose or manual run command

**Time**: 10 minutes
**Complexity**: Medium
**Risk**: Low

---

## ✅ RECOMMENDED: Option 2 First, Then Option 1

**Strategy**: Quick fix now, proper fix later

### Phase 1: Quick Fix (Next 5 Minutes) - OPTION 2

**Step 1**: Stop staging backend container
```bash
ssh root@141.136.44.168
docker stop pdflab-backend-staging
```

**Step 2**: Start with environment variable override
```bash
docker run -d \
  --name pdflab-backend-staging-temp \
  --network host \
  -p 3007:3006 \
  -e SMTP_USER="support@pdflab.pro" \
  -e SMTP_PASS="Jesus24\!7" \
  -e SMTP_HOST="smtp.hostinger.com" \
  -e SMTP_PORT=587 \
  -e SMTP_SECURE=false \
  -e SMTP_FROM_EMAIL="support@pdflab.pro" \
  -e SMTP_FROM_NAME="PDFLab" \
  $(docker inspect pdflab-backend-staging --format='{{.Config.Image}}')
```

**Step 3**: Remove old container
```bash
docker rm pdflab-backend-staging
```

**Step 4**: Rename new container
```bash
docker rename pdflab-backend-staging-temp pdflab-backend-staging
```

**Step 5**: Wait for health check
```bash
sleep 30
curl -s http://141.136.44.168:3007/health | jq '.'
```

**Step 6**: Test email delivery
```bash
curl -X POST http://141.136.44.168:3007/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"smtp-quick-fix-'$(date +%s)'@pdflab.com","password":"TestPass123!","name":"SMTP Quick Fix Test"}'
```

**Step 7**: Check logs
```bash
docker logs --tail 30 pdflab-backend-staging | grep -i email
```

**Expected**: `✓ Email sent successfully to smtp-quick-fix-*@pdflab.com`

---

### Phase 2: Proper Fix (Later Today) - OPTION 1

**Why**: Need to rebuild image with correct credentials baked in OR use external config

**Decision Point**: Choose between:
1. **Rebuild image with corrected .env** (for immutable infrastructure)
2. **Use docker-compose with external .env** (for flexible config management)

**Recommendation**: Use docker-compose with external .env (better for staging)

---

## 🚀 EXECUTING QUICK FIX NOW

Let me execute Option 2 (quick fix) for you:

### Pre-Flight Checks
- [ ] Staging backend is running (verified: Up 9 hours)
- [ ] Current image identified: (need to check)
- [ ] Backup plan ready (can restart old container if needed)

### Execution Steps

**1. Get current image name**:
```bash
ssh root@141.136.44.168 "docker inspect pdflab-backend-staging --format='{{.Config.Image}}'"
```

**2. Get all environment variables from running container**:
```bash
ssh root@141.136.44.168 "docker inspect pdflab-backend-staging --format='{{json .Config.Env}}' | jq -r '.[]'"
```

**3. Stop current container**:
```bash
ssh root@141.136.44.168 "docker stop pdflab-backend-staging"
```

**4. Start new container with SMTP override**:
```bash
# Get original env vars
ORIGINAL_ENVS=$(ssh root@141.136.44.168 "docker inspect pdflab-backend-staging --format='{{json .Config.Env}}'")

# Start with SMTP overrides
ssh root@141.136.44.168 "
docker run -d \
  --name pdflab-backend-staging-new \
  --restart unless-stopped \
  -p 3007:3006 \
  -e SMTP_USER='support@pdflab.pro' \
  -e SMTP_PASS='***REMOVED***' \
  -e SMTP_HOST='smtp.hostinger.com' \
  -e SMTP_PORT=587 \
  -e SMTP_SECURE=false \
  -e SMTP_FROM_EMAIL='support@pdflab.pro' \
  -e SMTP_FROM_NAME='PDFLab' \
  pdflab-backend-staging:prod-snapshot
"
```

**5. Verify health**:
```bash
sleep 30
ssh root@141.136.44.168 "curl -s http://localhost:3007/health | jq '.'"
```

**6. Test SMTP**:
```bash
ssh root@141.136.44.168 "
curl -X POST http://localhost:3007/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{\"email\":\"smtp-test-$(date +%s)@pdflab.com\",\"password\":\"TestPass123!\",\"name\":\"SMTP Test\"}'
"
```

**7. Check logs**:
```bash
ssh root@141.136.44.168 "docker logs --tail 30 pdflab-backend-staging-new | grep -i email"
```

**8. If successful, swap containers**:
```bash
ssh root@141.136.44.168 "
docker rm pdflab-backend-staging
docker rename pdflab-backend-staging-new pdflab-backend-staging
"
```

---

## ⚠️ Potential Issue: Special Character in Password

The password `***REMOVED***` has an exclamation mark `!` which can cause issues in:
- Shell commands
- Docker environment variables
- SMTP authentication

### Alternative: Test with Escaped Password

Try both formats:

**Format 1**: Single quotes (recommended)
```bash
-e SMTP_PASS='***REMOVED***'
```

**Format 2**: Escape the exclamation mark
```bash
-e SMTP_PASS='Jesus24\!7'
```

**Format 3**: Double quotes with escape
```bash
-e SMTP_PASS="Jesus24\!7"
```

### If All Fail: Change Password in Hostinger

**Quick password change**:
1. Login to Hostinger: https://hpanel.hostinger.com
2. Navigate to: Emails > support@pdflab.pro
3. Change password to: `PdfLabSupport2025Staging` (no special characters)
4. Update staging container with new password

---

## 🧪 Verification Checklist

After applying fix:

- [ ] Backend container is running: `docker ps | grep pdflab-backend-staging`
- [ ] Health endpoint returns OK: `curl http://141.136.44.168:3007/health`
- [ ] Database check: `"database": "OK"`
- [ ] Redis check: `"redis": "OK"`
- [ ] Email check (after implementing): `"email": "OK"`
- [ ] Test registration sends email: No 535 errors in logs
- [ ] Test password reset sends email: No 535 errors in logs
- [ ] Backend logs show: `✓ Email sent successfully`

---

## 📊 Success Metrics

**SMTP Fix is Complete When**:
- ✅ 0 SMTP authentication errors (535) in logs
- ✅ 3 consecutive successful email deliveries
- ✅ Backend logs show `✓ Email sent successfully`
- ✅ All email tests (EMAIL-001, EMAIL-002, EMAIL-004) PASS
- ✅ Email delivery rate: 100% over 1 hour

---

## 🔄 Rollback Plan

**If Quick Fix Fails**:

```bash
# Stop new container
ssh root@141.136.44.168 "docker stop pdflab-backend-staging-new"

# Restart original container
ssh root@141.136.44.168 "docker start pdflab-backend-staging"

# Remove failed container
ssh root@141.136.44.168 "docker rm pdflab-backend-staging-new"

# Verify original is running
ssh root@141.136.44.168 "curl -s http://localhost:3007/health"
```

**Recovery Time**: 2 minutes

---

## 📝 Post-Fix Actions

**After SMTP Fix Verified**:

1. **Update Test Report**
   - Re-run EMAIL-001, EMAIL-002, EMAIL-004
   - Update STAGING_TEST_RESULTS_FINAL.md
   - Calculate new email test pass rate (target: 100%)

2. **Execute Conversion Tests**
   - CONVERT-001: PDF to DOCX
   - CONVERT-002: PDF Compression
   - CONVERT-003: PDF Merge

3. **Generate Final Report**
   - Calculate overall pass rate
   - Make GO/NO-GO decision
   - Schedule production deployment (if GO)

4. **Implement Proper Fix** (within 24 hours)
   - Create docker-compose.staging.yml with external .env
   - Or rebuild image with correct credentials
   - Document the change

---

## 🎯 Next Steps (Immediate)

**Right Now** (5 minutes):
1. Execute quick fix (Option 2)
2. Verify SMTP working
3. Test email delivery

**Today** (2 hours):
1. Re-test all email tests
2. Execute all conversion tests
3. Update final report

**Tomorrow** (1 hour):
1. Implement proper docker-compose setup
2. Document staging deployment process
3. Set up SMTP rotation policy

---

**Document Owner**: 🏛️ BMAD Architect + 🔍 BMAD Drift Detective
**Status**: ⏳ READY FOR EXECUTION
**Priority**: 🔴 P0 CRITICAL
**ETA**: 5 minutes for quick fix
