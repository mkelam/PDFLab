# Epic 1: Admin Panel Foundation

## Epic Overview
**Epic ID:** ADMIN-001
**Epic Name:** Admin Panel Foundation
**Priority:** Critical
**Estimated Effort:** 2 days
**Dependencies:** None (Foundation epic)

## Description
Establish the foundational infrastructure for the comprehensive admin panel, including database schema changes for role-based access control (RBAC), authentication middleware, admin layout components, and navigation structure.

This epic provides the technical foundation that all subsequent admin modules will build upon.

## Business Value
- **Operational Efficiency:** Enable support, finance, and admin teams to manage the platform without direct database access
- **Security & Compliance:** Role-based access control ensures proper authorization and audit trails
- **Scalability:** Clean architecture allows rapid addition of new admin modules
- **Risk Reduction:** Eliminates need for manual database queries, reducing human error by estimated 90%

## User Personas
- **Super Admin:** Full platform access, manages other admin users
- **Admin:** Platform management without user/role management
- **Finance:** Payment and subscription management access
- **Support:** User assistance and conversion troubleshooting access

## Epic Goals
1. Database schema supports RBAC with 5 role types (user, support, finance, admin, super_admin)
2. Audit logging system tracks all admin actions for compliance
3. Admin authentication middleware enforces role-based permissions
4. Admin layout provides consistent dark-themed interface distinct from user-facing UI
5. Navigation system supports future module additions without refactoring

## Technical Scope

### Backend Components
1. **Database Migrations**
   - Add `role` enum field to `users` table with default 'user'
   - Create `admin_audit_logs` table for compliance tracking
   - Create `system_health_logs` table for monitoring metrics
   - Add indexes for performance optimization

2. **Authentication & Authorization**
   - Admin authentication middleware (`requireAdmin`, `requireRole`)
   - Permission checking utility functions
   - JWT token role validation
   - Admin session management

3. **Audit Logging System**
   - Audit log service for tracking admin actions
   - Automatic logging middleware for all admin API calls
   - Log retention and cleanup policies

4. **Admin API Scaffolding**
   - `/api/admin/*` route structure
   - Health check endpoint for admin routes
   - Error handling middleware for admin context

### Frontend Components
1. **Admin Layout**
   - AdminLayout component with dark theme
   - Admin navigation sidebar/header
   - Admin route wrapper component
   - Responsive design for desktop/tablet

2. **Admin Authentication**
   - `useRequireAdmin()` hook for route protection
   - `useAdminAuth()` context for admin user state
   - Admin login flow (reuse existing auth, check role)
   - Unauthorized access handling

3. **Core UI Components**
   - AdminPageHeader component
   - AdminCard component (dark theme variant)
   - AdminTable base component
   - AdminBadge for status indicators
   - AdminButton variants

4. **Navigation System**
   - AdminNav component with module routing
   - Active route highlighting
   - Permission-based nav item visibility
   - Collapsible sidebar for mobile

## Acceptance Criteria

### Database Schema
- [ ] `users` table has `role` field with enum values
- [ ] `admin_audit_logs` table created with all required fields
- [ ] `system_health_logs` table created with indexes
- [ ] At least one super_admin user exists in database for testing
- [ ] Database migrations run successfully without errors

### Backend Authentication
- [ ] Admin middleware blocks non-admin users from /api/admin/* routes
- [ ] Role-based middleware enforces granular permissions (support, finance, admin, super_admin)
- [ ] Admin actions automatically log to audit_logs table
- [ ] Admin API returns appropriate 401/403 status codes for unauthorized access
- [ ] Audit logs include: admin_user_id, action, entity_type, entity_id, changes (JSON), ip_address, timestamp

### Frontend Layout
- [ ] /app/admin route exists and renders AdminLayout
- [ ] AdminLayout uses dark theme distinct from user UI
- [ ] Navigation sidebar shows: Dashboard, Users, Conversions, Payments, System, Analytics, Audit Logs
- [ ] useRequireAdmin hook redirects non-admin users to login
- [ ] Admin pages responsive on desktop (1920x1080) and tablet (768px)

### Navigation & Routing
- [ ] Admin routes protected by role-based guards
- [ ] Navigation items hidden based on user role permissions
- [ ] Active route highlighted in navigation
- [ ] Breadcrumbs show current location in admin hierarchy
- [ ] User can navigate between all admin sections without errors

### Quality & Performance
- [ ] All admin components use TypeScript with proper typing
- [ ] Admin API endpoints respond within 200ms (excluding external API calls)
- [ ] Audit logging does not add >50ms to admin API response time
- [ ] No console errors on admin pages
- [ ] Dark theme properly applied across all admin components

## User Stories (Derived)

### Story 1.1: Database Schema for RBAC
**As a** system administrator
**I want** a role-based access control system in the database
**So that** I can assign different permission levels to team members

**Tasks:**
- Write migration to add `role` enum to users table
- Create `admin_audit_logs` table with proper schema
- Create `system_health_logs` table
- Add indexes for query performance
- Seed database with test admin user

**Acceptance Criteria:**
- Migration runs successfully on fresh database
- Role enum includes: user, support, finance, admin, super_admin
- Audit logs table captures all required fields (admin_user_id, action, entity_type, entity_id, changes, ip, timestamp)
- Indexes exist on frequently queried fields

---

### Story 1.2: Admin Authentication Middleware
**As a** developer
**I want** reusable authentication middleware for admin routes
**So that** only authorized users can access admin functionality

**Tasks:**
- Create `requireAdmin` middleware (any admin role)
- Create `requireRole` middleware (specific roles)
- Add role validation to JWT token verification
- Create permission checking utility functions
- Add middleware to admin routes

**Acceptance Criteria:**
- Non-admin users receive 403 Forbidden on admin routes
- Role-specific middleware enforces granular permissions
- JWT tokens include role claim
- Middleware responds with clear error messages
- Unit tests cover all permission scenarios

---

### Story 1.3: Audit Logging System
**As a** compliance officer
**I want** all admin actions logged automatically
**So that** we have a complete audit trail for security and compliance

**Tasks:**
- Create audit logging service
- Create audit logging middleware
- Add automatic logging to all admin API endpoints
- Implement log retention policy (90 days)
- Create admin action types enum

**Acceptance Criteria:**
- All admin actions logged with user, action, entity, timestamp
- Changes tracked as JSON before/after snapshots
- IP address and user agent captured
- Logs queryable by admin user, action type, entity, date range
- Logging does not significantly impact API performance (<50ms overhead)

---

### Story 1.4: Admin Layout & Navigation
**As an** admin user
**I want** a consistent dark-themed admin interface with clear navigation
**So that** I can efficiently access different admin functions

**Tasks:**
- Create AdminLayout component with dark theme
- Build AdminNav component with sidebar
- Create admin route structure (/app/admin/*)
- Implement useRequireAdmin hook
- Create AdminPageHeader component
- Add breadcrumb navigation

**Acceptance Criteria:**
- Admin layout visually distinct from user-facing UI (dark theme)
- Navigation shows: Dashboard, Users, Conversions, Payments, System, Analytics, Audit Logs
- Active route highlighted in navigation
- Non-admin users redirected to login
- Responsive design works on desktop and tablet
- Navigation items hidden based on user role

---

### Story 1.5: Core Admin UI Components
**As a** frontend developer
**I want** reusable admin-specific UI components
**So that** I can build admin pages consistently and efficiently

**Tasks:**
- Create AdminCard component (dark theme)
- Create AdminTable base component
- Create AdminBadge for status indicators
- Create AdminButton variants
- Create AdminEmptyState component
- Document components in Storybook (optional)

**Acceptance Criteria:**
- Components use dark admin color palette (OKLCH)
- Components support TypeScript with proper prop types
- Table component supports sorting, pagination props
- Badge component includes status color variants (success, warning, error, info)
- Components accessible (WCAG AA)
- Components reusable across all admin modules

---

## Dependencies & Risks

### Dependencies
- **None** - This is the foundation epic, no blockers

### Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Database migration fails on production | Low | High | Test migrations on staging database, backup before migration, rollback script ready |
| Role-based permissions too complex | Medium | Medium | Start with simple role hierarchy, iterate based on real usage patterns |
| Audit logging impacts performance | Low | Medium | Async logging, batch writes, monitor performance metrics |
| Admin UI conflicts with user UI styles | Low | Low | Use separate color palette and CSS namespace for admin |

---

## Success Metrics
- Database migration completes successfully within 5 minutes
- Admin authentication blocks 100% of unauthorized access attempts
- All admin actions logged with <50ms overhead
- Admin layout renders without console errors
- Navigation supports all planned modules without refactoring

---

## Out of Scope (This Epic)
- Specific admin module functionality (users, conversions, payments, etc.)
- Advanced analytics and reporting
- Real-time monitoring and alerts
- Bulk operations and advanced filtering
- Data visualization components

These items are covered in subsequent epics (ADMIN-002 through ADMIN-007).

---

## Technical Notes

### Database Migration Template
```sql
-- Migration: Add RBAC and audit logging
ALTER TABLE users
  ADD COLUMN role ENUM('user', 'support', 'finance', 'admin', 'super_admin')
  DEFAULT 'user' AFTER email;

CREATE TABLE admin_audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  admin_user_id VARCHAR(36) NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(36),
  changes JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_user_id) REFERENCES users(id),
  INDEX idx_admin_user (admin_user_id),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_created (created_at)
);

CREATE TABLE system_health_logs (
  id VARCHAR(36) PRIMARY KEY,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10, 2),
  status ENUM('healthy', 'warning', 'critical') DEFAULT 'healthy',
  details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_metric (metric_name),
  INDEX idx_created (created_at)
);

-- Seed super admin user (update with real credentials)
UPDATE users SET role = 'super_admin' WHERE email = 'admin@pdflab.com';
```

### Permission Matrix Reference
```typescript
enum UserRole {
  USER = 'user',
  SUPPORT = 'support',
  FINANCE = 'finance',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

const PERMISSIONS = {
  'admin.access': ['support', 'finance', 'admin', 'super_admin'],
  'users.view': ['support', 'admin', 'super_admin'],
  'users.edit': ['admin', 'super_admin'],
  'users.delete': ['super_admin'],
  'conversions.view': ['support', 'admin', 'super_admin'],
  'conversions.manage': ['support', 'admin', 'super_admin'],
  'payments.view': ['finance', 'admin', 'super_admin'],
  'payments.manage': ['finance', 'super_admin'],
  'system.view': ['admin', 'super_admin'],
  'system.configure': ['super_admin'],
  'audit.view': ['admin', 'super_admin']
};
```

---

**Epic Owner:** Sarah (Product Owner)
**Created:** 2025-11-01
**Status:** Ready for Development
