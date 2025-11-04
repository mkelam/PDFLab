# Backend Startup Issue - Docker Not Running

## Problem

The backend cannot start because the **MySQL database** is not accessible. This is because **Docker Desktop is not running**.

## Error Message

```
✗ Unable to connect to database: ConnectionRefusedError [SequelizeConnectionRefusedError]
✗ Failed to start server: Error: Failed to connect to database
```

## Current Status

| Service | Status | Port |
|---------|--------|------|
| Frontend (Next.js) | ✅ Running | 3000 |
| Backend (Express) | ❌ Waiting for DB | 3006 |
| MySQL Database | ❌ Not Running | 3306 |
| Redis | ❌ Not Running | 6379 |
| Docker Desktop | ❌ Not Running | - |

## Solution

### Step 1: Start Docker Desktop
1. Open **Docker Desktop** application
2. Wait for it to fully start (the whale icon should be stable)

### Step 2: Start Database Containers
Once Docker Desktop is running, execute:
```bash
docker start pdflab-mysql pdflab-redis
```

Or if containers don't exist, create them:
```bash
cd backend
docker-compose up -d
```

### Step 3: Backend Will Auto-Restart
The backend is running with `tsx watch`, so once the database is available, it will automatically reconnect and start serving.

## Quick Start Command

```bash
# Start Docker containers
docker start pdflab-mysql pdflab-redis

# Verify they're running
docker ps

# Backend should automatically connect within a few seconds
```

## Verify Everything is Running

```bash
# Check all ports
netstat -ano | findstr ":300"

# You should see:
# :3000 - Frontend (Next.js)
# :3006 - Backend (Express API)
# :3306 - MySQL Database
# :6379 - Redis (not shown with findstr :300, use :6379)
```

## What's Working

✅ **Frontend**: Running perfectly on http://localhost:3000
✅ **Pricing Page**: Updated with 55% discount on Pro plan
✅ **Backend Code**: Ready to start once database is available

## What Needs Action

⚠️ **Start Docker Desktop**
⚠️ **Start MySQL container**: `docker start pdflab-mysql`
⚠️ **Start Redis container**: `docker start pdflab-redis`

---

**Next Steps**:
1. Start Docker Desktop
2. Start the database containers
3. Backend will automatically connect and start
4. You can then test login, signup, and pricing page functionality

**Updated**: 2025-11-04 16:27 UTC
