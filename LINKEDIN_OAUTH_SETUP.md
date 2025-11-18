# LinkedIn OAuth Setup Guide

## Step 1: Create LinkedIn App

1. Go to https://www.linkedin.com/developers/apps
2. Click **"Create app"**
3. Fill in required fields:
   - **App name**: PDFLab
   - **LinkedIn Page**: Select your company page (or create one)
   - **App logo**: Upload your logo (optional)
   - **Legal agreement**: Check the box
4. Click **"Create app"**

## Step 2: Configure OAuth Settings

### Products Tab
1. Go to **"Products"** tab
2. Request access to:
   - **Sign In with LinkedIn using OpenID Connect** (required)
   - Click **"Request access"** and wait for approval (usually instant)

### Auth Tab
1. Go to **"Auth"** tab
2. Under **"OAuth 2.0 settings"**:
   - **Authorized redirect URLs for your app**:
     - Development: `http://localhost:3006/api/auth/linkedin/callback`
     - Production: `https://pdflab.pro/api/auth/linkedin/callback` (or your production domain)
3. Click **"Update"**

## Step 3: Get Credentials

1. Still in **"Auth"** tab, find:
   - **Client ID**: Copy this value
   - **Client Secret**: Click **"Show"** to reveal, then copy
2. Add to `backend/.env`:
   ```env
   LINKEDIN_CLIENT_ID=775bhr95laip55
   LINKEDIN_CLIENT_SECRET=WPL_AP1.Eijdc3NqrqYsnnvN.Qd9AkA==
   LINKEDIN_CALLBACK_URL=http://localhost:3006/api/auth/linkedin/callback
   LINKEDIN_CALLBACK_URL=https://pdflab.pro/api/auth/linkedin/callback
   ```

## Step 4: Test the Integration

1. Restart backend server
2. Go to login page
3. Click **"Continue with LinkedIn"**
4. Authorize the app
5. You should be redirected back and logged in

## Required Scopes

The following scopes are automatically requested:
- `openid` - Basic authentication
- `profile` - User's profile information
- `email` - User's email address

## Troubleshooting

### Error: "Invalid redirect_uri"
- Make sure the callback URL in .env matches exactly what's in LinkedIn app settings
- Check for trailing slashes (should NOT have trailing slash)

### Error: "Access denied"
- Make sure "Sign In with LinkedIn using OpenID Connect" product is approved
- Check that app is not in development mode restrictions

### Error: "No email found in LinkedIn profile"
- User may have hidden their email in privacy settings
- App requires email scope to be approved

## Production Deployment

For production (https://pdflab.pro):
1. Add production redirect URL: `https://pdflab.pro/api/auth/linkedin/callback`
2. Update `backend/.env` on server:
   ```env
   LINKEDIN_CALLBACK_URL=https://pdflab.pro/api/auth/linkedin/callback
   ```
3. Restart backend server
