# PDFLab User Management Guide

This guide explains how to manage users in PDFLab using the command-line interface (CLI).

## Overview

The `manage_users.py` script provides a complete user management system without needing to write SQL queries or use a database GUI. You can:

- **List** all users
- **Show** detailed user information
- **Create** new users
- **Delete** users
- **Verify** user emails manually
- **Change** user subscription plans
- **Reset** user passwords
- **Reset** monthly conversion quotas

---

## Prerequisites

Make sure you're in the backend-python directory and have the environment set up:

```bash
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab\backend-python
```

The script uses the existing database connection from your `.env` file.

---

## Commands

### 1. List All Users

Display a table of all users in the system.

```bash
poetry run python manage_users.py list
```

**Output Example:**
```
+-------------------------------------+-------------------------+--------+------------+---------------+--------------+------------+
| Email                               | Name                    | Plan   | Verified   | Conversions   | Sub Status   | Created    |
+=====================================+=========================+========+============+===============+==============+============+
| mmkela@gmail.com                    | Malibongwe Mkela        | pro    | Yes        | 0/999999      | N/A          | 2025-10-30 |
| test@example.com                    | Test User               | free   | No         | 0/3           | N/A          | 2025-10-30 |
+-------------------------------------+-------------------------+--------+------------+---------------+--------------+------------+

Total users: 2
```

---

### 2. Show User Details

View detailed information about a specific user.

```bash
poetry run python manage_users.py show <email>
```

**Example:**
```bash
poetry run python manage_users.py show mmkela@gmail.com
```

**Output:**
```
============================================================
USER DETAILS: mmkela@gmail.com
============================================================
ID:                    f71da158-b427-4951-8108-98c144ba5210
Name:                  Malibongwe Mkela
Email:                 mmkela@gmail.com
Email Verified:        Yes
Plan:                  pro
Conversions Used:      0
Conversions Limit:     999999
Subscription ID:       N/A
Subscription Status:   N/A
Subscription End:      N/A
Created At:            2025-10-30 12:42:06
Last Login:            2025-10-30 12:42:06
============================================================
```

---

### 3. Create New User

Create a new user account with email, password, and name.

```bash
poetry run python manage_users.py create <email> <password> <name>
```

**Example:**
```bash
poetry run python manage_users.py create admin@pdflab.com SecurePass123! "Admin User"
```

**Output:**
```
[SUCCESS] User created: admin@pdflab.com
  - ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
  - Plan: free
  - Email Verified: No (use 'verify' command to manually verify)
  - Verification Token: xyz123...
```

**Note:** New users start with:
- Plan: `free`
- Email Verified: `No`
- Conversions: 0/3

---

### 4. Delete User

Permanently delete a user from the system. **This action cannot be undone!**

```bash
poetry run python manage_users.py delete <email>
```

**Example:**
```bash
poetry run python manage_users.py delete test@example.com
```

**Output:**
```
[WARNING] You are about to delete user: test@example.com
  - Name: Test User
  - Plan: free
  - Created: 2025-10-30

Type 'DELETE' to confirm: DELETE

[SUCCESS] User deleted: test@example.com
```

---

### 5. Verify User Email

Manually mark a user's email as verified (bypasses email verification flow).

```bash
poetry run python manage_users.py verify <email>
```

**Example:**
```bash
poetry run python manage_users.py verify mmkela@gmail.com
```

**Output:**
```
[SUCCESS] Email verified for user: mmkela@gmail.com
```

---

### 6. Change User Plan

Change a user's subscription plan to a different tier.

```bash
poetry run python manage_users.py change-plan <email> <plan>
```

**Available Plans:**
- `free` - 3 conversions/month, 10MB file limit
- `starter` - 100 conversions/month, 25MB file limit
- `pro` - Unlimited conversions, 100MB file limit
- `enterprise` - Unlimited conversions, 500MB file limit

**Example:**
```bash
poetry run python manage_users.py change-plan mmkela@gmail.com pro
```

**Output:**
```
[SUCCESS] Plan changed for mmkela@gmail.com
  - Old Plan: free
  - New Plan: pro
  - New Limit: 999999 conversions/month
```

---

### 7. Reset User Password

Reset a user's password (useful if they're locked out).

```bash
poetry run python manage_users.py reset-password <email> <new_password>
```

**Example:**
```bash
poetry run python manage_users.py reset-password mmkela@gmail.com NewPassword123!
```

**Output:**
```
[SUCCESS] Password reset for user: mmkela@gmail.com
```

**Security Note:** Passwords are automatically hashed with bcrypt before storage.

---

### 8. Reset Conversion Quota

Reset a user's monthly conversion usage back to zero.

```bash
poetry run python manage_users.py reset-quota <email>
```

**Example:**
```bash
poetry run python manage_users.py reset-quota mmkela@gmail.com
```

**Output:**
```
[SUCCESS] Quota reset for user: mmkela@gmail.com
  - Old Usage: 3/3
  - New Usage: 0/3
```

---

## Common Use Cases

### Creating an Admin Account

1. Create the user:
```bash
poetry run python manage_users.py create admin@pdflab.com AdminPass123! "Admin User"
```

2. Verify their email:
```bash
poetry run python manage_users.py verify admin@pdflab.com
```

3. Upgrade to enterprise plan:
```bash
poetry run python manage_users.py change-plan admin@pdflab.com enterprise
```

---

### Upgrading a User's Plan

When a user subscribes to a paid plan:

```bash
poetry run python manage_users.py change-plan user@example.com pro
```

---

### Downgrading Expired Subscription

When a subscription expires:

```bash
poetry run python manage_users.py change-plan user@example.com free
```

**Note:** If the user has used more conversions than the free plan allows, their usage will be capped to the new limit.

---

### Cleaning Up Test Users

List all test users and delete them:

```bash
# List users to see who to delete
poetry run python manage_users.py list

# Delete test users
poetry run python manage_users.py delete payfast_test_1761847854@example.com
poetry run python manage_users.py delete test@example.com
```

---

### Resetting Monthly Quotas (Billing Cycle)

At the start of each billing cycle, reset all users:

```bash
# Get list of users first
poetry run python manage_users.py list

# Reset each user's quota
poetry run python manage_users.py reset-quota user1@example.com
poetry run python manage_users.py reset-quota user2@example.com
```

**Note:** For production, you should automate this with a scheduled task/cron job.

---

## Plan Comparison

| Plan       | Conversions/Month | Max File Size | Price      |
|------------|-------------------|---------------|------------|
| free       | 3                 | 10MB          | $0         |
| starter    | 100               | 25MB          | $9.99/mo   |
| pro        | Unlimited         | 100MB         | $29.99/mo  |
| enterprise | Unlimited         | 500MB         | $99.99/mo  |

---

## Error Handling

### User Not Found
```
[ERROR] User not found: nonexistent@example.com
```
**Solution:** Double-check the email address spelling.

---

### Invalid Plan
```
[ERROR] Invalid plan: premium
Valid plans: free, starter, pro, enterprise
```
**Solution:** Use one of the valid plan names (case-insensitive).

---

### User Already Exists
```
[ERROR] User already exists: existing@example.com
```
**Solution:** Use a different email or delete the existing user first.

---

## Security Best Practices

1. **Password Requirements:**
   - Minimum 8 characters
   - Include uppercase, lowercase, numbers, and special characters

2. **Delete Confirmation:**
   - User deletion requires typing "DELETE" to prevent accidents

3. **Email Verification:**
   - New users cannot login until email is verified
   - Use `verify` command for manual verification during testing

4. **Plan Changes:**
   - Downgrading doesn't delete data, only restricts access
   - Usage is capped when downgrading (e.g., 5/3 becomes 3/3)

---

## Troubleshooting

### Database Connection Error
```
[ERROR] Connection refused
```
**Solution:** Ensure MySQL container is running:
```bash
docker start pdflab-mysql
```

---

### Module Not Found Error
```
ModuleNotFoundError: No module named 'tabulate'
```
**Solution:** Install dependencies:
```bash
poetry install
```

---

### Permission Denied
```
[ERROR] Access denied for user 'pdflab'@'localhost'
```
**Solution:** Check `.env` file has correct database credentials:
```env
DB_USER=pdflab
DB_PASSWORD=***REMOVED***
DB_NAME=pdflab
```

---

## Advanced: Bulk Operations

For bulk operations, you can use shell loops:

**Verify All Unverified Users:**
```bash
poetry run python manage_users.py list | grep "No" | awk '{print $1}' | while read email; do
    poetry run python manage_users.py verify "$email"
done
```

**Upgrade All Free Users to Starter:**
```bash
poetry run python manage_users.py list | grep "free" | awk '{print $1}' | while read email; do
    poetry run python manage_users.py change-plan "$email" starter
done
```

---

## API Alternative

If you prefer API access, user management is also available via:

**GET /api/auth/profile** - Get current user (requires JWT)

Future endpoints (to be implemented):
- GET /api/admin/users - List all users (admin only)
- GET /api/admin/users/:id - Get user details (admin only)
- PUT /api/admin/users/:id - Update user (admin only)
- DELETE /api/admin/users/:id - Delete user (admin only)

---

## Support

For issues or feature requests, contact the development team or file an issue in the project repository.

---

**Last Updated:** 2025-10-30
**Version:** 2.0.1
