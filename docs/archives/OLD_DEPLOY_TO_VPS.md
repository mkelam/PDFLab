# VPS Deployment Instructions

## 🚀 Quick Deploy (Recommended)

Since you have **Hostinger VPS**, use their web-based terminal:

### Method 1: Via Hostinger Control Panel ⭐

1. **Log into Hostinger VPS Dashboard**
   - Go to https://hpanel.hostinger.com/
   - Navigate to VPS → Your Server → Terminal

2. **Copy and paste this command:**
   ```bash
   cd /var/pdflab/app && \
   docker compose -f docker-compose.production.yml down && \
   docker pull mkelam/pdflab-backend:latest && \
   docker pull mkelam/pdflab-frontend:latest && \
   docker compose -f docker-compose.production.yml up -d && \
   sleep 30 && \
   docker ps && \
   curl -s http://localhost:3006/api/payfast/plans | grep price
   ```

3. **Verify deployment:**
   - Frontend: http://141.136.44.168:3000
   - Backend: http://141.136.44.168:3006/api/payfast/plans
   - Admin Panel: http://141.136.44.168:3000/admin

---

### Method 2: Via SSH (If you have access)

```bash
# From your local machine
scp COMPLETE_VPS_DEPLOYMENT.sh root@141.136.44.168:/tmp/

# SSH to VPS
ssh root@141.136.44.168

# Run deployment script
bash /tmp/COMPLETE_VPS_DEPLOYMENT.sh
```

---

### Method 3: Direct SSH One-Liner

```bash
ssh root@141.136.44.168 'bash -s' < COMPLETE_VPS_DEPLOYMENT.sh
```

---

## 📋 What This Deployment Includes

### Recent 24-Hour Updates:
- ✅ **PayFast Controller**: JSON response instead of HTML
- ✅ **Payment Flow**: Suspense boundaries for better UX
- ✅ **Get-Started Page**: Full payment integration
- ✅ **Docker Build**: bcrypt optimization
- ✅ **Admin Panel**: Latest enhancements
- ✅ **Pricing**: Correct values ($4.55, $13.50, $99.99)

### Docker Images Built:
- **Backend**: `mkelam/pdflab-backend:latest` (built: 2025-11-05)
- **Frontend**: `mkelam/pdflab-frontend:latest` (building...)

---

## ✅ Verification Checklist

After deployment, verify these endpoints:

1. **Pricing API**
   ```bash
   curl http://141.136.44.168:3006/api/payfast/plans
   ```
   Should show: `"price":4.55` and `"price":13.5`

2. **Frontend**
   ```bash
   curl -I http://141.136.44.168:3000
   ```
   Should return: `HTTP/1.1 200 OK`

3. **Admin Panel**
   ```bash
   curl -I http://141.136.44.168:3000/admin
   ```
   Should return: `HTTP/1.1 200 OK`

4. **Payment Flow**
   - Visit: http://141.136.44.168:3000/get-started?plan=starter
   - Should show payment selection page

---

## 🔧 Troubleshooting

### Backend Not Starting
```bash
# Check logs
docker logs pdflab-backend-prod --tail 100

# Restart
docker restart pdflab-backend-prod
```

### Frontend Issues
```bash
# Check logs
docker logs pdflab-frontend-prod --tail 100

# Rebuild if needed
cd /var/pdflab/app
docker compose -f docker-compose.production.yml build frontend
docker compose -f docker-compose.production.yml up -d frontend
```

### Database Connection
```bash
# Check MySQL
docker exec pdflab-mysql mysql -u pdflab -p***REMOVED*** -D pdflab -e "SELECT COUNT(*) as total_users FROM users;"
```

---

## 📊 What Changed Since Last Deployment

| Component | Old State | New State | Impact |
|-----------|-----------|-----------|--------|
| Backend API | Older pricing | Latest pricing ($4.55, $13.50) | ✅ Fixed |
| Payment Flow | Missing Suspense | Suspense boundaries added | ✅ Better UX |
| Admin Panel | Basic version | Enhanced features | ✅ Improved |
| Docker Build | bcrypt issues | Optimized rebuild | ✅ Stable |

---

## 🎯 Admin Access

After deployment, test admin panel:

**Login URLs:**
- http://141.136.44.168:3000/login

**Admin Credentials:**
- mmkela@fnb.co.za (super_admin, enterprise plan)
- admin@pdflab.test (super_admin, free plan)
- admin@pdflab.com (super_admin, enterprise plan)

**Test Flow:**
1. Login with admin account
2. Navigate to /admin
3. Check Users page
4. Check Payments page
5. Verify Pricing page shows $4.55 and $13.50

---

## 📝 Deployment Summary

**Git Commit**: b80ded0f
**Commit Message**: "Sync VPS deployment with latest admin panel and payment flow updates"

**Files Changed:**
- `backend/src/controllers/payfast.controller.ts` - JSON response
- `backend/Dockerfile` - Build optimization
- `app/get-started/page.tsx` - Payment integration
- `backend/src/server.ts` - Server configuration

**Status**: Ready for deployment ✅

---

## 🚨 IMPORTANT

After deployment, your VPS will have:
- ✅ Latest pricing configuration
- ✅ Fixed payment flow
- ✅ Enhanced admin panel
- ✅ All 24-hour updates synced

**No database changes required** - All updates are code-only!

---

**Last Updated**: 2025-11-05 02:55 SAST
**Docker Images**: Backend & Frontend built with commit b80ded0f
