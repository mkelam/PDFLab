# Epic 2: User Management Module

## Epic Overview
**Epic ID:** ADMIN-002
**Epic Name:** User Management Module
**Priority:** Critical
**Estimated Effort:** 2 days
**Dependencies:** ADMIN-001 (Admin Panel Foundation)

## Description
Build a comprehensive user management interface that allows admin users to view, search, filter, edit, and manage all PDFLab users. This includes user profile management, plan changes, quota resets, account status management, and detailed user activity views.

## Business Value
- **Support Efficiency:** Reduce support ticket resolution time by 70% with direct user management tools
- **Customer Retention:** Quick plan adjustments and quota resets improve customer satisfaction
- **Revenue Operations:** Enable finance team to manage plan changes and refunds efficiently
- **Compliance:** User data access logs support GDPR/POPIA data subject access requests

## User Personas
- **Support Team:** Needs to view user details, reset passwords, adjust quotas, view conversion history
- **Finance Team:** Needs to view subscription status, process refunds, manage plan changes
- **Admin:** Full user management capabilities including account deletion
- **Super Admin:** User management plus admin user role assignment

## Epic Goals
1. Admin users can view and search all platform users with advanced filtering
2. Support can access detailed user profiles with activity history
3. Admins can modify user plans, quotas, and account status
4. User changes are logged to audit trail automatically
5. Bulk operations available for common tasks (quota reset, plan migration)

## Technical Scope

### Backend Components

1. **Admin User API Endpoints**
   - `GET /api/admin/users` - List users with pagination, search, filters
   - `GET /api/admin/users/:id` - Get detailed user profile
   - `PUT /api/admin/users/:id` - Update user details
   - `DELETE /api/admin/users/:id` - Soft delete user account
   - `POST /api/admin/users/:id/reset-password` - Generate password reset link
   - `POST /api/admin/users/:id/reset-quota` - Reset monthly conversion quota
   - `PUT /api/admin/users/:id/plan` - Change user plan
   - `POST /api/admin/users/:id/impersonate` - Generate impersonation token
   - `POST /api/admin/users/bulk-quota-reset` - Reset quota for multiple users
   - `GET /api/admin/users/:id/activity` - Get user activity log
   - `GET /api/admin/users/:id/conversions` - Get user conversion history
   - `GET /api/admin/users/:id/subscriptions` - Get user subscription details

2. **User Management Services**
   - User search service (fuzzy search by email, name, ID)
   - User filtering service (by plan, status, date range, usage)
   - Quota management service
   - Plan migration service
   - User impersonation service
   - Activity logging integration

3. **Data Models & Queries**
   - Optimized queries for user list with pagination
   - User activity aggregation queries
   - Conversion history with file metadata
   - Subscription status joins

### Frontend Components

1. **User List Page (`/app/admin/users/page.tsx`)**
   - Data table with sortable columns
   - Real-time search (debounced)
   - Advanced filters (plan, status, date range, usage)
   - Pagination controls (10/25/50/100 per page)
   - Bulk actions (quota reset, export CSV)
   - Quick actions menu per row

2. **User Detail Modal/Page**
   - Tabbed interface: Profile | Subscriptions | Conversions | Activity
   - **Profile Tab:**
     - Editable user details (name, email, plan, role)
     - Account status toggle (active/suspended)
     - Quick actions (reset password, reset quota, impersonate, delete)
   - **Subscriptions Tab:**
     - Current subscription details
     - Payment history
     - Plan change interface
   - **Conversions Tab:**
     - Conversion history table
     - File details and download links
     - Status and error information
   - **Activity Tab:**
     - Login history
     - Action timeline
     - IP addresses and user agents

3. **User Management Components**
   - UserListTable component
   - UserDetailModal component
   - UserProfileForm component
   - UserSearchBar component
   - UserFilters component
   - UserBulkActions component
   - UserActivityTimeline component

4. **Bulk Operations**
   - Multi-select checkbox system
   - Bulk quota reset dialog
   - Bulk export to CSV
   - Bulk plan migration (future)

## Acceptance Criteria

### User List & Search
- [ ] User list displays: email, name, plan, status, conversions used/limit, last login, created date
- [ ] Search box provides real-time fuzzy search by email, name, or user ID
- [ ] Search results update within 500ms of typing
- [ ] Pagination supports 10/25/50/100 users per page
- [ ] Table columns sortable (click header to sort ascending/descending)
- [ ] Empty state shown when no users match filters
- [ ] Loading skeleton displayed during data fetch

### Advanced Filtering
- [ ] Filter by plan (Free, Starter, Pro, Enterprise, All)
- [ ] Filter by status (Active, Suspended, All)
- [ ] Filter by date range (created date, last login)
- [ ] Filter by usage (over quota, under quota, all)
- [ ] Active filters displayed as removable chips
- [ ] "Clear All Filters" button resets to default view
- [ ] Filter state persisted in URL query params
- [ ] Filters can be combined (AND logic)

### User Profile Management
- [ ] Clicking user row opens detail modal/page
- [ ] Profile tab shows all user data (name, email, plan, role, status, created, last login)
- [ ] Admin can edit name, email, plan, role, status
- [ ] Changes saved with confirmation toast
- [ ] Email uniqueness validated on save
- [ ] Changes logged to admin_audit_logs

### User Actions
- [ ] "Reset Password" generates magic link and copies to clipboard
- [ ] "Reset Quota" resets conversions_used to 0 with confirmation
- [ ] "Change Plan" updates user plan and subscription
- [ ] "Impersonate User" generates temporary login token (super admin only)
- [ ] "Suspend Account" sets status to suspended, prevents login
- [ ] "Delete Account" soft deletes user with confirmation dialog
- [ ] All actions require confirmation for destructive operations
- [ ] Success/error toast notifications for all actions

### User Conversion History
- [ ] Conversions tab shows table of user's conversion jobs
- [ ] Table displays: job ID, type, status, file name, file size, created date
- [ ] File download links functional for completed jobs
- [ ] Error details shown for failed conversions
- [ ] Pagination for users with >50 conversions
- [ ] Filter by conversion type and status

### User Activity Log
- [ ] Activity tab shows timeline of user actions
- [ ] Login events with IP address and timestamp
- [ ] Conversion creation and completion events
- [ ] Payment and subscription events
- [ ] Timeline sorted chronologically (newest first)
- [ ] Pagination for long activity histories

### Bulk Operations
- [ ] Checkbox selection on table rows
- [ ] "Select All" checkbox selects all on current page
- [ ] Bulk action dropdown enabled when ≥1 user selected
- [ ] Bulk quota reset with confirmation showing affected users
- [ ] Bulk export to CSV downloads file with all user data
- [ ] Selected count displayed (e.g., "3 users selected")
- [ ] Selection cleared after bulk action completes

### Performance & Quality
- [ ] User list loads within 1 second for ≤10,000 users
- [ ] Search responds within 500ms
- [ ] Table scrolling smooth (virtualization if >100 rows)
- [ ] No N+1 queries (eager loading for subscriptions, conversions)
- [ ] All components TypeScript typed
- [ ] Responsive design works on tablet (768px+)
- [ ] Accessibility: keyboard navigation, screen reader support

## User Stories (Derived)

### Story 2.1: User List with Search & Pagination
**As a** support agent
**I want** to view all users with search and pagination
**So that** I can quickly find and assist specific users

**Tasks:**
- Create GET /api/admin/users endpoint with pagination
- Build UserListTable component
- Implement search functionality (fuzzy match on email, name, ID)
- Add pagination controls
- Add loading states

**Acceptance Criteria:**
- List displays email, name, plan, status, usage, last login
- Search updates results in real-time (debounced)
- Pagination supports 10/25/50/100 per page
- Sortable columns work correctly

---

### Story 2.2: Advanced User Filtering
**As an** admin
**I want** to filter users by plan, status, date, and usage
**So that** I can segment users for bulk operations or analysis

**Tasks:**
- Build UserFilters component
- Add filter query params to API endpoint
- Implement filter state management
- Show active filters as chips
- Persist filters in URL

**Acceptance Criteria:**
- Filters: plan, status, date range, usage threshold
- Filters combine with AND logic
- Active filters shown as removable chips
- "Clear All" resets filters
- URL reflects filter state

---

### Story 2.3: User Detail View with Tabs
**As a** support agent
**I want** detailed user information in a tabbed interface
**So that** I can view profile, conversions, and activity in one place

**Tasks:**
- Create UserDetailModal component
- Fetch detailed user data (profile, subscriptions, conversions, activity)
- Build tabbed interface (Profile | Subscriptions | Conversions | Activity)
- Implement data lazy loading per tab
- Add modal close/navigation

**Acceptance Criteria:**
- Modal opens on row click
- Tabs: Profile, Subscriptions, Conversions, Activity
- Each tab loads data independently
- Modal dismissible via ESC or close button
- Navigation breadcrumbs updated

---

### Story 2.4: Edit User Profile
**As an** admin
**I want** to edit user details (name, email, plan, status)
**So that** I can correct user data and manage accounts

**Tasks:**
- Create PUT /api/admin/users/:id endpoint
- Build UserProfileForm component
- Add form validation
- Implement save/cancel actions
- Log changes to audit trail

**Acceptance Criteria:**
- Editable fields: name, email, plan, role, status
- Email uniqueness validated
- Changes require confirmation
- Success toast on save
- Changes logged to admin_audit_logs

---

### Story 2.5: User Quick Actions (Reset Password, Quota, etc.)
**As a** support agent
**I want** quick action buttons for common user operations
**So that** I can efficiently resolve support tickets

**Tasks:**
- Create POST /api/admin/users/:id/reset-password endpoint
- Create POST /api/admin/users/:id/reset-quota endpoint
- Add quick action buttons to user detail view
- Implement confirmation dialogs
- Show success/error notifications

**Acceptance Criteria:**
- Reset Password generates magic link
- Reset Quota sets conversions_used to 0
- All actions require confirmation
- Toast notifications for success/error
- Actions logged to audit trail

---

### Story 2.6: User Impersonation (Super Admin)
**As a** super admin
**I want** to impersonate users for debugging and support
**So that** I can see exactly what users see

**Tasks:**
- Create POST /api/admin/users/:id/impersonate endpoint
- Generate temporary JWT with user context
- Add "Impersonate" button (super admin only)
- Create impersonation banner for clarity
- Auto-logout after 30 minutes

**Acceptance Criteria:**
- Only super_admin role can impersonate
- Generates valid JWT for user
- Impersonation logged to audit trail
- Banner shows "Viewing as [user]" during session
- Easy exit from impersonation mode

---

### Story 2.7: User Conversion History Tab
**As a** support agent
**I want** to view a user's conversion history
**So that** I can troubleshoot failed conversions and verify usage

**Tasks:**
- Create GET /api/admin/users/:id/conversions endpoint
- Build UserConversionsTable component
- Add file download links
- Show error details for failed jobs
- Add pagination

**Acceptance Criteria:**
- Table shows: job ID, type, status, file name, size, date
- Download links work for completed jobs
- Error details visible for failed conversions
- Pagination for >50 conversions
- Filter by type and status

---

### Story 2.8: User Activity Timeline
**As a** compliance officer
**I want** to view user activity logs
**So that** I can respond to GDPR data access requests

**Tasks:**
- Create GET /api/admin/users/:id/activity endpoint
- Build UserActivityTimeline component
- Aggregate login, conversion, payment events
- Format as chronological timeline
- Add pagination

**Acceptance Criteria:**
- Timeline shows: logins, conversions, payments, subscriptions
- Each event includes timestamp, IP, user agent
- Sorted chronologically (newest first)
- Pagination for long histories
- Export to PDF for GDPR requests (future)

---

### Story 2.9: Bulk Quota Reset
**As an** admin
**I want** to reset quotas for multiple users at once
**So that** I can efficiently manage monthly quota cycles

**Tasks:**
- Create POST /api/admin/users/bulk-quota-reset endpoint
- Add checkbox selection to user table
- Build BulkQuotaResetDialog component
- Show preview of affected users
- Log bulk actions to audit trail

**Acceptance Criteria:**
- Multi-select checkboxes on table rows
- "Select All" selects current page
- Confirmation shows list of affected users
- Bulk reset updates all selected users
- Action logged once with user IDs in JSON

---

### Story 2.10: Export Users to CSV
**As an** admin
**I want** to export user data to CSV
**So that** I can analyze data in Excel or share with stakeholders

**Tasks:**
- Create GET /api/admin/users/export endpoint
- Generate CSV with all user fields
- Add "Export CSV" button (bulk action and standalone)
- Support filtered export (export current view)
- Stream large exports

**Acceptance Criteria:**
- CSV includes: ID, email, name, plan, status, usage, created, last login
- Respects active filters (exports filtered view)
- Large exports (>1000 users) stream to avoid timeout
- Filename includes timestamp (users_export_2025-11-01.csv)
- Download triggers automatically

---

## Dependencies & Risks

### Dependencies
- **ADMIN-001:** Admin Panel Foundation must be complete (RBAC, auth, layout)

### Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| User search slow with large dataset | Medium | Medium | Implement database indexes, consider Elasticsearch for >100k users |
| Impersonation security vulnerability | Low | High | Strict role checking, audit logging, time-limited tokens, clear UI warnings |
| Bulk operations timeout on large selections | Medium | Medium | Process in background job, add progress indicator, limit to 1000 users per batch |
| GDPR compliance gap in activity logs | Low | High | Ensure all user data access logged, add data export feature, document retention policy |

---

## Success Metrics
- User search returns results in <500ms for 10,000 users
- Support ticket resolution time reduced by 70%
- 100% of admin actions logged to audit trail
- Zero unauthorized access to user management (blocked by RBAC)
- User satisfaction with support quality increases by 20%

---

## Out of Scope (This Epic)
- Payment and subscription management (covered in ADMIN-004)
- Conversion job management (covered in ADMIN-003)
- Advanced analytics and reporting (covered in ADMIN-006)
- Email communication tools (future enhancement)
- Two-factor authentication management (future enhancement)

---

## Technical Notes

### API Response Format
```typescript
// GET /api/admin/users
{
  users: [
    {
      id: string,
      email: string,
      name: string,
      role: 'user' | 'support' | 'finance' | 'admin' | 'super_admin',
      plan: 'free' | 'starter' | 'pro' | 'enterprise',
      status: 'active' | 'suspended',
      conversions_used: number,
      conversions_limit: number,
      subscription_status: 'active' | 'cancelled' | 'expired' | null,
      last_login: string | null,
      created_at: string
    }
  ],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

### Search Implementation
```typescript
// Fuzzy search query (PostgreSQL example)
SELECT * FROM users
WHERE
  email ILIKE '%' || :search || '%' OR
  name ILIKE '%' || :search || '%' OR
  id::text = :search
ORDER BY created_at DESC
LIMIT :limit OFFSET :offset;
```

---

**Epic Owner:** Sarah (Product Owner)
**Created:** 2025-11-01
**Status:** Ready for Development
