# SMTP Fix - Executive Summary & Action

**Time**: RIGHT NOW (5 minutes)
**BMAD Team**: Ready to Execute
**Status**: 🔴 CRITICAL - Blocking Production

---

## 🎯 What We Found

**Problem**: SMTP password is double-escaped in container: `Jesus24\\!7`
**Should Be**: `<SMTP_PASS>` (single backslash or no escape)
**Impact**: SMTP server receives wrong password → 535 authentication error

### Current Container Environment:
```
SMTP_USER=support@pdflab.pro
SMTP_PASS=Jesus24\\!7  ← DOUBLE BACKSLASH (WRONG)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
```

### What Hostinger Expects:
```
Password: <SMTP_PASS>  (with exclamation mark, no escaping)
```

---

## ✅ IMMEDIATE FIX (Option A): Stop Container, Fix Env, Restart

Since we can't easily change environment variables in a running container, we have 2 options:

1. **Recreate container with correct password** (5 minutes)
2. **Change password in Hostinger to avoid special characters** (10 minutes)

**RECOMMENDED: Option 1** (faster, less changes)

---

## 🚀 EXECUTING FIX NOW

### Step 1: Create fix script
```bash
cat > /tmp/fix-smtp.sh << 'EOF'
#!/bin/bash

echo "🔧 BMAD SMTP Fix - Starting..."
echo ""

# Stop current backend
echo "⏳ Stopping current backend..."
docker stop pdflab-backend-staging

# Start new backend with correct SMTP password (NO escaping)
echo "⏳ Starting backend with corrected SMTP password..."
docker run -d \
  --name pdflab-backend-staging-fixed \
  --restart unless-stopped \
  --network bridge \
  -p 3007:3006 \
  -e REDIS_PORT=6379 \
  -e PAYFAST_MERCHANT_KEY=<PAYFAST_MERCHANT_KEY> \
  -e PAYFAST_PASSPHRASE=<PAYFAST_PASSPHRASE> \
  -e FRONTEND_URL=https://pdflab.pro \
  -e DB_PASSWORD=StagingDB2024UserPass \
  -e SMTP_USER=support@pdflab.pro \
  -e SMTP_PASS='<SMTP_PASS>' \
  -e SMTP_FROM_EMAIL=support@pdflab.pro \
  -e GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID \
  -e PORT=3006 \
  -e DB_HOST=mysql-staging \
  -e REDIS_HOST=pdflab-redis-staging \
  -e PAYFAST_MODE=sandbox \
  -e PAYFAST_RETURN_URL=https://pdflab.pro/payment/success \
  -e CORS_ORIGIN=https://pdflab.pro,https://www.pdflab.pro,https://api.pdflab.pro,https://partners.pdflab.pro \
  -e SMTP_HOST=smtp.hostinger.com \
  -e SMTP_FROM_NAME=PDFLab \
  -e DB_PORT=3306 \
  -e SENTRY_DSN=https://b85f155a5ed6dcfd142531cd85749984@o4510337275789312.ingest.de.sentry.io/4510380844253264 \
  -e GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET \
  -e API_URL=https://pdflab.pro \
  -e PAYFAST_MERCHANT_ID=25263515 \
  -e TEST_SECRET=staging_test_secret_2024 \
  -e NODE_ENV=staging \
  -e DB_NAME=pdflab_staging \
  -e CLOUDCONVERT_API_KEY=<REDACTED> \
  -e CLOUDCONVERT_SANDBOX=false \
  -e PAYFAST_CANCEL_URL=https://pdflab.pro/payment/cancel \
  -e REDIS_PASSWORD= \
  -e JWT_SECRET=pT1o+3SCnI5t9xsnGpd1XNc0UKTO2hedd6tQRRHzXsS4PCjKXhbGODUEaYlVBEpPNw7vGU1tyM56uRzyUgOiew== \
  -e JWT_EXPIRATION=15m \
  -e SMTP_PORT=587 \
  -e DB_USER=pdflab_staging \
  -e JWT_REFRESH_EXPIRATION=30d \
  -e PAYFAST_ITN_URL=https://pdflab.pro/api/payfast/webhook \
  -e SMTP_SECURE=false \
  -e GOOGLE_CALLBACK_URL=https://pdflab.pro/api/auth/google/callback \
  pdflab-backend-staging:prod-snapshot

# Wait for container to start
echo "⏳ Waiting for container to start (30 seconds)..."
sleep 30

# Check health
echo "⏳ Checking health..."
HEALTH=$(curl -s http://localhost:3007/health)
echo "$HEALTH"

# Test SMTP
echo ""
echo "⏳ Testing SMTP with registration..."
TEST_RESPONSE=$(curl -s -X POST http://localhost:3007/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"smtp-fix-'$(date +%s)'@pdflab.com","password":"TestPass123!","name":"SMTP Fix Test"}')

echo "Response: $TEST_RESPONSE"

# Check logs
echo ""
echo "📋 Backend logs (last 20 lines with 'email'):"
docker logs --tail 50 pdflab-backend-staging-fixed 2>&1 | grep -i email

# If successful, swap containers
echo ""
read -p "✅ Does email log show 'Email sent successfully'? (y/n): " CONFIRM

if [ "$CONFIRM" = "y" ]; then
  echo "✅ Removing old container..."
  docker rm pdflab-backend-staging

  echo "✅ Renaming new container..."
  docker rename pdflab-backend-staging-fixed pdflab-backend-staging

  echo "✅ SMTP FIX COMPLETE!"
else
  echo "❌ Fix failed. Rolling back..."
  docker stop pdflab-backend-staging-fixed
  docker start pdflab-backend-staging
  docker rm pdflab-backend-staging-fixed
  echo "❌ Rolled back to original container"
fi

EOF

chmod +x /tmp/fix-smtp.sh
```

### Step 2: Execute fix script
```bash
ssh root@141.136.44.168 < /tmp/fix-smtp.sh
```

---

## 🎯 Expected Result

**Success looks like**:
```
✓ Email service initialized with SMTP: smtp.hostinger.com
✓ Email sent successfully to smtp-fix-*@pdflab.com
```

**Failure still shows**:
```
✗ Failed to send email: Error: Invalid login: 535 5.7.8 Error: authentication failed
```

---

## 🔄 If Still Fails: Plan B (Change Password in Hostinger)

**If password escaping is still an issue, simplify it**:

1. Login to Hostinger: https://hpanel.hostinger.com
2. Change password for support@pdflab.pro to: `PdfLabStagingEmail2025`
3. Update container with new simple password (no special chars)
4. Restart and test

---

**Created By**: 🏛️ BMAD Architect + 🔍 BMAD Drift Detective
**Status**: ⏳ READY TO EXECUTE
**ETA**: 5 minutes
