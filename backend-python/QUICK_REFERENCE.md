# PDFLab User Management - Quick Reference

## Quick Commands

```bash
# Navigate to backend directory
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab\backend-python

# List all users
poetry run python manage_users.py list

# Show user details
poetry run python manage_users.py show <email>

# Create user
poetry run python manage_users.py create <email> <password> <name>

# Delete user (requires typing "DELETE")
poetry run python manage_users.py delete <email>

# Verify email
poetry run python manage_users.py verify <email>

# Change plan (free|starter|pro|enterprise)
poetry run python manage_users.py change-plan <email> <plan>

# Reset password
poetry run python manage_users.py reset-password <email> <new_password>

# Reset quota
poetry run python manage_users.py reset-quota <email>
```

## Common Tasks

### Create Admin User
```bash
poetry run python manage_users.py create admin@pdflab.com SecurePass123! "Admin User"
poetry run python manage_users.py verify admin@pdflab.com
poetry run python manage_users.py change-plan admin@pdflab.com enterprise
```

### Upgrade User to Pro
```bash
poetry run python manage_users.py change-plan user@example.com pro
```

### Reset User's Monthly Usage
```bash
poetry run python manage_users.py reset-quota user@example.com
```

### View All Users
```bash
poetry run python manage_users.py list
```

## Plan Limits

| Plan       | Conversions | File Size |
|------------|-------------|-----------|
| free       | 3/month     | 10MB      |
| starter    | 100/month   | 25MB      |
| pro        | Unlimited   | 100MB     |
| enterprise | Unlimited   | 500MB     |

## API Endpoints

**User Management (Auth):**
- `GET /api/auth/` - Authentication API info
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get profile (requires JWT)
- `POST /api/auth/verify-email` - Verify email with token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

**View API Docs:**
- http://localhost:3007/docs (Swagger UI)
- http://localhost:3007/api/auth/ (Auth endpoints)

## File Locations

- **CLI Tool**: `backend-python/manage_users.py`
- **User Guide**: `backend-python/USER_MANAGEMENT_GUIDE.md`
- **User Model**: `backend-python/app/models/user.py`
- **Auth API**: `backend-python/app/routers/auth.py`

## Database

**Direct SQL (if needed):**
```sql
-- View all users
SELECT email, name, plan, email_verified, conversions_used, conversions_limit
FROM users;

-- Change user plan
UPDATE users
SET plan = 'pro', conversions_limit = 999999
WHERE email = 'user@example.com';

-- Verify user email
UPDATE users
SET email_verified = 1
WHERE email = 'user@example.com';
```

**MySQL Access:**
```bash
docker exec -it pdflab-mysql mysql -u pdflab -p***REMOVED*** pdflab
```

## Troubleshooting

**Server not responding?**
```bash
# Check backend is running
curl http://localhost:3007/

# Restart backend
cd backend-python
poetry run uvicorn app.main:app --host 0.0.0.0 --port 3007 --reload
```

**Database connection error?**
```bash
# Start MySQL container
docker start pdflab-mysql

# Check if running
docker ps | grep pdflab-mysql
```

## Support

For detailed instructions, see: [USER_MANAGEMENT_GUIDE.md](USER_MANAGEMENT_GUIDE.md)
