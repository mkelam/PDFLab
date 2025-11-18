# Google OAuth Login Setup Guide

## Step 1: Create Google OAuth Credentials

1. **Go to**: https://console.cloud.google.com/apis/credentials
2. **Create Project** (if needed): "PDFLab"
3. **Configure OAuth Consent Screen**:
   - User Type: External
   - App name: PDFLab
   - User support email: support@pdflab.pro
   - Developer email: mmkela@gmail.com
4. **Create Credentials**:
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: Web application
   - Name: PDFLab OAuth
   - Authorized redirect URIs:
     - `http://localhost:3006/api/auth/google/callback` (development)
     - `https://pdflab.pro/api/auth/google/callback` (production)
5. **Copy**:
   - Client ID: `YOUR_CLIENT_ID`
   - Client Secret: `YOUR_CLIENT_SECRET`

## Step 2: Add to .env

**Backend** (`backend/.env`):
```env
# Google OAuth
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
GOOGLE_CALLBACK_URL=http://localhost:3006/api/auth/google/callback
```

**Production** (`/var/www/pdflab/backend/.env`):
```env
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
GOOGLE_CALLBACK_URL=https://pdflab.pro/api/auth/google/callback
```

## Step 3: Restart Backend

```bash
# Development
cd backend
npm run dev

# Production
docker restart pdflab-backend-prod
```

## Step 4: Test

**Development**: Visit http://localhost:3000/login and click "Sign in with Google"

**Production**: Visit https://pdflab.pro/login and click "Sign in with Google"

Done.
