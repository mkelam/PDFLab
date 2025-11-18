# Staging Environment - Quick Start

**Ultra-quick guide to set up and use staging**

---

## 🚀 Initial Setup (One-Time)

### Step 1: Upload Files to Server
```bash
# From Windows PowerShell
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab
scp -r deployment/staging root@141.136.44.168:/tmp/
```

### Step 2: Run Setup on Server
```bash
# SSH to server
ssh root@141.136.44.168

# Copy files
mkdir -p /var/pdflab-staging
cp -r /var/pdflab/app/* /var/pdflab-staging/app/
cp -r /tmp/staging/* /var/pdflab-staging/app/deployment/staging/

# Create environment file
cd /var/pdflab-staging/app/deployment/staging
cp .env.staging.example .env.staging

# Edit with real values
nano .env.staging
# Update: MYSQL_PASSWORD, JWT_SECRET, CLOUDCONVERT_API_KEY

# Start staging
docker-compose -f docker-compose.staging.yml up -d
```

### Step 3: Verify
```bash
# Check containers
docker ps | grep staging

# Test backend
curl http://localhost:3007/api/health

# Should see all 4 containers running:
# - pdflab-mysql-staging (3307)
# - pdflab-redis-staging (6380)
# - pdflab-backend-staging (3007)
# - pdflab-frontend-staging (3001)
```

---

## 📦 Deploy to Staging (Daily Use)

### Windows (PowerShell)
```bash
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Build and deploy
npm run build

# Upload to staging
scp -r * root@141.136.44.168:/var/pdflab-staging/app/

# Restart (via SSH)
ssh root@141.136.44.168 "cd /var/pdflab-staging/app/deployment/staging && docker-compose -f docker-compose.staging.yml restart"
```

### Or Use Deployment Script
```bash
# Make executable (one-time)
chmod +x deployment/staging/deploy-staging-windows.bat

# Deploy
deployment\staging\deploy-staging-windows.bat
```

---

## 🧪 Test Against Staging

### From Your Local Machine
```bash
# Unit tests (local)
npm run test:unit

# E2E tests against staging
set API_URL=http://141.136.44.168:3007
npm run test:e2e

# Integration tests against staging
npm run test:integration

# Performance tests
k6 run -e API_URL=http://141.136.44.168:3007 tests/performance/load-test.js
```

---

## 🔧 Manage Staging

### View Logs
```bash
ssh root@141.136.44.168
cd /var/pdflab-staging/app/deployment/staging

# All logs
docker-compose -f docker-compose.staging.yml logs -f

# Specific service
docker-compose -f docker-compose.staging.yml logs -f backend-staging
```

### Restart Services
```bash
ssh root@141.136.44.168
cd /var/pdflab-staging/app/deployment/staging

# Restart all
docker-compose -f docker-compose.staging.yml restart

# Restart specific service
docker-compose -f docker-compose.staging.yml restart backend-staging
```

### Reset Everything
```bash
ssh root@141.136.44.168
cd /var/pdflab-staging/app/deployment/staging

# Delete everything (including data)
docker-compose -f docker-compose.staging.yml down -v

# Start fresh
docker-compose -f docker-compose.staging.yml up -d
```

---

## 📊 Access Staging

| Service | URL | Port |
|---------|-----|------|
| **Frontend** | http://141.136.44.168:3001 | 3001 |
| **Backend** | http://141.136.44.168:3007 | 3007 |
| **API** | http://141.136.44.168:3007/api/health | 3007 |
| **MySQL** | localhost:3307 | 3307 |
| **Redis** | localhost:6380 | 6380 |

---

## 🔑 Test Credentials

| User | Email | Password |
|------|-------|----------|
| Free | staging-free@pdflab.test | TestPass123! |
| Pro | staging-pro@pdflab.test | TestPass123! |
| Admin | staging-admin@pdflab.test | Admin123! |

---

## 🎯 Workflow

```
1. Write code locally
   ↓
2. Run unit tests
   npm run test:unit
   ↓
3. Deploy to staging
   deployment\staging\deploy-staging-windows.bat
   ↓
4. Test on staging
   npm run test:e2e (against staging)
   ↓
5. Manual QA testing
   http://141.136.44.168:3001
   ↓
6. If all pass → Deploy to production
```

---

## 🐛 Quick Fixes

### Can't connect to staging
```bash
# Check containers running
ssh root@141.136.44.168 "docker ps | grep staging"

# Restart if needed
ssh root@141.136.44.168 "cd /var/pdflab-staging/app/deployment/staging && docker-compose -f docker-compose.staging.yml restart"
```

### Database errors
```bash
# Reset database
ssh root@141.136.44.168 "cd /var/pdflab-staging/app/deployment/staging && docker-compose -f docker-compose.staging.yml down mysql-staging && docker-compose -f docker-compose.staging.yml up -d mysql-staging"
```

### Environment variables not working
```bash
# Edit environment file
ssh root@141.136.44.168 "nano /var/pdflab-staging/app/deployment/staging/.env.staging"

# Then restart
ssh root@141.136.44.168 "cd /var/pdflab-staging/app/deployment/staging && docker-compose -f docker-compose.staging.yml restart"
```

---

## 📚 Full Documentation

See: [docs/deployment/STAGING_SETUP_GUIDE.md](docs/deployment/STAGING_SETUP_GUIDE.md)

---

**Quick Commands Cheat Sheet**:
```bash
# Deploy
deployment\staging\deploy-staging-windows.bat

# Test
npm run test:e2e

# Logs
ssh root@141.136.44.168 "cd /var/pdflab-staging/app/deployment/staging && docker-compose -f docker-compose.staging.yml logs -f"

# Restart
ssh root@141.136.44.168 "cd /var/pdflab-staging/app/deployment/staging && docker-compose -f docker-compose.staging.yml restart"

# Reset
ssh root@141.136.44.168 "cd /var/pdflab-staging/app/deployment/staging && docker-compose -f docker-compose.staging.yml down -v && docker-compose -f docker-compose.staging.yml up -d"
```

---

**Last Updated**: November 15, 2025
