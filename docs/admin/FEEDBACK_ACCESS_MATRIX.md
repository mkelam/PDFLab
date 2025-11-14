# Feedback System Access Control Matrix

**Last Updated**: November 12, 2025
**Feature**: Feedback Management System
**Implementation**: [backend/src/middleware/admin.middleware.ts](../../backend/src/middleware/admin.middleware.ts)

---

## Overview

The PDFLab feedback system uses role-based access control (RBAC) to ensure that only authorized admin users can view and manage customer feedback. This document outlines the access permissions for each admin role.

---

## Admin Roles Hierarchy

| Role | Level | Description |
|------|-------|-------------|
| **Super Admin** | 4 | Full system access, all permissions |
| **Admin** | 3 | Full admin panel access, can delete data |
| **Support** | 2 | Customer-facing role, can manage feedback |
| **Finance** | 2 | Payment and billing focused, no feedback access |
| **User** | 1 | Regular users, no admin access |

---

## Feedback Permissions Matrix

| Permission | Support | Finance | Admin | Super Admin |
|------------|---------|---------|-------|-------------|
| **View Feedback** (`feedback.view`) | ✅ | ❌ | ✅ | ✅ |
| **Manage Feedback** (`feedback.manage`) | ✅ | ❌ | ✅ | ✅ |
| **Delete Feedback** (`feedback.delete`) | ❌ | ❌ | ✅ | ✅ |
| **Access Admin Panel** (`admin.access`) | ✅ | ✅ | ✅ | ✅ |

---

## Detailed Permission Definitions

### 1. View Feedback (`feedback.view`)

**Who Has Access**: Support, Admin, Super Admin

**What They Can Do**:
- Access feedback list at `/admin/feedback`
- View individual feedback details
- See feedback statistics (total, by status, by type)
- Filter and search feedback entries
- View user information for authenticated feedback
- See page URLs and user agent data

**API Endpoints**:
- `GET /api/admin/feedback` - List all feedback (paginated)
- `GET /api/admin/feedback/stats` - Get feedback statistics
- `GET /api/admin/feedback/:id` - Get single feedback details

**Code Reference**:
```typescript
// backend/src/middleware/admin.middleware.ts:19
'feedback.view': [UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN]
```

---

### 2. Manage Feedback (`feedback.manage`)

**Who Has Access**: Support, Admin, Super Admin

**What They Can Do**:
- Update feedback status (new → in_progress → resolved → dismissed)
- Reply to feedback (email sent to user if provided)
- Add internal notes
- Assign feedback to team members
- Mark feedback as resolved

**API Endpoints**:
- `PATCH /api/admin/feedback/:id/status` - Update feedback status
- `POST /api/admin/feedback/:id/reply` - Send reply to user

**Code Reference**:
```typescript
// backend/src/middleware/admin.middleware.ts:20
'feedback.manage': [UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN]
```

**Example Usage**:
```typescript
// Update status
PATCH /api/admin/feedback/abc-123/status
{
  "status": "resolved"
}

// Send reply
POST /api/admin/feedback/abc-123/reply
{
  "message": "Thank you for your feedback! We've addressed this issue in our latest update."
}
```

---

### 3. Delete Feedback (`feedback.delete`)

**Who Has Access**: Admin, Super Admin

**What They Can Do**:
- Permanently delete feedback entries
- Remove spam or inappropriate feedback
- Clean up test feedback

**API Endpoints**:
- `DELETE /api/admin/feedback/:id` - Delete feedback entry

**Code Reference**:
```typescript
// backend/src/middleware/admin.middleware.ts:21
'feedback.delete': [UserRole.ADMIN, UserRole.SUPER_ADMIN]
```

**Warning**:
- Deletion is permanent and cannot be undone
- Only use for spam, test data, or inappropriate content
- Consider marking as "dismissed" instead of deleting for audit purposes

---

## Why Finance Doesn't Have Feedback Access

The Finance role is designed specifically for payment and billing management:
- **Finance Permissions**: `payments.view`, `payments.manage`
- **No Feedback Access**: Keeps feedback management separate from financial operations
- **Security**: Limits access to customer feedback to customer-facing teams only

If a Finance team member needs to view feedback, they should be assigned the **Support** or **Admin** role instead.

---

## Access Control Implementation

### Route Protection

All feedback admin routes are protected with the `requirePermission` middleware:

```typescript
// backend/src/routes/feedback.routes.ts
router.get('/admin/feedback',
  requireAuth,                           // Must be logged in
  requirePermission('feedback.view'),    // Must have view permission
  getAllFeedback
)

router.patch('/admin/feedback/:id/status',
  requireAuth,
  requirePermission('feedback.manage'),  // Must have manage permission
  updateFeedbackStatus
)

router.delete('/admin/feedback/:id',
  requireAuth,
  requirePermission('feedback.delete'),  // Must have delete permission
  deleteFeedback
)
```

### Frontend Access Control

The admin feedback page ([app/admin/feedback/page.tsx](../../app/admin/feedback/page.tsx)) uses the `AdminLayout` component which:
1. Checks if user is authenticated
2. Verifies user has an admin role
3. Redirects non-admin users to login page
4. Shows 403 error if user lacks required permissions

---

## Testing Access Control

### Test Support Role Access

```bash
# 1. Create test support user
curl -X POST http://localhost:3006/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"support@pdflab.com","password":"SupportPass123!","name":"Support User"}'

# 2. Upgrade to support role (requires database update)
docker exec pdflab-mysql mysql -updflab -p***REMOVED*** pdflab \
  -e "UPDATE users SET role = 'support' WHERE email = 'support@pdflab.com';"

# 3. Login and get token
curl -X POST http://localhost:3006/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"support@pdflab.com","password":"SupportPass123!"}'

# 4. Test feedback access (should work)
curl -X GET http://localhost:3006/api/admin/feedback \
  -H "Authorization: Bearer <TOKEN>"

# 5. Test delete (should fail - 403 Forbidden)
curl -X DELETE http://localhost:3006/api/admin/feedback/<ID> \
  -H "Authorization: Bearer <TOKEN>"
```

### Expected Results

| Role | View Feedback | Manage Feedback | Delete Feedback |
|------|---------------|-----------------|-----------------|
| Support | ✅ 200 OK | ✅ 200 OK | ❌ 403 Forbidden |
| Finance | ❌ 403 Forbidden | ❌ 403 Forbidden | ❌ 403 Forbidden |
| Admin | ✅ 200 OK | ✅ 200 OK | ✅ 200 OK |
| Super Admin | ✅ 200 OK | ✅ 200 OK | ✅ 200 OK |

---

## Common Issues & Troubleshooting

### Issue 1: "Insufficient permissions" Error

**Symptom**: User gets 403 error when accessing feedback

**Causes**:
1. User has `finance` role instead of `support`/`admin`
2. User is regular `user` role, not admin
3. Permissions not loaded correctly (server needs restart)

**Solution**:
```sql
-- Check user's current role
SELECT id, email, name, role FROM users WHERE email = 'user@example.com';

-- Update to support role
UPDATE users SET role = 'support' WHERE email = 'user@example.com';

-- Or update to admin role
UPDATE users SET role = 'admin' WHERE email = 'user@example.com';
```

### Issue 2: Support User Can't Reply to Feedback

**Symptom**: Support user gets error when trying to send reply

**Check**: Verify they have `feedback.manage` permission

**Verification**:
```typescript
// This should return true for support users
import { hasPermission } from './middleware/admin.middleware'
hasPermission(user, 'feedback.manage')
```

### Issue 3: Admin Panel Shows "Loading..." Forever

**Symptom**: Feedback page loads but shows loading state indefinitely

**Causes**:
1. Backend permission middleware returning errors
2. User not logged in
3. Token expired

**Solution**:
1. Check browser console for API errors
2. Check backend logs: `docker logs pdflab-backend-prod`
3. Verify token in localStorage
4. Try logging out and back in

---

## Modifying Permissions

To change which roles have access to feedback:

1. **Edit the permissions file**:
   ```typescript
   // backend/src/middleware/admin.middleware.ts
   export const PERMISSIONS = {
     // ... other permissions
     'feedback.view': [UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN],
     'feedback.manage': [UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN],
     'feedback.delete': [UserRole.ADMIN, UserRole.SUPER_ADMIN]
   }
   ```

2. **Example: Give Finance access to view feedback**:
   ```typescript
   'feedback.view': [UserRole.SUPPORT, UserRole.FINANCE, UserRole.ADMIN, UserRole.SUPER_ADMIN],
   ```

3. **Restart backend**:
   ```bash
   cd backend
   npm run dev
   ```

4. **Test the changes** with a finance role user

---

## Security Best Practices

1. **Principle of Least Privilege**: Only grant permissions necessary for job function
2. **Support Role**: Ideal for customer service team - can help but can't delete
3. **Admin Role**: For team leads who need full feedback management
4. **Audit Logging**: Consider adding audit trail for feedback deletions
5. **Regular Review**: Periodically review user roles and remove unnecessary admin access

---

## Related Documentation

- [Admin Middleware Implementation](../../backend/src/middleware/admin.middleware.ts)
- [Feedback Routes](../../backend/src/routes/feedback.routes.ts)
- [Admin Panel Setup](ADMIN_PANEL_SETUP.md)
- [User Role Management](USER_ROLE_MANAGEMENT.md)

---

## Summary

✅ **Support, Admin, and Super Admin** can view and manage feedback
✅ **Admin and Super Admin** can delete feedback
❌ **Finance** role has no feedback access (by design)
✅ **Role-based permissions** enforced at API and frontend levels
✅ **Comprehensive testing** ensures proper access control

The feedback system is properly configured to allow all admin-level users (except Finance) to access and manage customer feedback while maintaining appropriate access restrictions.

---

**Last Reviewed**: November 12, 2025
**Status**: ✅ Production Ready
**Next Review**: December 2025
