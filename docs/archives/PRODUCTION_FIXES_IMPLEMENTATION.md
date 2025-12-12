# 🚀 PDFLab Production Fixes Implementation Plan

## Implementation Priority Order

1. **Frontend Rebuild** (Critical - Affects all users)
2. **Email SMTP Configuration** (High - User notifications)
3. **MySQL Backup Strategy** (High - Data protection)
4. **Payment Flow E2E Test** (Medium - Validation)
5. **Automated Tests** (Medium - Long-term stability)

---

## 1. 🔧 Frontend Docker Rebuild with Production Environment

### The Issue
Frontend was built with `localhost:3006` baked into the JavaScript bundles. Need to rebuild with production URLs.

### Implementation Script

```bash
#!/bin/bash
# Save as: /tmp/rebuild-frontend-production.sh

echo "================================================"
echo "Rebuilding Frontend with Production Environment"
echo "================================================"

cd /var/pdflab

# Step 1: Create production Dockerfile
cat > Dockerfile.frontend.production << 'DOCKERFILE'
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy all source files
COPY . .

# Set production environment variables at build time
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=https://pdflab.pro

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=https://pdflab.pro

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
DOCKERFILE

echo "✅ Dockerfile created"

# Step 2: Build new image
echo "Building new frontend image..."
docker build -t mkelam/pdflab-frontend:production -f Dockerfile.frontend.production .

# Step 3: Tag as latest
docker tag mkelam/pdflab-frontend:production mkelam/pdflab-frontend:latest

# Step 4: Push to Docker Hub
echo "Pushing to Docker Hub..."
docker push mkelam/pdflab-frontend:production
docker push mkelam/pdflab-frontend:latest

# Step 5: Update running container
cd /var/pdflab/app
docker compose -f docker-compose.production.yml pull frontend
docker compose -f docker-compose.production.yml up -d frontend

echo "✅ Frontend rebuilt and deployed with production environment!"
```

---

## 2. 📧 Email SMTP Configuration

### Implementation Script

```bash
#!/bin/bash
# Save as: /tmp/configure-smtp.sh

echo "================================================"
echo "Configuring SMTP Email Service"
echo "================================================"

cd /var/pdflab/app

# Update backend environment with SMTP settings
cat >> backend/.env.production << 'ENV'

# Email Configuration (Hostinger SMTP)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=no-reply@pdflab.pro
SMTP_PASS=YourActualSMTPPassword
SMTP_FROM="PDFLab" <no-reply@pdflab.pro>
EMAIL_ENABLED=true
ENV

# Update docker-compose override
cat > docker-compose.override.yml << 'DOCKER'
version: '3.8'
services:
  frontend:
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://pdflab.pro
  backend:
    env_file:
      - ./backend/.env.production
    environment:
      - NODE_ENV=production
      - PAYFAST_MODE=production
      - PAYFAST_MERCHANT_ID=25263515
      - PAYFAST_MERCHANT_KEY=<PAYFAST_MERCHANT_KEY>
      - API_URL=https://pdflab.pro
      - FRONTEND_URL=https://pdflab.pro
      - CORS_ORIGIN=https://pdflab.pro,https://www.pdflab.pro
      - TRUST_PROXY=true
      - EMAIL_ENABLED=true
      - SMTP_HOST=smtp.hostinger.com
      - SMTP_PORT=587
      - SMTP_USER=no-reply@pdflab.pro
      - SMTP_FROM="PDFLab" <no-reply@pdflab.pro>
DOCKER

# Restart backend
docker compose -f docker-compose.production.yml -f docker-compose.override.yml up -d backend

echo "✅ SMTP configured! Update SMTP_PASS with actual password"
```

---

## 3. 💾 MySQL Backup Strategy

### Implementation Script

```bash
#!/bin/bash
# Save as: /tmp/setup-mysql-backups.sh

echo "================================================"
echo "Setting Up MySQL Backup Strategy"
echo "================================================"

# Create backup directory
mkdir -p /var/backups/mysql

# Create backup script
cat > /usr/local/bin/backup-mysql.sh << 'BACKUP'
#!/bin/bash

# Configuration
BACKUP_DIR="/var/backups/mysql"
CONTAINER="pdflab-mysql-prod"
DB_NAME="pdflab_production"
DB_USER="pdflab"
DB_PASS="<DB_PASSWORD>"
RETENTION_DAYS=7

# Create timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/pdflab_backup_$TIMESTAMP.sql.gz"

# Perform backup
echo "Starting backup at $(date)"
docker exec $CONTAINER mysqldump -u$DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_FILE

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "✅ Backup successful: $BACKUP_FILE"
    echo "Size: $(du -h $BACKUP_FILE | cut -f1)"

    # Remove old backups
    find $BACKUP_DIR -name "pdflab_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    echo "✅ Cleaned up backups older than $RETENTION_DAYS days"
else
    echo "❌ Backup failed!"
    exit 1
fi

# Upload to remote storage (optional)
# aws s3 cp $BACKUP_FILE s3://your-bucket/mysql-backups/
# or
# scp $BACKUP_FILE backup-server:/backups/

echo "Backup completed at $(date)"
BACKUP

chmod +x /usr/local/bin/backup-mysql.sh

# Set up cron job for daily backups at 2 AM
echo "0 2 * * * root /usr/local/bin/backup-mysql.sh >> /var/log/mysql-backup.log 2>&1" > /etc/cron.d/mysql-backup

# Run initial backup
/usr/local/bin/backup-mysql.sh

echo "✅ Backup strategy implemented!"
echo "- Daily backups at 2 AM"
echo "- 7-day retention"
echo "- Stored in /var/backups/mysql"
```

---

## 4. 🧪 Payment Flow End-to-End Test

### Implementation Script

```bash
#!/bin/bash
# Save as: /tmp/test-payment-flow.sh

echo "================================================"
echo "Payment Flow End-to-End Test"
echo "================================================"

# Test 1: API Availability
echo "Test 1: Checking API availability..."
response=$(curl -s -o /dev/null -w "%{http_code}" https://pdflab.pro/api/health)
if [ "$response" = "200" ]; then
    echo "✅ API is healthy"
else
    echo "❌ API not responding (HTTP $response)"
    exit 1
fi

# Test 2: Pricing Plans
echo "Test 2: Checking pricing plans..."
prices=$(curl -s https://pdflab.pro/api/payfast/plans)
if echo "$prices" | grep -q '"price":4.55'; then
    echo "✅ Pricing plans loading correctly"
else
    echo "❌ Pricing plans not loading"
    exit 1
fi

# Test 3: Payment Initialization
echo "Test 3: Testing payment initialization..."
cat > /tmp/test-payment.js << 'JS'
const https = require('https');

const data = JSON.stringify({
  plan: 'starter',
  email: 'test@pdflab.pro'
});

const options = {
  hostname: 'pdflab.pro',
  path: '/api/payfast/initialize',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    const response = JSON.parse(body);
    if (response.paymentData && response.paymentData.merchant_id === '25263515') {
      console.log('✅ Payment initialization working');
      console.log('   Merchant ID:', response.paymentData.merchant_id);
      console.log('   Amount:', response.paymentData.amount);
      console.log('   Return URL:', response.paymentData.return_url);
    } else {
      console.log('❌ Payment initialization failed');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error);
});

req.write(data);
req.end();
JS

docker exec pdflab-backend-prod node < /tmp/test-payment.js

# Test 4: Webhook endpoint
echo "Test 4: Checking webhook endpoint..."
webhook_response=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://pdflab.pro/api/payfast/webhook)
if [ "$webhook_response" = "400" ] || [ "$webhook_response" = "401" ]; then
    echo "✅ Webhook endpoint responding (expecting auth error)"
else
    echo "⚠️  Webhook returned unexpected status: $webhook_response"
fi

echo ""
echo "================================================"
echo "Payment Flow Test Complete"
echo "================================================"
echo ""
echo "Next: Manually test full payment at https://pdflab.pro/pricing"
```

---

## 5. 🧪 Automated Tests Setup

### Implementation Script

```bash
#!/bin/bash
# Save as: /tmp/setup-automated-tests.sh

echo "================================================"
echo "Setting Up Automated Tests"
echo "================================================"

cd /var/pdflab

# Create test directory
mkdir -p tests

# Create basic API test suite
cat > tests/api.test.js << 'TEST'
const https = require('https');
const assert = require('assert');

// Test configuration
const API_URL = 'https://pdflab.pro';

// Helper function for API requests
function apiRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'pdflab.pro',
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null });
      });
    }).on('error', reject).end();
  });
}

// Test Suite
async function runTests() {
  console.log('Running API Tests...\n');
  let passed = 0;
  let failed = 0;

  // Test 1: Health Check
  try {
    const res = await apiRequest('/api/health');
    assert.strictEqual(res.status, 200);
    console.log('✅ Test 1: Health check passed');
    passed++;
  } catch (e) {
    console.log('❌ Test 1: Health check failed:', e.message);
    failed++;
  }

  // Test 2: Pricing Plans
  try {
    const res = await apiRequest('/api/payfast/plans');
    assert.strictEqual(res.status, 200);
    assert(res.body.plans);
    assert(res.body.plans.length > 0);
    console.log('✅ Test 2: Pricing plans passed');
    passed++;
  } catch (e) {
    console.log('❌ Test 2: Pricing plans failed:', e.message);
    failed++;
  }

  // Test 3: Auth Endpoints
  try {
    const res = await apiRequest('/api/auth/profile');
    assert(res.status === 401 || res.status === 403);
    console.log('✅ Test 3: Auth protection working');
    passed++;
  } catch (e) {
    console.log('❌ Test 3: Auth protection failed:', e.message);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`Tests Passed: ${passed}`);
  console.log(`Tests Failed: ${failed}`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
TEST

# Create test runner script
cat > /usr/local/bin/run-tests.sh << 'RUNNER'
#!/bin/bash
echo "Running PDFLab Test Suite"
echo "========================="
docker exec pdflab-backend-prod node /app/tests/api.test.js
RUNNER

chmod +x /usr/local/bin/run-tests.sh

# Add to cron for daily test runs
echo "0 6 * * * root /usr/local/bin/run-tests.sh >> /var/log/pdflab-tests.log 2>&1" > /etc/cron.d/pdflab-tests

echo "✅ Automated tests configured!"
echo "Run tests manually with: /usr/local/bin/run-tests.sh"
```

---

## 📋 Implementation Order & Commands

Run these on your VPS in this order:

```bash
# 1. Frontend Rebuild (Most Critical)
bash /tmp/rebuild-frontend-production.sh

# 2. Email SMTP (Important for notifications)
bash /tmp/configure-smtp.sh
# Note: Edit the script first to add your SMTP password!

# 3. MySQL Backups (Data protection)
bash /tmp/setup-mysql-backups.sh

# 4. Payment Test (Validation)
bash /tmp/test-payment-flow.sh

# 5. Automated Tests (Long-term stability)
bash /tmp/setup-automated-tests.sh
```

## ⏱️ Estimated Time

- Frontend Rebuild: 10-15 minutes
- SMTP Configuration: 5 minutes
- Backup Setup: 5 minutes
- Payment Test: 2 minutes
- Automated Tests: 5 minutes

**Total: ~30 minutes**

## 🎯 Success Criteria

- [ ] Frontend loads without localhost references
- [ ] Email notifications working
- [ ] Daily backups running
- [ ] Payment flow test passes
- [ ] Automated tests scheduled

Once complete, your production deployment will be fully hardened and ready for scale!
