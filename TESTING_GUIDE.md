# Testing Guide - Admin System Page Enhancement

**Date**: November 17, 2025
**Status**: Backend Running ✅ | Frontend Ready ✅

---

## ✅ Current Status

- **Backend**: Running on http://localhost:3006 (port 3006)
- **Frontend**: Should be running on http://localhost:3000
- **New Endpoints**: 4 new APIs implemented
- **New UI**: Complete dashboard rewrite

---

## 🚀 Quick Start Testing

### **Step 1: Ensure Frontend is Running**

If your frontend isn't running yet:

```bash
# In a new terminal
npm run dev
```

You should see:
```
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000
```

### **Step 2: Login as Admin**

1. Go to: **http://localhost:3000/login**
2. Login with your admin credentials (e.g., `admin@pdflab.com`)
3. You should be redirected to dashboard

### **Step 3: Navigate to System Page**

Click on **Admin** → **System Health** in the navigation menu

OR go directly to: **http://localhost:3000/admin/system**

---

## 🧪 What to Test

### **1. Overall Status Banner** (Top of page)
- [ ] Shows green checkmark icon if healthy
- [ ] Displays "System Status: HEALTHY" in green
- [ ] Shows "X jobs in queue"
- [ ] Last updated timestamp visible

### **2. PDF Conversion Pipeline** (Visual flow)
Should show 4 stages with arrows:

```
Upload → Queue → Convert → Download
```

Check:
- [ ] Each stage has an icon (Upload, Clock, Cloud, Download)
- [ ] Each stage has colored border (green = healthy)
- [ ] Each stage shows status badge
- [ ] Each stage shows metric (ms, waiting count, success %)

### **3. Business Metrics Grid** (4 cards)

**Card 1: Active Users**
- [ ] Shows number (may be 0 if no recent activity)
- [ ] Says "Last 15 minutes"

**Card 2: Conversions Today**
- [ ] Shows number
- [ ] Shows % change vs yesterday (green up arrow or red down arrow)

**Card 3: Success Rate (1h)**
- [ ] Shows percentage (0-100%)
- [ ] Shows "X total jobs"

**Card 4: Avg Processing Time**
- [ ] Shows seconds
- [ ] Shows P95 time

### **4. Component Health Cards** (Left column)

Check all 4 cards:
- [ ] **CloudConvert API** - Shows success rate (24h)
- [ ] **Redis Queue** - Shows waiting/active counts
- [ ] **Database** - Shows connections
- [ ] **Storage** - Shows GB used

### **5. Environment Configuration** (Right column, top)

Should show validation results:
- [ ] Node Environment badge (production/development)
- [ ] CloudConvert Mode badge
- [ ] PayFast Mode badge
- [ ] CORS Valid badge (Yes/No)
- [ ] Database Host badge

**Expected for Development:**
- Node Environment: `development` (secondary badge)
- CloudConvert: `Sandbox` (green badge)
- PayFast: `sandbox` (secondary badge)
- CORS Valid: `Yes` (green badge)
- Database Host: `Localhost` (green badge for dev)

If you see red badges or "Configuration Issues" section, that means there's a mismatch.

### **6. Recent Errors** (Right column, bottom)

**If No Errors:**
- [ ] Shows green checkmark icon
- [ ] Says "No Recent Errors"
- [ ] Says "All systems operating normally"

**If Errors Exist:**
- [ ] Shows up to 10 error cards
- [ ] Each error has type badge (destructive red)
- [ ] Each error shows message
- [ ] Each error shows timestamp (e.g., "2 minutes ago")
- [ ] Each error shows user email or "Guest"

### **7. Diagnostic Tools** (Bottom)

Test each button:

**Test Conversion**
- [ ] Click button
- [ ] Should show alert with message
- [ ] (Note: Actual test not implemented yet, just placeholder)

**Clear Cache**
- [ ] Click button
- [ ] Confirm dialog appears
- [ ] If confirmed, shows "Cache cleared successfully"

**Cleanup Storage**
- [ ] Click button
- [ ] Confirm dialog appears
- [ ] If confirmed, shows stats (deleted jobs, files, space freed)

### **8. Auto-Refresh**

- [ ] Toggle "Auto-Refresh" button to OFF
- [ ] Notice "Last updated" timestamp stops updating
- [ ] Toggle back to ON
- [ ] Wait 30 seconds
- [ ] Timestamp should update automatically

### **9. Manual Refresh**

- [ ] Click "Refresh" button
- [ ] All data should reload
- [ ] Timestamp updates immediately

---

## 🔍 Browser Console Testing

Open browser console (F12) and check for:

**Successful API Calls:**
```
Status: 200 OK
api/admin/system/health
api/admin/system/flow-health
api/admin/system/business-metrics
api/admin/system/environment-config
api/admin/system/recent-errors
```

**No Errors:**
- No red error messages in console
- No "Failed to fetch" messages
- No CORS errors

---

## 🧪 API Endpoint Testing (Optional)

### **Method 1: Using Browser Console**

1. Go to http://localhost:3000/login and login
2. Open browser console (F12)
3. Get your auth token:
   ```javascript
   localStorage.getItem('authToken')
   ```
4. Copy the token
5. Test endpoint manually:
   ```javascript
   fetch('http://localhost:3006/api/admin/system/flow-health', {
     headers: { 'Authorization': 'Bearer YOUR_TOKEN_HERE' }
   })
   .then(r => r.json())
   .then(d => console.log(d))
   ```

### **Method 2: Using Test Script**

1. Get your auth token (step 3 above)
2. Run test script:
   ```bash
   node test-admin-system-endpoints.js "YOUR_TOKEN_HERE"
   ```

This will test all 5 endpoints and show responses.

---

## 📊 Expected Data Ranges

### **Development Environment (No Traffic)**
- **Active Users**: 0
- **Conversions Today**: 0
- **Success Rate**: 100% (or N/A if no jobs)
- **Recent Errors**: Empty list
- **Queue Waiting**: 0
- **All Components**: Healthy (green)

### **Production Environment (With Traffic)**
- **Active Users**: 1-100+
- **Conversions Today**: 10-1000+
- **Success Rate**: 95-100%
- **Recent Errors**: 0-10 errors
- **Queue Waiting**: 0-50 (healthy), 50-100 (warning), >100 (critical)

---

## 🐛 Troubleshooting

### **Issue: "Cannot reach backend"**
**Solution**:
```bash
cd backend
npm start
```
Check backend is running on http://localhost:3006

### **Issue: "Unauthorized" or 401 errors**
**Solution**:
1. Logout: http://localhost:3000/logout
2. Login again: http://localhost:3000/login
3. Make sure you're logged in as admin user

### **Issue: Page shows "Loading system health..." forever**
**Solution**:
1. Check browser console for errors (F12)
2. Verify backend is running
3. Check auth token exists: `localStorage.getItem('authToken')`
4. Try manual refresh

### **Issue: All metrics show 0**
**Solution**: This is normal if you have no data yet. To generate test data:
1. Upload a test PDF at http://localhost:3000
2. Run a conversion
3. Refresh admin/system page

### **Issue: Environment validation shows red badges**
**Solution**:
- This is expected in development
- Red badges in dev are OK (localhost, sandbox mode)
- Only worry if you see red badges in production

---

## ✅ Success Criteria

Page is working correctly if:

- [ ] All 5 API calls succeed (200 OK)
- [ ] Visual pipeline renders with 4 stages
- [ ] Business metrics cards show numbers (even if 0)
- [ ] Environment config shows your current setup
- [ ] Recent errors section renders (empty or with data)
- [ ] Component health cards show metrics
- [ ] Auto-refresh works (timestamp updates every 30s)
- [ ] Manual refresh works
- [ ] No console errors

---

## 📸 Screenshot Checklist

Take screenshots of:
1. Full page view (scroll to capture all sections)
2. Visual pipeline (zoomed in)
3. Business metrics grid
4. Environment configuration card
5. Recent errors (if any exist)
6. Browser console showing 200 OK for all API calls

---

## 🎯 Next Steps After Testing

### **If Everything Works:**
1. Test on production (deploy first)
2. Add more diagnostic tools (test CloudConvert, test PayFast)
3. Add historical charts for metrics
4. Document the new features

### **If Issues Found:**
1. Note the specific error message
2. Check browser console for details
3. Check backend logs for errors
4. Share the error with Claude for debugging

---

## 📞 Support

If you encounter issues:

1. **Check backend logs**: Look at terminal where `npm start` is running
2. **Check frontend logs**: Browser console (F12)
3. **Verify endpoints**: Use test script or browser console
4. **Test individual APIs**: Use curl or Postman

**Common Log Locations:**
- Backend: Terminal output where `npm start` runs
- Frontend: Browser console (F12)
- Network requests: Browser DevTools → Network tab

---

**Ready to test!** 🚀

Start by going to: **http://localhost:3000/admin/system**
