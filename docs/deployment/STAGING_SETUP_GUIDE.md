# Staging Environment Setup Guide

**Complete guide to setting up and using the PDFLab staging environment**

---

## 📋 Overview

The staging environment is a **complete replica of production** running on the same VPS with:
- Separate database (port 3307)
- Separate Redis (port 6380)
- Separate backend (port 3007)
- Separate frontend (port 3001)
- PayFast sandbox mode
- Test data and users

---

## 🎯 Why Staging?

✅ **Test in production-like environment** before going live
✅ **Run full test suite** without affecting production
✅ **Safe to break** - test destructive operations
✅ **Performance testing** without impacting users
✅ **QA testing** for new features

---

## 🚀 Quick Start

### 1. **Upload Files to VPS**

```bash
# From your local machine (Windows)
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Upload staging files
scp -r deployment/staging root@141.136.44.168:/tmp/
```

### 2. **SSH into VPS and Run Setup**

```bash
# SSH to server
ssh root@141.136.44.168

# Move files
mkdir -p /var/pdflab-staging
cp -r /tmp/staging/* /var/pdflab-staging/

# Run setup script
cd /var/pdflab-staging
chmod +x setup-staging.sh
bash setup-staging.sh
```

### 3. **Update Environment Variables**

```bash
# Edit staging environment file
nano /var/pdflab-staging/app/deployment/staging/.env.staging

# Required variables:
# - MYSQL_ROOT_PASSWORD
# - MYSQL_PASSWORD
# - JWT_SECRET (min 32 characters)
# - CLOUDCONVERT_API_KEY (from production)
# - PAYFAST credentials (sandbox mode)
```

### 4. **Restart Services**

```bash
cd /var/pdflab-staging/app/deployment/staging
docker-compose -f docker-compose.staging.yml restart
```

---

## 📦 Complete Setup (Step-by-Step)

### Step 1: Prepare Staging Files

On your local machine:

```bash
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Create staging deployment package
tar -czf staging-deployment.tar.gz deployment/staging
```

### Step 2: Upload to Server

```bash
# Upload package
scp staging-deployment.tar.gz root@141.136.44.168:/tmp/

# SSH to server
ssh root@141.136.44.168

# Extract
cd /var
mkdir -p pdflab-staging
cd pdflab-staging
tar -xzf /tmp/staging-deployment.tar.gz
mv deployment/staging/* .
```

### Step 3: Upload Application Code

From local machine:

```bash
# Sync entire application to staging
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    --exclude 'backend/node_modules' \
    --exclude 'backend/storage' \
    C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab/ \
    root@141.136.44.168:/var/pdflab-staging/app/
```

Or manually copy from production:

```bash
# On VPS
ssh root@141.136.44.168
cp -r /var/pdflab/app/* /var/pdflab-staging/app/
```

### Step 4: Configure Environment

```bash
# On VPS
cd /var/pdflab-staging/app/deployment/staging

# Copy example to actual env file
cp .env.staging.example .env.staging

# Edit with real values
nano .env.staging
```

**Required Environment Variables**:
```env
# Database
MYSQL_ROOT_PASSWORD=strong_random_password_here
MYSQL_PASSWORD=another_strong_password

# JWT
JWT_SECRET=minimum_32_character_random_string_here

# CloudConvert (same as production)
CLOUDCONVERT_API_KEY=your_actual_cloudconvert_key

# PayFast (SANDBOX mode for staging)
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=46f0cd694581a
PAYFAST_PASSPHRASE=staging_passphrase
PAYFAST_MODE=sandbox
```

### Step 5: Start Staging Environment

```bash
cd /var/pdflab-staging/app/deployment/staging

# Start all services
docker-compose -f docker-compose.staging.yml up -d

# Check logs
docker-compose -f docker-compose.staging.yml logs -f
```

### Step 6: Verify Services Running

```bash
# Check containers
docker ps | grep staging

# Expected output:
# pdflab-mysql-staging     (port 3307)
# pdflab-redis-staging     (port 6380)
# pdflab-backend-staging   (port 3007)
# pdflab-frontend-staging  (port 3001)

# Test backend health
curl http://localhost:3007/api/health

# Test frontend
curl http://localhost:3001
```

### Step 7: Setup Nginx (Optional - for domain access)

```bash
# Copy nginx config
cp /var/pdflab-staging/app/deployment/staging/nginx-staging.conf \
   /etc/nginx/sites-available/staging.pdflab.pro

# Enable site
ln -s /etc/nginx/sites-available/staging.pdflab.pro \
      /etc/nginx/sites-enabled/

# Test nginx config
nginx -t

# Reload nginx
systemctl reload nginx
```

**Update DNS**:
- Add A record: `staging.pdflab.pro` → `141.136.44.168`
- Wait for DNS propagation (5-30 minutes)

### Step 8: Setup SSL (Optional)

```bash
# Install certbot if not already installed
apt install certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d staging.pdflab.pro

# Auto-renewal is configured automatically
```

---

## 🔧 Daily Usage

### Deploy to Staging

From your local machine:

```bash
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Make deployment script executable (one-time)
chmod +x deployment/staging/deploy-to-staging.sh

# Deploy
bash deployment/staging/deploy-to-staging.sh
```

Or manually:

```bash
# Build locally
npm run build

# Sync to server
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    ./ root@141.136.44.168:/var/pdflab-staging/app/

# SSH and restart
ssh root@141.136.44.168
cd /var/pdflab-staging/app/deployment/staging
docker-compose -f docker-compose.staging.yml restart
```

### Run Tests Against Staging

From your local machine:

```bash
# Set staging URL
export API_URL=http://staging.pdflab.pro:3007

# Or if using domain:
export API_URL=https://staging.pdflab.pro

# Run all tests
npm run test:e2e
npm run test:integration
npm run test:accessibility

# Run performance tests
k6 run -e API_URL=http://staging.pdflab.pro:3007 tests/performance/load-test.js
```

### View Logs

```bash
# SSH to server
ssh root@141.136.44.168

cd /var/pdflab-staging/app/deployment/staging

# All logs
docker-compose -f docker-compose.staging.yml logs -f

# Specific service
docker-compose -f docker-compose.staging.yml logs -f backend-staging
docker-compose -f docker-compose.staging.yml logs -f frontend-staging
docker-compose -f docker-compose.staging.yml logs -f mysql-staging
```

### Reset Staging Environment

```bash
# SSH to server
ssh root@141.136.44.168

cd /var/pdflab-staging/app/deployment/staging

# Stop and remove everything (including data)
docker-compose -f docker-compose.staging.yml down -v

# Start fresh
docker-compose -f docker-compose.staging.yml up -d
```

---

## 🧪 Testing Workflow

### 1. **Local Development**
```bash
# Write code
# Run unit tests
npm run test:unit
```

### 2. **Deploy to Staging**
```bash
# Deploy
bash deployment/staging/deploy-to-staging.sh
```

### 3. **Test on Staging**
```bash
# Run full test suite
npm run test:e2e
npm run test:integration
npm run test:accessibility

# Manual QA testing
# Browse to: http://staging.pdflab.pro:3001
```

### 4. **Deploy to Production** (if tests pass)
```bash
# Deploy to production
bash deployment/deploy-to-production.sh
```

---

## 📊 Port Mapping

| Service | Production | Staging | Accessible From |
|---------|-----------|---------|-----------------|
| **Frontend** | 3000 | 3001 | External |
| **Backend** | 3006 | 3007 | External |
| **MySQL** | 3306 | 3307 | Internal only |
| **Redis** | 6379 | 6380 | Internal only |

---

## 🔒 Security Notes

✅ **Staging uses different credentials** than production
✅ **PayFast in sandbox mode** - no real payments
✅ **Separate database** - no production data
✅ **Test users only** - fake credentials
⚠️ **Still secure** - use strong passwords for staging too

---

## 🐛 Troubleshooting

### Containers Won't Start

```bash
# Check logs
docker-compose -f docker-compose.staging.yml logs

# Common issues:
# 1. Port already in use
netstat -tlnp | grep 3307

# 2. Environment variables missing
cat .env.staging

# 3. Permission issues
chown -R root:root /var/pdflab-staging
```

### Database Connection Errors

```bash
# Check MySQL is running
docker ps | grep mysql-staging

# Test connection
docker exec -it pdflab-mysql-staging mysql -u pdflab_staging -p

# Reset database
docker-compose -f docker-compose.staging.yml down mysql-staging
docker volume rm staging_mysql-staging-data
docker-compose -f docker-compose.staging.yml up -d mysql-staging
```

### Backend Won't Connect

```bash
# Check environment variables
docker exec pdflab-backend-staging env | grep DB_

# Restart backend
docker-compose -f docker-compose.staging.yml restart backend-staging

# View logs
docker-compose -f docker-compose.staging.yml logs backend-staging
```

### Can't Access from Local Machine

```bash
# Check firewall
ufw status

# Allow ports (if needed)
ufw allow 3001/tcp  # Frontend
ufw allow 3007/tcp  # Backend

# Or use SSH tunnel
ssh -L 3001:localhost:3001 -L 3007:localhost:3007 root@141.136.44.168
```

---

## 📋 Test Credentials

Staging environment comes with pre-configured test users:

| User | Email | Password | Plan | Access |
|------|-------|----------|------|--------|
| **Free User** | staging-free@pdflab.test | TestPass123! | free | Regular user |
| **Pro User** | staging-pro@pdflab.test | TestPass123! | pro | Premium features |
| **Admin** | staging-admin@pdflab.test | Admin123! | enterprise | Full admin access |

---

## 🎯 Next Steps

After staging is set up:

1. ✅ Test all features manually
2. ✅ Run full test suite
3. ✅ Test payment flows (PayFast sandbox)
4. ✅ Performance testing with k6
5. ✅ Visual regression testing with Percy
6. ✅ If everything passes → deploy to production

---

## 📚 Related Documentation

- [Production Deployment Guide](PRODUCTION_DEPLOYMENT.md)
- [Testing Guide](../testing/100_PERCENT_COVERAGE_COMPLETE_2025-11-15.md)
- [Docker Configuration](../docker/DOCKER_SETUP.md)

---

**Last Updated**: November 15, 2025
**Status**: Ready to deploy
