# PDFLab Beta Launch System - Deployment v1.2.0

**Deployment Date**: November 11, 2025
**Version**: v1.2.0-beta
**Status**: In Progress

## Features Deployed

### 1. Beta Launch System ✨ NEW
- **Beta Application Form** (`/beta`)
  - User-facing application submission
  - Plan selection: Starter or Pro
  - 90-day free access
  - Company and use case information
  - Social/professional links (LinkedIn, Twitter, Website)

- **Admin Beta Dashboard** (`/admin/beta`)
  - Review pending applications
  - Approve/reject applications
  - Auto-create user accounts on approval
  - 3 tabs: Pending, Approved, Rejected
  - Detailed application view modal

- **Backend API Endpoints**
  - `POST /api/beta/apply` - Submit application (public)
  - `GET /api/beta/status/:email` - Check status (public)
  - `GET /api/beta/applications` - List all (admin only)
  - `POST /api/beta/applications/:id/approve` - Approve (admin only)
  - `POST /api/beta/applications/:id/reject` - Reject (admin only)

- **Database Schema**
  - `beta_applications` table created
  - `users` table updated with `is_beta_user` and `beta_expires_at` columns
  - Foreign key constraints and indexes

### 2. Beta Launch Banner on Homepage
- Prominent banner at top of landing page
- Compact, single-line design
- Links to `/beta` application form
- Animated sparkle icon
- "Apply Now" CTA button

## Technical Changes

### Frontend
- New pages: `app/beta/page.tsx`, `app/admin/beta/page.tsx`
- New component: `components/ui/radio-group.tsx`
- Updated: `app/page.tsx` (beta banner added)
- Package added: `@radix-ui/react-radio-group`

### Backend
- New model: `src/models/BetaApplication.ts`
- New controller: `src/controllers/beta.controller.ts`
- New routes: `src/routes/beta.routes.ts`
- Updated: `src/models/index.ts` (export BetaApplication)
- Updated: `src/models/User.ts` (beta fields added)
- Updated: `src/server.ts` (beta routes registered)
- Migration: `src/migrations/003_beta_applications.sql`

## Deployment Steps

1. ✅ Build frontend Docker image: `mkelam/pdflab-frontend:v1.2.0-beta`
2. ✅ Build backend Docker image: `mkelam/pdflab-backend:v1.2.0-beta`
3. ⏳ Push images to Docker Hub
4. ⏳ Run database migration on production
5. ⏳ Deploy to VPS (141.136.44.168)
6. ⏳ Verify deployment

## Testing Checklist

### Beta Application Flow
- [ ] Access https://pdflab.pro/beta
- [ ] Fill out and submit beta application
- [ ] Verify submission success message
- [ ] Check application appears in database

### Admin Review Flow
- [ ] Login as admin
- [ ] Navigate to https://pdflab.pro/admin/beta
- [ ] View pending applications
- [ ] Approve an application
- [ ] Verify user account created
- [ ] Check beta user fields populated
- [ ] Test login with generated credentials

### Homepage Banner
- [ ] Access https://pdflab.pro
- [ ] Verify beta banner displays at top
- [ ] Click banner to navigate to /beta
- [ ] Verify responsive design on mobile

### API Endpoints
- [ ] Test POST /api/beta/apply
- [ ] Test GET /api/beta/status/:email
- [ ] Test GET /api/beta/applications (admin)
- [ ] Test POST /api/beta/applications/:id/approve (admin)
- [ ] Test POST /api/beta/applications/:id/reject (admin)

## Production URLs

- **Frontend**: https://pdflab.pro
- **Backend**: https://pdflab.pro/api
- **Beta Application**: https://pdflab.pro/beta
- **Admin Beta Dashboard**: https://pdflab.pro/admin/beta
- **Health Check**: https://pdflab.pro/api/health

## Database Changes

### New Table: `beta_applications`
```sql
CREATE TABLE beta_applications (
  id CHAR(36) PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  company VARCHAR(255),
  role VARCHAR(255),
  use_case TEXT NOT NULL,
  monthly_volume VARCHAR(50),
  plan_requested ENUM('starter', 'pro') DEFAULT 'starter',
  linkedin_url VARCHAR(500),
  twitter_url VARCHAR(500),
  website_url VARCHAR(500),
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  reviewed_by CHAR(36),
  reviewed_at DATETIME,
  rejection_reason TEXT,
  user_id CHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

### Updated Table: `users`
```sql
ALTER TABLE users
ADD COLUMN is_beta_user BOOLEAN DEFAULT FALSE,
ADD COLUMN beta_expires_at DATETIME;
```

## Rollback Plan

If issues occur, rollback to previous version:

```bash
ssh root@141.136.44.168 "cd /root/pdflab && \
  docker-compose down && \
  docker pull mkelam/pdflab-frontend:v1.1.3-features && \
  docker pull mkelam/pdflab-backend:latest && \
  docker-compose up -d"
```

To rollback database changes:
```sql
DROP TABLE IF EXISTS beta_applications;
ALTER TABLE users DROP COLUMN is_beta_user;
ALTER TABLE users DROP COLUMN beta_expires_at;
```

## Notes

- Beta users get 90 days of free access starting from approval date
- Admin credentials required to access admin beta dashboard
- Auto-generated passwords sent to approved users (email integration pending)
- Application form validates required fields client-side and server-side
- Beta banner is compact and non-intrusive on homepage

## Success Metrics

Track these metrics post-deployment:
- Number of beta applications submitted
- Application approval rate
- Beta user conversion to paid plans
- Time from application to approval
- Beta user engagement (conversions used)

---

**Deployment By**: Claude Code
**Approved By**: _Pending_
**Production Verification**: _Pending_
