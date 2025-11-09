# Batch Processing UI Design

## Visual Mockup & User Flow

### **Mode Selection (Step 1 - Card 1)**

```
┌─────────────────────────────────────┐
│  Step 1: Setup                      │
├─────────────────────────────────────┤
│  1. Choose Mode                     │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Convert   [Most popular]   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Merge                      │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Compress       [New]       │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  ⚡ Batch    [5-50 files]   │ ← NEW!
│  └─────────────────────────────┘   │
│                                     │
│  2. Drag and Drop                   │
│  ┌─────────────────────────────┐   │
│  │   📤 Drop multiple PDFs      │   │
│  │   Select 2-50 files          │   │
│  │   (Plan limit: Free 5,       │   │
│  │    Starter 10, Pro 20)       │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

### **Batch Configuration (Step 2 - Card 2)**

When "Batch" mode is selected:

```
┌─────────────────────────────────────┐
│  Step 2: Configure                  │
├─────────────────────────────────────┤
│  3. Batch Operation                 │
│                                     │
│  ┌──────────┬──────────┬─────────┐ │
│  │ Convert  │ Compress │  Merge  │ │
│  └──────────┴──────────┴─────────┘ │
│                                     │
│  If Convert selected:               │
│  ┌──────────┬──────────┐           │
│  │   PPTX   │   DOCX   │           │
│  ├──────────┼──────────┤           │
│  │   XLSX   │   PNG    │           │
│  └──────────┴──────────┘           │
│                                     │
│  4. Files Ready (2-50)              │
│  ┌─────────────────────────────┐   │
│  │ ✓ report_jan.pdf    [2.5MB] │   │
│  │ ✓ report_feb.pdf    [1.8MB] │   │
│  │ ✓ report_mar.pdf    [3.2MB] │   │
│  │ ✓ report_apr.pdf    [2.1MB] │   │
│  │ ✓ report_may.pdf    [1.9MB] │   │
│  │   ... 5 files (11.5MB total)│   │
│  └─────────────────────────────┘   │
│                                     │
│  [Clear All]  [Add More Files]     │
└─────────────────────────────────────┘
```

---

### **Batch Processing Progress (Step 3 - Card 3)**

During batch processing:

```
┌─────────────────────────────────────┐
│  Step 3: Execute                    │
├─────────────────────────────────────┤
│  5. Processing Batch                │
│                                     │
│  Overall Progress: 60% (3 of 5)    │
│  ████████████░░░░░░░                │
│                                     │
│  Individual Files:                  │
│  ✅ report_jan.pdf   [Complete]    │
│  ✅ report_feb.pdf   [Complete]    │
│  ✅ report_mar.pdf   [Complete]    │
│  ⏳ report_apr.pdf   [65% ...]     │
│  ⏸️ report_may.pdf   [Queued]      │
│                                     │
│  Estimated time: 2 min remaining   │
│                                     │
│  6. Download Ready                  │
│  ┌─────────────────────────────┐   │
│  │  Not ready yet...            │   │
│  │  Processing batch files      │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

### **Batch Complete - ZIP Download (Step 3 - Card 3)**

After batch processing completes:

```
┌─────────────────────────────────────┐
│  Step 3: Execute                    │
├─────────────────────────────────────┤
│  5. Processing                      │
│  ✅ Batch Complete!                 │
│                                     │
│  Results:                           │
│  • 5 of 5 files converted           │
│  • 0 failed                         │
│  • Success rate: 100%               │
│  • Processing time: 3m 24s          │
│                                     │
│  6. Download Ready                  │
│  ┌─────────────────────────────┐   │
│  │   ✅ Batch Processing        │   │
│  │      Complete!               │   │
│  │                              │   │
│  │   📦 batch_reports.zip       │   │
│  │      (15.2 MB)               │   │
│  │                              │   │
│  │   Contains:                  │   │
│  │   • 5 converted files        │   │
│  │   • All in PPTX format       │   │
│  │                              │   │
│  │   [⬇️  Download ZIP]         │   │
│  │   [🔄 Process Another Batch] │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## **User Flow Diagram**

```
1. User clicks "Batch" mode
   │
   ├─► Interface updates to multi-file dropzone
   │
2. User drags 5 PDFs into dropzone
   │
   ├─► Files appear in "Files Ready" section
   │   with checkmarks (valid) or errors
   │
3. User selects batch operation
   │
   ├─► Convert → Choose output format (PPTX/DOCX/etc)
   ├─► Compress → Choose compression level
   └─► Merge → No additional options
   │
4. User clicks "Process Batch" button
   │
   ├─► Progress shows:
   │   • Overall batch progress (%)
   │   • Individual file status
   │   • Estimated time remaining
   │
5. Processing completes
   │
   ├─► Success modal shows:
   │   • Success rate (X of Y files)
   │   • Failed files (if any)
   │   • ZIP file size
   │   • Download button
   │
6. User clicks "Download ZIP"
   │
   └─► Browser downloads batch_YYYY-MM-DD.zip
       containing all converted files
```

---

## **Key Features**

### **1. Multi-File Upload**
- Drag-and-drop 2-50 files at once
- Real-time validation (size, format, quota)
- Individual file status indicators
- Remove files before processing

### **2. Plan-Based Limits**
```
Free:       5 files per batch
Starter:   10 files per batch
Pro:       20 files per batch
Enterprise: 50 files per batch
```

### **3. Batch Operations**
- **Convert**: All files → Same format (PPTX/DOCX/XLSX/PNG)
- **Compress**: All files → Compressed PDFs (Good/Recommended/Extreme)
- **Merge**: Combine all files → Single PDF (existing feature)

### **4. Progress Tracking**
- Overall batch progress bar (0-100%)
- Individual file progress (Queued → Processing → Complete/Failed)
- Real-time status updates via polling
- Estimated time remaining

### **5. ZIP Download**
- All converted files packaged into one ZIP
- Automatic naming: `batch_YYYY-MM-DD_HHmm.zip`
- Total size displayed
- One-click download

### **6. Error Handling**
- Shows which files failed (if any)
- Partial success (some files succeeded, some failed)
- Retry failed files only (future enhancement)
- Clear error messages per file

---

## **UI Components Needed**

### **New Components**
1. **BatchModeButton** - "Batch" mode selector with badge
2. **BatchFileList** - Multi-file display with progress indicators
3. **BatchOperationSelector** - Convert/Compress tabs
4. **BatchProgressTracker** - Overall + individual progress
5. **BatchResultCard** - Success rate, ZIP download

### **Modified Components**
1. **UnifiedConversionInterface** - Add batch mode handling
2. **Dropzone** - Support multiple files (2-50)
3. **ProcessButton** - "Process Batch" variant
4. **DownloadButton** - "Download ZIP" variant

---

## **Color Scheme (Glassmorphism)**

```css
/* Batch Mode Selected */
background: oklch(0.72 0.15 250 / 0.2)  /* Primary purple/blue */
border: oklch(0.72 0.15 250)
text: oklch(0.72 0.15 250)
shadow: 0 4px 12px oklch(0.72 0.15 250 / 0.2)

/* Progress States */
Queued:     oklch(0.60 0.05 250)  /* Muted blue */
Processing: oklch(0.72 0.15 250)  /* Primary */
Complete:   oklch(0.60 0.15 140)  /* Green */
Failed:     oklch(0.60 0.15 25)   /* Red */

/* Badges */
[5-50 files]: bg-purple-500/20 text-purple-700
Success rate: bg-green-500/20 text-green-700
```

---

## **Responsive Design**

### **Desktop (lg: 1024px+)**
- 3-card layout (existing)
- Batch file list scrollable (max-height: 300px)
- ZIP download prominent in Card 3

### **Mobile (< 1024px)**
- Stacked cards vertically
- Batch file list collapsible
- Sticky "Process Batch" button at bottom

---

## **Accessibility**

- ✅ Keyboard navigation (Tab through files)
- ✅ Screen reader announcements (progress updates)
- ✅ ARIA labels on all interactive elements
- ✅ Focus indicators on dropzone
- ✅ Color contrast (WCAG AA compliant)

---

## **Performance Considerations**

1. **Polling Optimization**
   - Poll batch status every 2 seconds (vs 1s for single file)
   - Stop polling when batch complete
   - Show individual file progress from status response

2. **File Upload**
   - Upload files sequentially (not parallel) to avoid server overload
   - Show upload progress per file
   - Validate total size before upload

3. **ZIP Creation**
   - Generated server-side after all files complete
   - Cached for 1 hour (same as individual files)
   - Streamed download for large ZIPs

---

## **Next Steps to Implement**

1. ✅ Backend API complete (already done!)
2. Add "Batch" mode button to UnifiedConversionInterface
3. Create BatchFileList component
4. Create BatchProgressTracker component
5. Add batch operation selector
6. Integrate batch API endpoints
7. Test with 5-50 files
8. Deploy to production

---

**Design Status**: Ready for Implementation
**Backend Status**: ✅ Complete
**Frontend Status**: 🏗️ In Progress
**Estimated Implementation**: 4-6 hours
