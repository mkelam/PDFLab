# CloudConvert OCR Fix - November 18, 2025

## Issue

**Problem**: Converted PDFs to PPTX/DOCX contain only images, not editable text
**Root Cause**: CloudConvert's PDF to PPTX/DOCX conversion doesn't support OCR parameters directly
**Impact**: Users cannot edit the text in converted documents

---

## Analysis

### Current Implementation (INCORRECT)

The code currently tries to pass OCR parameters directly to the convert task:

```typescript
// Lines 74-86 (PPTX conversion)
const taskConfig: any = {
  operation: 'convert',
  input: 'upload-file',
  input_format: 'pdf',
  output_format: 'pptx',
  ocr: true,                    // ❌ NOT SUPPORTED
  ocr_lang: 'eng',              // ❌ NOT SUPPORTED
  ocr_mode: 'force',            // ❌ NOT SUPPORTED
  layout_preserving: true,
  extract_text: true,
  image_quality: 'high'
}
```

**Problem**: CloudConvert's convert operation **DOES NOT support OCR parameters**.

---

### CloudConvert Architecture

CloudConvert has **two separate operations**:

1. **PDF OCR Operation** (`pdf/ocr`)
   - Adds an OCR text layer to scanned PDFs
   - Makes PDFs searchable and copy-pasteable
   - **Must be run BEFORE conversion**

2. **Convert Operation** (`convert`)
   - Converts files between formats
   - Can only extract text that ALREADY EXISTS in the PDF
   - Cannot perform OCR

---

## Solution

### Approach 1: Add OCR Task Before Conversion ✅ RECOMMENDED

**Workflow**:
```
Upload → OCR (add text layer) → Convert (PDF→PPTX) → Export
```

**Job Structure**:
```typescript
{
  tasks: {
    'upload-file': {
      operation: 'import/upload'
    },
    'ocr-pdf': {
      operation: 'pdf/ocr',
      input: 'upload-file',
      language: ['eng'],           // English OCR
      auto_orient: true            // Auto-detect orientation
    },
    'convert-file': {
      operation: 'convert',
      input: 'ocr-pdf',            // Use OCR output as input
      input_format: 'pdf',
      output_format: 'pptx'
    },
    'export-file': {
      operation: 'export/url',
      input: 'convert-file'
    }
  }
}
```

**Benefits**:
- ✅ Works with scanned PDFs (images only)
- ✅ Works with native PDFs (embedded text)
- ✅ Ensures all text is editable
- ✅ Single API call (all tasks in one job)

**Drawbacks**:
- ⚠️ Adds processing time (~5-10 seconds per page)
- ⚠️ Uses more CloudConvert credits
- ⚠️ OCR operation is marked as "experimental" (preview)

---

### Approach 2: Conditional OCR (Smart Detection)

**Workflow**:
```
Upload → Detect if scanned → (If scanned) OCR → Convert → Export
```

**Pseudocode**:
```typescript
// 1. Check if PDF has embedded text
const hasText = await detectTextInPDF(pdfFile)

// 2. Create job with or without OCR task
if (hasText) {
  // Native PDF with text - skip OCR
  job = createJob({ upload → convert → export })
} else {
  // Scanned PDF - add OCR
  job = createJob({ upload → OCR → convert → export })
}
```

**Benefits**:
- ✅ Faster for native PDFs (skip OCR)
- ✅ Lower credit usage
- ✅ Optimal performance

**Drawbacks**:
- ❌ Requires additional PDF analysis
- ❌ More complex logic
- ❌ May misdetect some PDFs

---

### Approach 3: Always Use OCR (Current "Force" Intent)

**Workflow**:
```
Upload → OCR (force) → Convert → Export
```

**Implementation**: Same as Approach 1, but always run OCR

**Benefits**:
- ✅ Guarantees editable text
- ✅ Consistent behavior
- ✅ Simple implementation

**Drawbacks**:
- ⚠️ Slower for all PDFs (even native ones)
- ⚠️ Higher credit usage

---

## Recommended Implementation

**Use Approach 1 (Always OCR)** to match the current `ocr_mode: 'force'` intent.

### Updated Code

```typescript
// Format-specific options with OCR task
if (outputFormat === 'pptx') {
  // Build task configuration
  const taskConfig: any = {
    operation: 'convert',
    input: 'ocr-pdf',  // Use OCR output instead of upload
    input_format: 'pdf',
    output_format: 'pptx'
  }

  // Create CloudConvert job with OCR task
  let job = await cloudConvertClient.jobs.create({
    tasks: {
      'upload-file': {
        operation: 'import/upload'
      },
      'ocr-pdf': {
        operation: 'pdf/ocr',
        input: 'upload-file',
        language: ['eng'],      // English OCR
        auto_orient: true       // Auto-detect page orientation
      },
      'convert-file': taskConfig,
      'export-file': {
        operation: 'export/url',
        input: 'convert-file'
      }
    }
  })
}
```

---

## Testing Plan

### Test Case 1: Scanned PDF (Image-Only)
**Input**: Scanned document with no embedded text
**Expected**: Converted PPTX/DOCX has editable text extracted via OCR
**Validation**: Open converted file, select text, verify it's editable

### Test Case 2: Native PDF (Embedded Text)
**Input**: PDF created from Word/PowerPoint with embedded text
**Expected**: Converted PPTX/DOCX has editable text
**Validation**: Text should match original exactly

### Test Case 3: Mixed PDF (Text + Images)
**Input**: PDF with both embedded text and scanned images
**Expected**: All text editable (both embedded and OCR'd)
**Validation**: Verify both types of text are selectable

### Test Case 4: Performance
**Input**: 10-page PDF
**Expected**: Conversion completes in reasonable time
**Validation**: Check CloudConvert job logs for timing

---

## CloudConvert Credit Impact

### Current (Without OCR)
- PDF to PPTX: ~1 credit per conversion
- PDF to DOCX: ~1 credit per conversion
- PDF to XLSX: ~1 credit per conversion

### With OCR Task
- OCR operation: ~1-2 credits per page
- Convert operation: ~1 credit
- **Total**: ~11-21 credits for 10-page PDF

**Example**:
- 100 conversions/month @ 10 pages each
- Without OCR: 100 credits
- With OCR: 1,100-2,100 credits
- **Cost increase**: 10-20x

**Recommendation**: Monitor credit usage and adjust pricing plans accordingly.

---

## Alternative Solutions

### Option A: Use Different Provider
- **PDFTron**: Native PDF SDK with built-in OCR
- **Adobe PDF Services**: Enterprise-grade OCR
- **Tesseract OCR**: Open-source, self-hosted

### Option B: Conditional OCR
- Detect if PDF has text
- Only OCR scanned documents
- Saves credits, reduces processing time

### Option C: User Choice
- Add "Enable OCR" checkbox
- Let users decide if they need OCR
- Default: OFF (faster, cheaper)

---

## Implementation Steps

1. ✅ Update CloudConvert service to add OCR task
2. ✅ Test with scanned PDFs
3. ✅ Test with native PDFs
4. ✅ Monitor credit usage
5. ✅ Update documentation
6. ⚠️ Consider user notification about OCR processing time
7. ⚠️ Consider pricing plan adjustments

---

## Breaking Changes

**None** - This is a bug fix that improves functionality without changing the API.

---

## User Impact

### Before Fix
- ❌ Scanned PDFs → Images only
- ❌ Cannot edit text
- ❌ User frustration

### After Fix
- ✅ Scanned PDFs → Editable text
- ✅ Can edit, search, copy text
- ✅ Better user experience
- ⚠️ Slightly longer processing time

---

## Monitoring

Track these metrics after deployment:

1. **OCR Success Rate**: % of conversions with editable text
2. **Processing Time**: Average time per conversion (should increase)
3. **Credit Usage**: Credits per conversion (should increase)
4. **User Complaints**: "Images only" issues should decrease to zero

---

**Status**: ✅ Solution Identified
**Next Step**: Implement OCR task in CloudConvert service
**Priority**: HIGH (user-facing bug)
**Estimated Effort**: 1-2 hours
