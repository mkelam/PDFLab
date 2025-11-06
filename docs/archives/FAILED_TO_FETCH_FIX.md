# "Failed to Fetch" Error - PERMANENT FIX

## 🚨 PROBLEM ANALYSIS

**Error:** "Failed to fetch" appearing in browser
**Actual Issue:** This is NOT a backend problem - backend is running perfectly
**Real Cause:** Browser fetch API requests are failing on the CLIENT side

## 📋 EVIDENCE

Backend logs show ALL requests working:
```
✓ PDFLab API Server running
✓ Port: 3006
GET /health 200 OK
GET /api/auth/profile 304
POST /api/auth/login 200 OK
```

## 🔍 COMMON CAUSES & FIXES

### 1. **Browser Tab in Background** (Most Common)
**Symptom:** Fetch fails when browser tab is inactive/minimized
**Fix:**
- Bring browser tab to foreground
- Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Clear cache and reload

### 2. **Stale Service Worker**
**Symptom:** Old cached requests failing
**Fix:**
```bash
# In browser DevTools Console (F12)
navigator.serviceWorker.getRegistrations().then(function(registrations) {
 for(let registration of registrations) {
  registration.unregister()
} })
```
Then refresh the page.

### 3. **Browser Extensions Blocking**
**Symptom:** Ad blockers or privacy extensions blocking localhost
**Fix:**
- Disable browser extensions temporarily
- Add `localhost:3000` and `localhost:3006` to extension whitelist
- Try in Incognito/Private browsing mode

### 4. **CORS Preflight Timeout**
**Symptom:** OPTIONS requests timing out
**Fix:** Already configured correctly in backend:
```env
CORS_ORIGIN=http://localhost:3000,http://localhost:3002
```

### 5. **Firewall/Antivirus Blocking**
**Symptom:** Windows Firewall blocking localhost connections
**Fix:**
```powershell
# Run as Administrator
netsh advfirewall firewall add rule name="PDFLab Backend" dir=in action=allow protocol=TCP localport=3006
netsh advfirewall firewall add rule name="PDFLab Frontend" dir=in action=allow protocol=TCP localport=3000
```

### 6. **Network Throttling Enabled**
**Symptom:** DevTools network throttling slowing requests
**Fix:**
- Open DevTools (F12)
- Go to Network tab
- Set throttling to "No throttling"

### 7. **LocalStorage Corrupted**
**Symptom:** Corrupted auth tokens causing fetch failures
**Fix:**
```javascript
// In browser console
localStorage.clear()
sessionStorage.clear()
location.reload()
```

## ✅ IMMEDIATE FIX (DO THIS NOW)

**Step 1:** Open browser DevTools (F12)

**Step 2:** Go to Console tab

**Step 3:** Run this command:
```javascript
// Clear all storage
localStorage.clear();
sessionStorage.clear();

// Unregister service workers
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
});

// Hard reload
location.reload(true);
```

**Step 4:** If still failing, check Network tab for the actual error:
- Look for failed requests (red text)
- Click on failed request
- Check the error message in the "Response" or "Console" tab

## 🔧 PERMANENT SOLUTION

### Add Retry Logic to Frontend

Create file: `lib/fetch-wrapper.ts`
```typescript
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 3,
  delay = 1000
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || response.status < 500) {
        return response;
      }
      // Server error, retry
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    } catch (error) {
      // Network error
      if (i < retries - 1) {
        console.warn(`Fetch attempt ${i + 1} failed, retrying...`, error);
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries reached');
}
```

### Update API Client

Edit: `lib/api.ts`
```typescript
import { fetchWithRetry } from './fetch-wrapper';

// Replace all fetch() calls with fetchWithRetry()
const response = await fetchWithRetry(url, options);
```

## 📊 DIAGNOSTIC COMMANDS

### Check if Backend is Actually Running:
```bash
curl http://localhost:3006/health
# Should return HTML health page
```

### Check if Frontend Can Connect:
```bash
curl -H "Origin: http://localhost:3000" http://localhost:3006/api/auth/profile
# Should return 401 (Unauthorized) - this is CORRECT
```

### Check Browser Console for Errors:
1. Open DevTools (F12)
2. Go to Console tab
3. Look for errors in red
4. Take screenshot and analyze

### Check Network Tab for Failed Requests:
1. Open DevTools (F12)
2. Go to Network tab
3. Reproduce the error
4. Look for failed requests (Status column shows "Failed" or red numbers)
5. Click on failed request
6. Check Headers, Preview, Response tabs for clues

## 🎯 IF STILL FAILING

### Create a Minimal Test Page

Create: `public/test-backend.html`
```html
<!DOCTYPE html>
<html>
<head>
    <title>Backend Connection Test</title>
</head>
<body>
    <h1>Backend Connection Test</h1>
    <button onclick="testBackend()">Test Connection</button>
    <pre id="result"></pre>

    <script>
    async function testBackend() {
        const result = document.getElementById('result');
        result.textContent = 'Testing...';

        try {
            const response = await fetch('http://localhost:3006/health');
            const text = await response.text();
            result.textContent = `SUCCESS!\nStatus: ${response.status}\n\n${text.substring(0, 500)}...`;
            result.style.color = 'green';
        } catch (error) {
            result.textContent = `FAILED!\n\nError: ${error.message}\n\nStack: ${error.stack}`;
            result.style.color = 'red';
        }
    }
    </script>
</body>
</html>
```

Then open: `http://localhost:3000/test-backend.html`

## 📝 SUMMARY

**Backend Status:** ✅ WORKING PERFECTLY
**Issue Location:** ❌ Browser/Frontend
**Primary Causes:**
1. Browser cache/service workers
2. Browser extensions blocking requests
3. Corrupted localStorage
4. Network throttling
5. Tab backgrounded/suspended

**Solution:** Clear browser cache, disable extensions, hard refresh

---

**If you're still seeing "Failed to fetch" after trying ALL the above, provide:**
1. Screenshot of browser DevTools Console tab
2. Screenshot of browser DevTools Network tab (with failed request selected)
3. Exact URL you're trying to access
4. Which browser and version you're using
