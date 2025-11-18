# OCR Fix - Quick Testing Guide

**Date**: November 18, 2025
**Purpose**: Verify OCR is working correctly after fix

---

## Quick Start

### 1. Restart Backend (REQUIRED)

The backend needs to be restarted to load the new code:

```bash
# Option A: If running via npm run dev
# Press Ctrl+C in terminal to stop
cd backend
npm run dev

# Option B: If running via PM2
pm2 restart pdflab-backend

# Option C: If running via Docker
docker-compose restart backend
```

---

### 2. Get Test Files

You need these test files:

**Option A: Create Test Files**
- Open PowerPoint, create a slide with text
- Save as PDF ("scanned" simulation)
- Take a photo of a printed document
- Convert photo to PDF

**Option B: Download Test Files**
- Google "scanned PDF sample"
- Download any scanned document PDF
- Use existing PDF with text

---

### 3. Test Conversion

**Via Frontend** (Easiest):
1. Open http://localhost:3000
2. Login (or signup)
3. Upload your scanned PDF
4. Select "PowerPoint (PPTX)"
5. Click "Convert"
6. Wait for conversion (~20-30 seconds)
7. Download converted file
8. **Open in PowerPoint**
9. **Try to select the text**
10. ✅ **Success** = Text is selectable!

**Via API** (Advanced):
```bash
# 1. Login to get token
curl -X POST http://localhost:3006/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@pdflab.test","password":"TestPass123!"}'

# Copy the token from response

# 2. Upload and convert
curl -X POST http://localhost:3006/api/upload \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -F "file=@/path/to/scanned.pdf" \
  -F "conversion_type=pdf_to_pptx"

# Copy the job_id from response

# 3. Check status
curl http://localhost:3006/api/status/<JOB_ID> \
  -H "Authorization: Bearer <YOUR_TOKEN>"

# 4. Download when status=completed
curl http://localhost:3006/api/download/<JOB_ID> \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -o converted.pptx
```

---

## What to Check

### ✅ Success Indicators

1. **Backend Console** shows:
   ```
   CloudConvert job created: <id>
   File uploaded to CloudConvert: <path>
   CloudConvert job completed: <id>
   Converted file downloaded: <path>
   ```

2. **Open Converted File** in PowerPoint/Word:
   - Click on text
   - Text cursor appears ✅
   - Text can be selected ✅
   - Text can be edited ✅
   - Text can be copied ✅

3. **Processing Time**:
   - Takes longer than before (20-60 seconds) ✅
   - Backend logs show job completion ✅

---

### ❌ Failure Indicators

1. **Cannot Select Text**:
   - Clicking on text does nothing
   - Text is actually an image
   - 🚨 **OCR NOT WORKING**

2. **Error Messages**:
   ```
   CloudConvert conversion error: ...
   OCR task failed: ...
   ```

3. **Very Fast Conversion** (<5 seconds):
   - 🚨 **OCR might be skipped**

---

## Quick Test Checklist

- [ ] Backend restarted
- [ ] Test file ready (scanned PDF)
- [ ] Upload test file
- [ ] Select format (PPTX/DOCX/XLSX)
- [ ] Click convert
- [ ] Wait for completion (~20-60s)
- [ ] Download converted file
- [ ] Open in PowerPoint/Word/Excel
- [ ] Try to select text
- [ ] ✅ **SUCCESS**: Text is editable
- [ ] ❌ **FAIL**: Text is still image

---

## Expected Results by Format

### PDF → PPTX
- ✅ Slides have editable text
- ✅ Layout mostly preserved
- ⚠️ Some formatting may change

### PDF → DOCX
- ✅ Document has editable text
- ✅ Paragraphs separated correctly
- ⚠️ Some formatting may change

### PDF → XLSX
- ✅ Tables have editable data
- ✅ Cells contain text (not images)
- ⚠️ Only works if PDF has tables

---

## Troubleshooting

### Problem 1: "Text is still images"

**Check**:
1. Backend console for OCR task
2. CloudConvert job ID in logs
3. API_KEY is correct

**Solution**:
- Verify backend restarted
- Check CloudConvert credits
- Try different PDF

---

### Problem 2: "Conversion fails"

**Error**: CloudConvert API error

**Check**:
1. CloudConvert API key valid
2. CloudConvert credits available
3. PDF file is valid

**Solution**:
```bash
# Check credits
curl -H "Authorization: Bearer <CLOUDCONVERT_API_KEY>" \
  https://api.cloudconvert.com/v2/users/me
```

---

### Problem 3: "Very slow (>2 minutes)"

**Expected**: OCR adds 5-10 seconds per page

**If 10-page PDF takes >2 minutes**:
- ✅ Normal (OCR is working)
- Check CloudConvert status
- Consider smaller test file

---

### Problem 4: "Cannot find converted file"

**Check**:
1. Job status shows "completed"
2. Download URL exists
3. File actually downloaded

**Solution**:
- Check backend `storage/` folder
- Verify job_id is correct
- Check browser downloads

---

## Backend Logs to Monitor

**Good Logs** (OCR working):
```
CloudConvert job created: abc123
File uploaded to CloudConvert: /path/to/file.pdf
CloudConvert job completed: abc123
Converted file downloaded: /path/to/output.pptx
```

**Bad Logs** (OCR failing):
```
CloudConvert conversion error: OCR task failed
Error: Invalid language code
CloudConvert API error: ...
```

---

## Credit Usage Check

After testing, verify credit usage:

```bash
# Before testing
curl -H "Authorization: Bearer <API_KEY>" \
  https://api.cloudconvert.com/v2/users/me \
  | grep credits

# Note the credit count

# After 5 conversions (1-page PDFs)
# Expected: 10-15 credits used

# After 5 conversions (10-page PDFs)
# Expected: 55-105 credits used
```

---

## Quick Success Test

**Fastest way to verify OCR is working**:

1. Find any scanned PDF (or photo converted to PDF)
2. Upload to PDFLab
3. Convert to PPTX
4. Download
5. Open in PowerPoint
6. **Click on the text**
7. ✅ If cursor appears → **OCR WORKS!**
8. ❌ If nothing happens → **OCR BROKEN**

---

## Next Steps After Testing

### If Tests Pass ✅
- [ ] Test with multiple PDFs (3-5 different files)
- [ ] Test all formats (PPTX, DOCX, XLSX)
- [ ] Monitor credit usage
- [ ] Deploy to production

### If Tests Fail ❌
- [ ] Check backend logs for errors
- [ ] Verify CloudConvert API key
- [ ] Check CloudConvert credits
- [ ] Test with simpler PDF
- [ ] Contact CloudConvert support if needed

---

**Quick Test Time**: 5 minutes
**Thorough Test Time**: 30 minutes
**Priority**: HIGH (user-facing bug fix)
