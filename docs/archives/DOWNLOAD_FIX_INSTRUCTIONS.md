# Download Filename Fix - Testing Instructions

**Status**: ✅ Fix Applied - Ready for Testing
**Date**: 2025-11-01

---

## What Was Fixed

### Problem
Files were downloading with `.pdf` extension instead of the correct format (`.pptx`, `.docx`, `.xlsx`) even though the file content was correct.

### Root Cause
The frontend JavaScript couldn't read the `Content-Disposition` header from the backend because:
1. CORS wasn't exposing the header to JavaScript (`exposedHeaders` was missing)
2. Frontend was using the original PDF filename instead of reading from the header

### Solution
1. ✅ **Added CORS exposedHeaders** in `backend/src/server.ts:79`:
   ```typescript
   exposedHeaders: ['Content-Disposition', 'Content-Type']
   ```

2. ✅ **Updated frontend download logic** in `lib/api.ts:296-310`:
   ```typescript
   const contentDisposition = response.headers.get('Content-Disposition')
   let downloadFileName = originalFileName

   if (contentDisposition) {
     const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
     if (filenameMatch && filenameMatch[1]) {
       downloadFileName = filenameMatch[1]
       console.log('✅ Using filename from Content-Disposition:', downloadFileName)
     }
   }

   a.download = downloadFileName
   ```

3. ✅ **Backend restarted** with new CORS settings

---

## How to Test

### Step 1: Clear Browser Cache
**Important**: Your browser may have cached the old JavaScript code.

**Chrome/Edge**:
1. Press `Ctrl + Shift + Delete`
2. Select "Cached images and files"
3. Click "Clear data"

**Or use Hard Refresh**:
- Press `Ctrl + Shift + R` on the PDFLab page

### Step 2: Open Browser Console
1. Navigate to http://localhost:3000
2. Press `F12` to open Developer Tools
3. Click on the "Console" tab
4. Keep it open during testing

### Step 3: Convert and Download a PDF
1. **Login** with test@test.com / Test1234
2. **Upload** a PDF file (use `backend/test-sample.pdf` if needed)
3. **Select Format**: Choose PowerPoint, Word, or Excel
4. **Click "Convert"** and wait for completion
5. **Click "Download"** button

### Step 4: Check the Console Output
You should see ONE of these messages in the console:

#### ✅ Success Message (Expected)
```
✅ Using filename from Content-Disposition: converted-1762022573530.pptx
```
This means the fix is working! The file should download with `.pptx` extension.

#### ⚠️ Warning Message (Need to investigate)
```
⚠️ Content-Disposition found but no filename extracted: [header value]
```
This means the header exists but the regex didn't match.

#### ❌ Error Message (CORS issue)
```
❌ No Content-Disposition header found, using original filename: test-sample.pdf
```
This means CORS isn't exposing the header to JavaScript.

### Step 5: Verify the Downloaded File
1. **Check filename** in your Downloads folder
   - ✅ Correct: `converted-1762022573530.pptx` or similar with `.pptx`/`.docx`/`.xlsx`
   - ❌ Wrong: `test-sample.pdf`

2. **Open the file**
   - ✅ Should open in PowerPoint/Word/Excel without errors
   - ❌ If it says "corrupted" or tries to open in PDF reader, the filename is still wrong

---

## Troubleshooting

### Issue 1: Console Shows "❌ No Content-Disposition header found"
**Cause**: CORS isn't working properly

**Solution**:
```bash
# Restart backend container
docker-compose -f docker-compose.production.yml restart backend

# Wait 10 seconds for it to start
# Then try again
```

### Issue 2: Still Downloads as .pdf
**Cause**: Browser cache hasn't cleared or old code still running

**Solutions**:
1. **Hard refresh** the page: `Ctrl + Shift + R`
2. **Clear cache** completely (see Step 1 above)
3. **Restart Next.js frontend**:
   ```bash
   # Kill the existing process
   # Then restart:
   npm run dev
   ```

### Issue 3: Console Shows Correct Filename But File Still Wrong
**Cause**: Browser's download manager may be adding .pdf based on Content-Type

**Check**:
```bash
# Test the Content-Type header directly:
curl -I "http://localhost:3006/api/download/[JOB_ID]" \
  -H "Authorization: Bearer [TOKEN]" \
  | grep "Content-Type"
```

Expected:
- PPTX: `Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation`
- DOCX: `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- XLSX: `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

### Issue 4: Download Works But Wrong Extension
If console shows `✅ Using filename from Content-Disposition: converted-xxx.pptx` but file still downloads as `.pdf`:

**This is a browser bug**. Try:
1. Different browser (Firefox, Chrome, Edge)
2. Incognito/Private mode
3. Check browser's download settings

---

## Expected Behavior

### Before Fix ❌
```
User uploads: mydocument.pdf
Converts to: PPTX
Downloads as: mydocument.pdf
Opens in: PDF reader says "corrupted"
```

### After Fix ✅
```
User uploads: mydocument.pdf
Converts to: PPTX
Downloads as: converted-1762022573530.pptx
Opens in: PowerPoint works perfectly!
```

---

## Technical Details

### Files Modified
1. **backend/src/server.ts** (line 79):
   - Added `exposedHeaders: ['Content-Disposition', 'Content-Type']` to CORS config

2. **lib/api.ts** (lines 296-310):
   - Added logic to read Content-Disposition header
   - Extract filename using regex
   - Use extracted filename instead of original
   - Added console logging for debugging

### Why This Fix Works
1. Backend sends: `Content-Disposition: attachment; filename="converted-123.pptx"`
2. CORS now exposes this header to JavaScript
3. Frontend reads it with `response.headers.get('Content-Disposition')`
4. Regex extracts `converted-123.pptx`
5. Sets `<a download="converted-123.pptx">` which the browser respects

### CORS Configuration
```typescript
app.use(cors({
  origin: [callback function],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition', 'Content-Type']  // ← Added this
}))
```

---

## What to Report Back

After testing, please let me know:

1. **Console Output**: What message did you see?
   - ✅ "Using filename from Content-Disposition"
   - ⚠️ "Content-Disposition found but no filename"
   - ❌ "No Content-Disposition header found"

2. **Downloaded Filename**: What was the actual filename in Downloads?
   - Example: `converted-1762022573530.pptx` or `test-sample.pdf`

3. **File Opens**: Can you open the file in the correct application?
   - ✅ Opens in PowerPoint/Word/Excel
   - ❌ PDF reader says corrupted
   - ❌ File won't open

4. **Browser**: Which browser are you using?
   - Chrome, Firefox, Edge, Safari, etc.

---

## Next Steps If Still Not Working

If the console shows the correct filename but the download still has `.pdf`:

1. **Check browser extensions** - Some download managers override filenames
2. **Try incognito mode** - Eliminates extension interference
3. **Check browser console** for any additional errors
4. **Inspect Network tab**:
   - Click Network tab in DevTools
   - Download a file
   - Click the download request
   - Check "Response Headers" for `Content-Disposition`
   - Check "Headers" for `Access-Control-Expose-Headers`

---

## Success Criteria

The fix is working when:
- ✅ Console shows: "Using filename from Content-Disposition: converted-XXX.pptx"
- ✅ File downloads as: `converted-[timestamp].pptx` (or .docx, .xlsx)
- ✅ File opens correctly in PowerPoint/Word/Excel

---

**Status**: Ready for User Testing
**Expected Result**: Files should now download with correct extensions
**Time to Test**: ~2 minutes

Please test and report back with the console output and filename! 🚀
