# Component Architecture Documentation

## Overview

This document describes the component architecture refactoring of the PDFLab conversion interface, completed as part of Phase 3: Component Refactoring.

**Refactoring Achievement:**
- **Original:** `UnifiedConversionInterface.tsx` - 1,088 lines (monolithic)
- **Refactored:** `UnifiedConversionInterface.tsx` - 402 lines (composition-based)
- **Reduction:** 63% reduction in main component complexity

---

## Architecture Philosophy

The refactored architecture follows these key principles:

1. **Separation of Concerns** - UI, business logic, and state management are cleanly separated
2. **Composition over Monolith** - Small, focused components composed into larger features
3. **Custom Hooks** - Reusable logic extracted into dedicated hooks
4. **Utility Functions** - Pure functions separated from components
5. **Single Responsibility** - Each component/hook/function has one clear purpose

---

## Directory Structure

```
PDFLab/
├── components/
│   ├── conversion/                    # Conversion feature components
│   │   ├── SetupCard.tsx             # Step 1: Mode selection & file upload
│   │   ├── ConfigureCard.tsx         # Step 2: Output format & file list
│   │   ├── ExecuteCard.tsx           # Step 3: Processing & download
│   │   ├── ConversionErrorDisplay.tsx # Error handling with actions
│   │   └── index.ts                   # Barrel export
│   └── UnifiedConversionInterface.tsx # Main orchestrator component
│
├── hooks/
│   ├── useFileUpload.ts              # File management hook
│   ├── useConversionProcessing.ts    # Processing state hook
│   └── useRequireAuth.ts             # (existing)
│
└── lib/
    └── conversion/
        └── conversion-utils.ts        # Pure utility functions
```

---

## Component Breakdown

### Main Component: `UnifiedConversionInterface.tsx` (402 lines)

**Purpose:** Orchestrates the conversion flow by composing sub-components and managing top-level state.

**Responsibilities:**
- Coordinate between sub-components
- Handle API calls and error management
- Manage guest user flows
- Coordinate file drop behavior

**Key Pattern:** Composition - delegates rendering to specialized sub-components

```typescript
<SetupCard {...setupProps} />
<ConfigureCard {...configureProps} />
<ExecuteCard {...executeProps} />
```

---

### Sub-Components

#### 1. `SetupCard.tsx` (168 lines)

**Purpose:** Handle mode selection and file upload

**Features:**
- Mode selection (Convert, Merge, Compress)
- Batch/Single file toggle
- Drag-and-drop upload zone
- File validation feedback

**Props Interface:**
```typescript
interface SetupCardProps {
  activeTab: TabMode
  conversionMode: ConversionMode
  maxFiles: number
  isDragActive: boolean
  isProcessing: boolean
  onTabChange: (tab: TabMode) => void
  onConversionModeChange: (mode: ConversionMode) => void
  getRootProps: () => DropzoneRootProps
  getInputProps: () => DropzoneInputProps
}
```

---

#### 2. `ConfigureCard.tsx` (181 lines)

**Purpose:** Output format selection and file management

**Features:**
- Output format selection (PowerPoint, Word, Excel, Images)
- Compression level selection
- Uploaded file list with validation status
- File removal actions

**Props Interface:**
```typescript
interface ConfigureCardProps {
  activeTab: TabMode
  outputFormat: OutputFormat
  compressionLevel: CompressionLevel
  uploadedFiles: UploadedFile[]
  isProcessing: boolean
  onOutputFormatChange: (format: OutputFormat) => void
  onCompressionLevelChange: (level: CompressionLevel) => void
  onRemoveFile: (id: string) => void
}
```

---

#### 3. `ExecuteCard.tsx` (168 lines)

**Purpose:** Processing execution and download management

**Features:**
- Processing status with progress animation
- Dynamic button text based on mode
- Download functionality
- Reset/retry actions

**Props Interface:**
```typescript
interface ExecuteCardProps {
  activeTab: TabMode
  outputFormat: OutputFormat
  conversionMode: ConversionMode
  processing: ProcessingState
  uploadedFilesCount: number
  validFilesCount: number
  isGuest: boolean
  onProcess: () => void
  onDownload: () => void
  onReset: () => void
  onShowGuestPrompt: () => void
}
```

---

#### 4. `ConversionErrorDisplay.tsx` (145 lines)

**Purpose:** Contextual error handling with actionable suggestions

**Features:**
- Error-specific action buttons
- Retry/reset functionality
- Format switching suggestions
- External link support (pricing, support)

**Props Interface:**
```typescript
interface ConversionErrorDisplayProps {
  error: string
  onRetry: () => void
  onReset: () => void
  onSwitchToImages: () => void
  onSwitchToWord: () => void
  onSwitchToPowerPoint: () => void
}
```

---

## Custom Hooks

### 1. `useFileUpload.ts` (87 lines)

**Purpose:** Manage file upload state and operations

**Features:**
- File validation
- Add/remove/clear operations
- Max file limit enforcement
- Valid file tracking

**API:**
```typescript
const {
  uploadedFiles,      // All uploaded files
  validFiles,         // Only valid files
  hasValidFiles,      // Boolean flag
  addFiles,           // Add files to list
  replaceFiles,       // Replace all files
  removeFile,         // Remove by ID
  clearFiles,         // Clear all
} = useFileUpload({ maxFiles })
```

**Benefits:**
- Reusable across different file upload scenarios
- Centralized validation logic
- Clean separation from UI

---

### 2. `useConversionProcessing.ts` (129 lines)

**Purpose:** Manage conversion processing state and animations

**Features:**
- Processing state management
- Progress animation
- Completion/error handling
- Timer cleanup

**API:**
```typescript
const {
  processing,              // Current state
  startProcessing,         // Start conversion
  updateProgress,          // Manual progress update
  startProgressAnimation,  // Auto-progress stages
  completeProcessing,      // Mark complete
  setError,                // Set error state
  reset,                   // Reset state
} = useConversionProcessing()
```

**Benefits:**
- Centralized progress logic
- Automatic timer cleanup
- Prevents memory leaks
- Reusable for different conversion types

---

## Utility Functions: `conversion-utils.ts` (202 lines)

**Purpose:** Pure functions for conversion-related calculations

**Key Functions:**

1. **`getProgressStages()`** - Returns stage-by-stage progress data
2. **`getUploadText()`** - Dynamic upload zone text
3. **`getPDFUploadMode()`** - Map settings to upload mode
4. **`mapOutputFormatToAPI()`** - Format conversion for API
5. **`getMaxFiles()`** - Calculate max files allowed
6. **`enhanceErrorMessage()`** - Add context to errors
7. **`getProcessButtonText()`** - Dynamic button labels
8. **`getCompletionMessage()`** - Success message text

**Benefits:**
- Testable in isolation
- No side effects
- Easy to reason about
- Can be tree-shaken if unused

---

## Type Definitions

All shared types are defined in `conversion-utils.ts`:

```typescript
export type TabMode = "convert" | "merge" | "compress"
export type OutputFormat = "image" | "powerpoint" | "word" | "excel"
export type CompressionLevel = "good" | "recommended" | "extreme"
export type ConversionMode = "single" | "batch"
```

**Benefits:**
- Single source of truth
- Type safety across components
- Easy to extend

---

## Data Flow

### File Upload Flow

```
User drops file
    ↓
useDropzone onDrop callback
    ↓
useFileUpload.addFiles() or replaceFiles()
    ↓
Validation via validatePDFFile()
    ↓
State updated with UploadedFile[]
    ↓
ConfigureCard displays files
```

### Conversion Flow

```
User clicks "Convert"
    ↓
UnifiedConversionInterface.processFiles()
    ↓
useConversionProcessing.startProgressAnimation()
    ↓
API calls (pdflabAPI.*)
    ↓
useConversionProcessing.completeProcessing()
    ↓
ExecuteCard shows download button
```

### Error Flow

```
API throws error
    ↓
enhanceErrorMessage() adds context
    ↓
useConversionProcessing.setError()
    ↓
ConversionErrorDisplay renders
    ↓
User takes action (retry/reset/switch format)
```

---

## Best Practices for Future Development

### 1. Component Creation

- **Keep components focused** - One responsibility per component
- **Extract early** - If a component exceeds 200 lines, consider breaking it down
- **Use composition** - Prefer small components composed together
- **Props over state** - Pass data down, callbacks up

### 2. Hook Creation

- **Extract reusable logic** - If logic is used in multiple places, make it a hook
- **Clean up effects** - Always clean up timers, subscriptions, etc.
- **Return stable references** - Use `useCallback` for returned functions
- **Document the API** - Clear JSDoc comments for hook usage

### 3. Utility Functions

- **Keep them pure** - No side effects, same input = same output
- **Single purpose** - Each function should do one thing well
- **Type everything** - Full TypeScript coverage
- **Test thoroughly** - Easy to unit test pure functions

### 4. Testing Strategy

- **Unit test utilities** - Pure functions are easiest to test
- **Integration test hooks** - Test with `@testing-library/react-hooks`
- **Component test UI** - Test user interactions and rendering
- **E2E test flows** - Test complete user journeys

---

## Performance Considerations

### Current Optimizations

1. **Memoized callbacks** - `useCallback` prevents unnecessary re-renders
2. **Separated state** - Each hook manages its own state
3. **Conditional rendering** - Only render what's needed
4. **Lazy imports** - Consider for heavy dependencies

### Future Optimizations

1. **React.memo** - Memoize sub-components if props are stable
2. **useMemo** - Memoize expensive calculations
3. **Code splitting** - Lazy load conversion components
4. **Virtualization** - For large file lists

---

## Migration Guide

### From Old to New Structure

**Before (Monolithic):**
```typescript
// All in one file
function UnifiedConversionInterface() {
  const [files, setFiles] = useState([])
  const [processing, setProcessing] = useState({})
  // 1000+ lines of logic and JSX
}
```

**After (Composition):**
```typescript
// Main orchestrator
function UnifiedConversionInterface() {
  const { uploadedFiles, addFiles, ... } = useFileUpload({ maxFiles })
  const { processing, startProgressAnimation, ... } = useConversionProcessing()

  return (
    <>
      <SetupCard {...setupProps} />
      <ConfigureCard {...configureProps} />
      <ExecuteCard {...executeProps} />
    </>
  )
}
```

### Adding New Features

**Example: Adding a new conversion mode**

1. Update type in `conversion-utils.ts`:
   ```typescript
   export type TabMode = "convert" | "merge" | "compress" | "split"
   ```

2. Add utility function if needed:
   ```typescript
   export function getSplitModeDefaults() { ... }
   ```

3. Update `SetupCard.tsx` to include new mode button

4. Update `getProgressStages()` to handle new mode

5. Update `processFiles()` in main component

**No need to touch:**
- File upload logic (reusable)
- Processing state logic (reusable)
- ExecuteCard (works generically)

---

## Testing Coverage

### Unit Tests Needed

- [ ] `conversion-utils.ts` - All utility functions
- [ ] `useFileUpload.ts` - Hook behavior
- [ ] `useConversionProcessing.ts` - Hook behavior

### Component Tests Needed

- [ ] `SetupCard.tsx` - Mode selection, file drop
- [ ] `ConfigureCard.tsx` - Format selection, file list
- [ ] `ExecuteCard.tsx` - Processing display, download
- [ ] `ConversionErrorDisplay.tsx` - Error rendering, actions

### Integration Tests Needed

- [ ] Full conversion flow (upload → convert → download)
- [ ] Batch conversion flow
- [ ] Error recovery flows
- [ ] Guest user flows

---

## Metrics

### Before Refactoring
- **Main component:** 1,088 lines
- **Complexity:** High (all logic in one file)
- **Testability:** Low (hard to test in isolation)
- **Reusability:** None (monolithic)
- **Maintainability:** Low (difficult to modify)

### After Refactoring
- **Main component:** 402 lines (63% reduction)
- **Sub-components:** 4 components (~150-180 lines each)
- **Custom hooks:** 2 hooks (~87-129 lines each)
- **Utilities:** 1 file (202 lines)
- **Complexity:** Low (clear separation)
- **Testability:** High (isolated units)
- **Reusability:** High (hooks and utils)
- **Maintainability:** High (easy to modify)

### Component Size Distribution
```
UnifiedConversionInterface.tsx:  402 lines (main orchestrator)
conversion-utils.ts:             202 lines (utilities)
ConfigureCard.tsx:               181 lines (sub-component)
SetupCard.tsx:                   168 lines (sub-component)
ExecuteCard.tsx:                 168 lines (sub-component)
ConversionErrorDisplay.tsx:      145 lines (sub-component)
useConversionProcessing.ts:      129 lines (hook)
useFileUpload.ts:                 87 lines (hook)
```

**Average component size:** ~185 lines (well within maintainability threshold)

---

## Conclusion

This refactoring successfully transformed a 1,088-line monolithic component into a clean, maintainable architecture with:

- **Clear separation of concerns**
- **Reusable hooks and utilities**
- **Composable sub-components**
- **Improved testability**
- **Better developer experience**

The new architecture makes it easy to:
- Add new conversion modes
- Modify UI without touching logic
- Test individual pieces
- Reuse components in other features
- Onboard new developers

---

## References

- [React Composition Pattern](https://reactjs.org/docs/composition-vs-inheritance.html)
- [Custom Hooks Best Practices](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [Component Design Principles](https://kentcdodds.com/blog/compound-components-with-react-hooks)
