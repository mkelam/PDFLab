# Command Reference - Where to Run Each Command

**Important**: This guide tells you EXACTLY where to run each command.

---

## 🖥️ Two Environments

### 1. Your Local Windows Machine (PowerShell/CMD)
- **Location**: `C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab`
- **When to use**: Running tests, building code, npm commands
- **How to open**: Right-click folder → "Open in Terminal" or start PowerShell and navigate

### 2. VPS Server via SSH (Linux Terminal)
- **Location**: SSH into `root@141.136.44.168`
- **When to use**: Managing staging containers, checking logs, database operations
- **How to connect**: Run `ssh root@141.136.44.168` from PowerShell

---

## 📋 Testing Commands

### Run All Staging Tests

**WHERE**: 🖥️ Local Windows Machine (PowerShell)
```bash
# Navigate to project directory
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Run all staging tests
npm run test:staging
```

---

### Run Integration Tests Only

**WHERE**: 🖥️ Local Windows Machine (PowerShell)
```bash
# Navigate to project directory
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Run integration tests against staging
npm run test:staging:integration
```

---

### Run E2E Tests Only

**WHERE**: 🖥️ Local Windows Machine (PowerShell)
```bash
# Navigate to project directory
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Run E2E tests against staging
npm run test:staging:e2e
```

---

### Run API Tests Only

**WHERE**: 🖥️ Local Windows Machine (PowerShell)
```bash
# Navigate to project directory
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Run API integration tests
npm run test:staging:api
```

---

### View Test Report

**WHERE**: 🖥️ Local Windows Machine (PowerShell)
```bash
# Navigate to project directory (if not already there)
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Open HTML report in browser
npm run test:staging:report
```

---

### Run Performance Tests

**WHERE**: 🖥️ Local Windows Machine (PowerShell)
```bash
# Navigate to project directory
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Run load test (requires k6 installed)
npm run test:staging:performance
```

---

### Run Single Test File

**WHERE**: 🖥️ Local Windows Machine (PowerShell)
```bash
# Navigate to project directory
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Run specific test file
npx playwright test tests/e2e/auth-flow.spec.ts -c tests/e2e/playwright.config.staging.ts
```

---

### Debug Tests with UI

**WHERE**: 🖥️ Local Windows Machine (PowerShell)
```bash
# Navigate to project directory
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Open Playwright UI for debugging
npx playwright test -c tests/e2e/playwright.config.staging.ts --ui
```

---

## 🐛 Troubleshooting Commands

### Check Staging Services Status

**WHERE**: 🌐 VPS Server (SSH)
```bash
# SSH into VPS
ssh root@141.136.44.168

# Check all staging containers
docker ps --filter 'name=staging'
```

---

### View Backend Logs

**WHERE**: 🌐 VPS Server (SSH)
```bash
# SSH into VPS
ssh root@141.136.44.168

# View last 50 lines of backend logs
docker logs --tail 50 pdflab-backend-staging

# Follow logs in real-time (Ctrl+C to stop)
docker logs -f pdflab-backend-staging
```

---

### View Frontend Logs

**WHERE**: 🌐 VPS Server (SSH)
```bash
# SSH into VPS
ssh root@141.136.44.168

# View main app logs
docker logs --tail 50 pdflab-frontend-staging

# View partner portal logs
docker logs --tail 50 pdflab-partners-staging
```

---

### Check Database

**WHERE**: 🌐 VPS Server (SSH)
```bash
# SSH into VPS
ssh root@141.136.44.168

# Connect to staging MySQL
docker exec -it pdflab-mysql-staging mysql -u root -p pdflab_staging

# Then run SQL commands:
# SHOW TABLES;
# SELECT * FROM users LIMIT 5;
# etc.
```

---

### Test Backend Health

**WHERE**: 🖥️ Local Windows Machine (PowerShell) OR 🌐 VPS Server
```bash
# From local machine
curl http://141.136.44.168:3007/health

# OR from VPS
ssh root@141.136.44.168
curl http://localhost:3007/health
```

---

### Test Main App

**WHERE**: 🖥️ Local Windows Machine (PowerShell) OR 🌐 VPS Server
```bash
# From local machine
curl -I http://141.136.44.168:3002

# OR from VPS
ssh root@141.136.44.168
curl -I http://localhost:3002
```

---

### Restart Staging Services

**WHERE**: 🌐 VPS Server (SSH)
```bash
# SSH into VPS
ssh root@141.136.44.168

# Navigate to staging directory
cd /var/pdflab-staging/app/deployment/staging

# Restart all staging services
docker-compose -f docker-compose.staging.yml restart

# OR restart specific service
docker restart pdflab-backend-staging
docker restart pdflab-frontend-staging
docker restart pdflab-partners-staging
```

---

### Stop Staging Services

**WHERE**: 🌐 VPS Server (SSH)
```bash
# SSH into VPS
ssh root@141.136.44.168

# Navigate to staging directory
cd /var/pdflab-staging/app/deployment/staging

# Stop all staging services
docker-compose -f docker-compose.staging.yml down
```

---

### Start Staging Services

**WHERE**: 🌐 VPS Server (SSH)
```bash
# SSH into VPS
ssh root@141.136.44.168

# Navigate to staging directory
cd /var/pdflab-staging/app/deployment/staging

# Start all staging services
docker-compose -f docker-compose.staging.yml --env-file .env.staging up -d
```

---

## 📊 Database Commands

### Create Test User

**WHERE**: 🌐 VPS Server (SSH)
```bash
# Step 1: SSH into VPS
ssh root@141.136.44.168

# Step 2: Connect to MySQL
docker exec -it pdflab-mysql-staging mysql -u root -p pdflab_staging

# Step 3: Paste this SQL (you'll need to generate password hash first)
INSERT INTO users (id, email, password_hash, name, plan, conversions_used, conversions_limit, created_at)
VALUES (
  UUID(),
  'test.staging@pdflab.pro',
  '$2a$10$YourHashedPasswordHere',
  'Test User Staging',
  'free',
  0,
  3,
  NOW()
);
```

---

### Generate Password Hash

**WHERE**: 🖥️ Local Windows Machine (PowerShell)
```bash
# Navigate to project directory
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Generate bcrypt hash for password
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('StagingTest123!', 10));"
```

---

### View All Users

**WHERE**: 🌐 VPS Server (SSH)
```bash
# SSH into VPS
ssh root@141.136.44.168

# Connect to MySQL and run query
docker exec -it pdflab-mysql-staging mysql -u root -p pdflab_staging -e "SELECT id, email, name, plan FROM users;"
```

---

### Check Test User Exists

**WHERE**: 🌐 VPS Server (SSH)
```bash
# SSH into VPS
ssh root@141.136.44.168

# Check if test user exists
docker exec -it pdflab-mysql-staging mysql -u root -p pdflab_staging -e "SELECT email FROM users WHERE email LIKE '%staging%';"
```

---

## 🔧 Development Commands

### Install Dependencies

**WHERE**: 🖥️ Local Windows Machine (PowerShell)
```bash
# Navigate to project directory
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Install all dependencies
npm install
```

---

### Run Local Development

**WHERE**: 🖥️ Local Windows Machine (PowerShell)
```bash
# Navigate to project directory
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Start local dev server (NOT for staging tests)
npm run dev
```

---

### Build for Production

**WHERE**: 🖥️ Local Windows Machine (PowerShell)
```bash
# Navigate to project directory
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Build Next.js app
npm run build
```

---

## 📱 Quick Reference Table

| What You Want To Do | Where | Command |
|---------------------|-------|---------|
| Run tests | 🖥️ Local | `cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab && npm run test:staging` |
| Check logs | 🌐 VPS | `ssh root@141.136.44.168 && docker logs pdflab-backend-staging` |
| Restart staging | 🌐 VPS | `ssh root@141.136.44.168 && cd /var/pdflab-staging/app/deployment/staging && docker-compose restart` |
| Test backend | 🖥️ Local | `curl http://141.136.44.168:3007/health` |
| View database | 🌐 VPS | `ssh root@141.136.44.168 && docker exec -it pdflab-mysql-staging mysql -u root -p` |

---

## 🎯 Most Common Workflow

### 1. Run Tests from Local Machine

**WHERE**: 🖥️ Local Windows Machine (PowerShell)
```bash
# Open PowerShell
# Navigate to project
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Run tests
npm run test:staging:integration
```

### 2. If Tests Fail, Check Logs on VPS

**WHERE**: 🌐 VPS Server (SSH)
```bash
# Open new PowerShell window
# SSH into VPS
ssh root@141.136.44.168

# Check logs
docker logs --tail 100 pdflab-backend-staging
```

### 3. Fix Issue and Restart Service

**WHERE**: 🌐 VPS Server (SSH - already connected from step 2)
```bash
# Restart the service
docker restart pdflab-backend-staging

# Wait 10 seconds
sleep 10

# Check if healthy
docker ps | grep backend-staging
```

### 4. Re-run Tests

**WHERE**: 🖥️ Local Windows Machine (back to first PowerShell window)
```bash
# Still in project directory
# Re-run tests
npm run test:staging:integration
```

---

## 💡 Key Points

1. **🖥️ Test Commands** = Always run from LOCAL machine in project folder
2. **🌐 Server Management** = Always run via SSH on VPS
3. **Two Windows**: Keep two PowerShell windows open - one local, one SSH
4. **Project Path**: `C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab`
5. **SSH Command**: `ssh root@141.136.44.168`

---

**Created**: 2025-11-15
**Use This**: Whenever you're not sure where to run a command
