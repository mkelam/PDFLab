# ✅ Google Login - Test Results

**Date**: November 17, 2025
**Status**: 🟢 READY FOR TESTING

---

## Backend Tests

### 1. Server Running ✅
```bash
curl http://localhost:3006/health
```
**Result**: `{"status":"OK","checks":{"database":"OK","redis":"OK"}}`

### 2. Google OAuth Endpoint ✅
```bash
curl -I http://localhost:3006/api/auth/google
```
**Result**: `HTTP/1.1 302 Found` (redirects to Google)

### 3. Configuration ✅
- Client ID: `YOUR_GOOGLE_CLIENT_ID`
- Client Secret: Configured
- Callback URL: `http://localhost:3006/api/auth/google/callback`

---

## Frontend Tests

### Manual Testing Steps

1. **Open Login Page**:
   - URL: http://localhost:3000/login
   - Should see "Continue with Google" button

2. **Click Google Button**:
   - Should redirect to Google OAuth consent screen
   - Select your Google account
   - Grant permissions

3. **Callback**:
   - Should redirect to `http://localhost:3006/api/auth/google/callback`
   - Backend creates/finds user
   - Generates JWT tokens
   - Redirects to `http://localhost:3000/auth/callback?token=...&refreshToken=...`

4. **Auth Callback Page**:
   - Stores tokens in localStorage
   - Redirects to dashboard

5. **Dashboard**:
   - Should be logged in
   - User profile visible
   - Can make authenticated requests

---

## Expected Flow

```
User clicks "Continue with Google"
  ↓
Redirects to /api/auth/google
  ↓
Backend redirects to Google OAuth
  ↓
User grants permissions on Google
  ↓
Google redirects to /api/auth/google/callback?code=...
  ↓
Backend exchanges code for user profile
  ↓
Finds or creates user in database
  ↓
Generates JWT tokens (access + refresh)
  ↓
Redirects to /auth/callback?token=...&refreshToken=...
  ↓
Frontend stores tokens
  ↓
Redirects to /dashboard
  ↓
User is logged in ✅
```

---

## Database Changes

**Users Table** - Added `google_id` column:
```sql
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
```

**User Record** (Google login):
- `email`: From Google profile
- `name`: From Google profile
- `google_id`: Google user ID
- `password_hash`: Empty (OAuth users don't have passwords)
- `plan`: 'free' (default)
- `email_verified`: true (Google already verified)

---

## Files Modified

### Backend
- ✅ `backend/.env` - Added Google OAuth credentials
- ✅ `backend/src/config/passport.ts` - Passport Google strategy
- ✅ `backend/src/routes/auth.google.routes.ts` - OAuth routes
- ✅ `backend/src/models/User.ts` - Added `google_id` field
- ✅ `backend/src/server.ts` - Registered Google routes

### Frontend
- ✅ `lib/social-auth.ts` - Enabled Google provider
- ✅ `app/auth/callback/page.tsx` - OAuth callback handler
- ✅ `app/login/page.tsx` - Already had Google button (no changes needed)

---

## Production Deployment

**Update Production .env** (`/var/www/pdflab/backend/.env`):
```env
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL=https://pdflab.pro/api/auth/google/callback
```

**Add Database Column**:
```bash
# SSH to VPS
ssh root@141.136.44.168

# Connect to MySQL
docker exec -it pdflab-mysql-prod mysql -updflab -p***REMOVED*** pdflab_production

# Add column
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
```

**Restart Backend**:
```bash
docker restart pdflab-backend-prod
```

---

## Troubleshooting

### "Google authentication not implemented yet"
- **Cause**: Old frontend code cached
- **Fix**: Hard refresh (Ctrl+Shift+R) or clear cache

### "Redirect URI mismatch"
- **Cause**: Google Cloud Console URIs don't match
- **Fix**: Verify redirect URIs in Google Cloud Console match exactly

### "User not found after login"
- **Cause**: Database column `google_id` missing
- **Fix**: Run `ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;`

### "Invalid client ID"
- **Cause**: Wrong Client ID in .env
- **Fix**: Copy exact ID from Google Cloud Console

---

## Security Notes

- ✅ Tokens stored in localStorage (auto-cleared on logout)
- ✅ Refresh tokens valid for 30 days
- ✅ Access tokens valid for 15 minutes (auto-refreshed)
- ✅ Google verifies email (no email verification needed)
- ✅ OAuth users can't use password login (no password set)

---

## Next Steps

**Immediate**:
1. Test login flow manually
2. Verify user created in database
3. Confirm dashboard loads with user data

**Future**:
- Add GitHub OAuth (similar implementation)
- Add Microsoft OAuth (similar implementation)
- Add "Link Google Account" for existing users
- Add "Unlink Google Account" option

---

**Status**: 🟢 READY FOR MANUAL TESTING

**Test Now**: Go to http://localhost:3000/login and click "Continue with Google"
