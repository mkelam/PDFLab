# PDF Compression Feature

**Status**: ✅ Implemented
**Release Date**: November 6, 2025
**Author**: PDFLab Development Team

## Overview

The PDF Compression feature allows authenticated users to reduce the file size of their PDF documents while maintaining quality. This feature is powered by CloudConvert's optimize API and offers three compression levels to balance quality and file size reduction.

## Feature Description

### What It Does

- **Reduces PDF file size** using advanced compression algorithms
- **Preserves document quality** based on selected compression level
- **Provides compression statistics** showing original size, compressed size, and compression ratio
- **Counts towards user quota** (same as other conversions)

### Use Cases

1. **Email Attachments**: Compress large PDFs to fit within email size limits
2. **Website Publishing**: Reduce file sizes for faster web page loading
3. **Storage Optimization**: Save disk space by compressing archived PDFs
4. **Bandwidth Savings**: Reduce upload/download times for PDF transfers
5. **Mobile Sharing**: Create smaller PDFs for easier mobile device sharing

## Compression Levels

### Good (Moderate Compression)

- **Quality**: Highest quality retention
- **File Size Reduction**: ~20-30% smaller
- **Best For**:
  - Documents with important images
  - Professional presentations
  - Legal or compliance documents
- **Description**: "Best quality, moderate compression"

### Recommended (Balanced) ⭐ POPULAR

- **Quality**: Balanced quality retention
- **File Size Reduction**: ~40-60% smaller
- **Best For**:
  - General purpose documents
  - Reports and proposals
  - Most business documents
- **Description**: "Balanced quality & file size"
- **Note**: This is the default and most popular setting

### Extreme (Maximum Compression)

- **Quality**: Lower quality, visible compression artifacts possible
- **File Size Reduction**: ~60-80% smaller
- **Best For**:
  - Text-heavy documents with few images
  - Internal documents where file size is critical
  - Archival purposes where extreme space savings are needed
- **Description**: "Maximum compression, lower quality"
- **Warning**: May result in visible quality degradation for images and graphics

## User Interface

### Location

The compression feature is accessible from the main conversion interface:

1. **Step 1**: Choose Mode → Select "Compress" (marked with "New" badge)
2. **Step 2**: Drag and Drop → Upload a single PDF file
3. **Step 3**: Compression Level → Select good, recommended, or extreme
4. **Step 4**: Process → Click "Compress PDF" button
5. **Step 5**: Download → Download compressed PDF when ready

### UI Elements

#### Mode Selection
```
┌─────────────────────────┐
│  Convert    [Most popular]  │
│  Merge                      │
│  Compress   [New]           │
└─────────────────────────┘
```

#### Compression Level Selector
```
┌──────────────────────────────────┐
│  Good         [Best quality, moderate compression]        │
│  Recommended  [Popular] [Balanced quality & file size]   │
│  Extreme      [Maximum compression, lower quality]        │
└──────────────────────────────────┘
```

## Technical Implementation

### Backend Architecture

#### 1. API Endpoint

**Route**: `POST /api/compress`

**Authentication**: Required (uses JWT token)

**Request**:
```typescript
FormData {
  file: File (PDF)
  compression_level: 'good' | 'recommended' | 'extreme'
}
```

**Response**:
```typescript
{
  message: string
  job_id: string
  status: 'queued'
  progress: number
  estimated_time: number
  compression_level: string
  created_at: Date
}
```

**Location**: [backend/src/routes/conversion.routes.ts:33-42](../../backend/src/routes/conversion.routes.ts#L33-L42)

#### 2. Controller

**Function**: `compressPDF()`

**Responsibilities**:
- Validate user authentication
- Check compression level validity
- Validate file size against user plan limit
- Create conversion job with type `PDF_COMPRESS`
- Add job to Bull queue with compression options
- Return job details to client

**Location**: [backend/src/controllers/conversion.controller.ts:11-105](../../backend/src/controllers/conversion.controller.ts#L11-L105)

#### 3. CloudConvert Service

**Function**: `compressPDF()`

**Parameters**:
```typescript
inputFilePath: string
outputFilePath: string
compressionLevel: 'good' | 'recommended' | 'extreme'
```

**Returns**:
```typescript
{
  success: boolean
  outputPath?: string
  jobId?: string
  originalSize?: number
  compressedSize?: number
  compressionRatio?: number
  error?: string
}
```

**Implementation Details**:
- Uses CloudConvert `optimize` operation
- Maps compression level to CloudConvert `profile` parameter
- Calculates compression statistics (original size, compressed size, ratio)
- Downloads optimized PDF from CloudConvert
- Returns compression metrics for display

**Location**: [backend/src/services/cloudconvert.service.ts:400-521](../../backend/src/services/cloudconvert.service.ts#L400-L521)

#### 4. Job Worker

**Worker**: Conversion Job Processor

**Compression Handler**:
```typescript
if (conversion_type === 'pdf_compress' && input_file) {
  result = await cloudConvertService.compressPDF(
    input_file,
    outputFile,
    options?.compression_level || 'recommended'
  )
}
```

**Processing Flow**:
1. Detect `pdf_compress` conversion type
2. Extract compression level from job options (default: 'recommended')
3. Call CloudConvert compression service
4. Update job progress
5. Store compressed PDF
6. Record compression statistics
7. Mark job as completed

**Location**: [backend/src/jobs/conversion.job.ts:108-116](../../backend/src/jobs/conversion.job.ts#L108-L116)

### Frontend Architecture

#### 1. API Client

**Function**: `pdflabAPI.compressPDF()`

**Parameters**:
```typescript
file: File
compressionLevel: 'good' | 'recommended' | 'extreme'
```

**Implementation**:
- Requires authentication (throws error if not logged in)
- Uploads PDF with compression level to `/api/compress`
- Polls job status until completion
- Returns compression result with statistics

**Location**: [lib/api.ts:354-419](../../lib/api.ts#L354-L419)

#### 2. UI Component

**Component**: `UnifiedConversionInterface`

**State Management**:
```typescript
const [activeTab, setActiveTab] = useState<TabMode>("convert" | "merge" | "compress")
const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>("recommended")
```

**Processing Logic**:
```typescript
if (activeTab === "compress") {
  result = await pdflabAPI.compressPDF(validFiles[0].file, compressionLevel)
}
```

**Progress Stages**:
1. "Analyzing PDF content..." (25%)
2. "Applying {level} compression..." (50%)
3. "Optimizing file size..." (75%)
4. "Finalizing..." (90%)

**Location**: [components/UnifiedConversionInterface.tsx](../../components/UnifiedConversionInterface.tsx)

## Database Schema

### ConversionJob Model

The compression feature uses the existing `conversion_jobs` table with type `pdf_compress`:

```typescript
{
  id: UUID
  user_id: UUID (required for compression)
  type: 'pdf_compress'
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed'
  progress: number (0-100)
  input_file: string (path to uploaded PDF)
  output_file: string (path to compressed PDF)
  file_name: string (original filename)
  file_size: number (original file size)
  cloudconvert_job_id: string
  error_message?: string
  estimated_time: number (3 seconds base)
  processing_started_at?: Date
  processing_completed_at?: Date
  created_at: Date
  updated_at: Date
  expires_at: Date (7 days for authenticated users)
}
```

**Location**: [backend/src/models/ConversionJob.ts:10-12](../../backend/src/models/ConversionJob.ts#L10-L12)

## User Permissions & Quotas

### Authentication Requirement

- ✅ **Authenticated Users**: Full access to compression feature
- ❌ **Guest Users**: Compression NOT available (authentication required)

### Quota Consumption

Compression counts as **1 conversion** towards the user's monthly quota:

| Plan       | Monthly Quota | File Size Limit |
|------------|---------------|-----------------|
| Free       | 3             | 10MB           |
| Starter    | 100           | 25MB           |
| Pro        | Unlimited     | 100MB          |
| Enterprise | Unlimited     | 500MB          |

### File Size Limits

Compression respects plan-based file size limits:
- Free: 10MB maximum
- Starter: 25MB maximum
- Pro: 100MB maximum
- Enterprise: 500MB maximum

## Error Handling

### Common Errors

#### 1. Authentication Required
```typescript
{
  error: 'User not authenticated',
  status: 401
}
```
**Resolution**: User must log in to use compression

#### 2. Invalid Compression Level
```typescript
{
  error: 'Invalid compression level',
  message: 'Compression level must be one of: good, recommended, extreme',
  status: 400
}
```
**Resolution**: Use valid compression level

#### 3. File Too Large
```typescript
{
  error: 'File too large',
  message: 'Your {plan} plan supports files up to {limit}MB',
  file_size: number,
  max_file_size: number,
  upgrade_required: true,
  status: 413
}
```
**Resolution**: Upgrade plan or use smaller file

#### 4. Quota Exceeded
```typescript
{
  error: 'Conversion quota exceeded',
  message: 'You have used all {limit} conversions this month',
  conversions_used: number,
  conversions_limit: number,
  reset_date: Date,
  status: 429
}
```
**Resolution**: Wait for monthly reset or upgrade plan

## CloudConvert API Usage

### Optimize Operation

**API Endpoint**: `POST /v2/jobs`

**Task Configuration**:
```javascript
{
  tasks: {
    'upload-file': {
      operation: 'import/upload'
    },
    'optimize-pdf': {
      operation: 'optimize',
      input: 'upload-file',
      input_format: 'pdf',
      output_format: 'pdf',
      profile: 'good' | 'recommended' | 'extreme'
    },
    'export-file': {
      operation: 'export/url',
      input: 'optimize-pdf'
    }
  }
}
```

**Compression Profiles**:
- `good`: Minimal quality loss, moderate compression
- `recommended`: Balanced quality/size (default)
- `extreme`: Maximum compression, quality degradation possible

## Performance Metrics

### Processing Time

**Base Estimate**: 3 seconds per 2MB

**Example Timings**:
- 2MB PDF: ~3 seconds
- 5MB PDF: ~6 seconds
- 10MB PDF: ~12 seconds
- 25MB PDF: ~30 seconds

**Actual Times**: May vary based on:
- PDF complexity (number of images, fonts, etc.)
- Compression level selected
- CloudConvert server load

### Compression Results

**Typical Compression Ratios**:

| Compression Level | Average Reduction | Example (10MB → ?) |
|-------------------|-------------------|--------------------|
| Good              | 20-30%            | 10MB → 7-8MB      |
| Recommended       | 40-60%            | 10MB → 4-6MB      |
| Extreme           | 60-80%            | 10MB → 2-4MB      |

**Note**: Actual results vary based on PDF content:
- Text-heavy PDFs: Higher compression ratios
- Image-heavy PDFs: Lower compression ratios
- Already compressed PDFs: Minimal additional compression

## Testing

### Manual Testing Steps

1. **Setup**:
   - Log in to PDFLab (compression requires authentication)
   - Prepare test PDFs of various sizes and content types

2. **Test Compression Levels**:
   ```
   For each compression level (good, recommended, extreme):
     1. Navigate to home page
     2. Select "Compress" mode
     3. Upload a PDF file
     4. Select compression level
     5. Click "Compress PDF"
     6. Wait for completion
     7. Download compressed PDF
     8. Verify compression ratio
     9. Check visual quality
   ```

3. **Test File Size Limits**:
   - Upload PDF exceeding plan limit
   - Verify error message with upgrade option
   - Upload PDF within plan limit
   - Verify successful compression

4. **Test Quota**:
   - Use all monthly conversions
   - Attempt compression
   - Verify quota exceeded error

5. **Test Guest Restriction**:
   - Log out
   - Attempt to use compression mode
   - Verify authentication required message

### Automated Testing

**API Endpoint Tests**:
```bash
# Test compression with recommended level
curl -X POST http://localhost:3006/api/compress \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf" \
  -F "compression_level=recommended"

# Test invalid compression level
curl -X POST http://localhost:3006/api/compress \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf" \
  -F "compression_level=invalid"

# Test without authentication
curl -X POST http://localhost:3006/api/compress \
  -F "file=@test.pdf" \
  -F "compression_level=recommended"
```

**Expected Results**:
- Valid request: 201 Created with job_id
- Invalid level: 400 Bad Request
- No auth: 401 Unauthorized

## Future Enhancements

### Planned Features

1. **Compression Preview** (v2.0)
   - Show estimated file size before compression
   - Preview quality impact
   - Compare before/after file sizes

2. **Batch Compression** (v2.1)
   - Compress multiple PDFs at once
   - Bulk download compressed files
   - Progress tracking for batch operations

3. **Custom Compression Settings** (v2.2)
   - DPI adjustment for images
   - Font subsetting options
   - Remove hidden data/metadata
   - Linearize for web viewing

4. **Compression Analytics** (v2.3)
   - Track average compression ratios
   - Show total space saved
   - Compression history dashboard

5. **API Access** (Enterprise)
   - REST API for compression
   - Webhook notifications
   - Bulk compression via API

## Troubleshooting

### Issue: Compression Doesn't Reduce File Size

**Possible Causes**:
- PDF already heavily compressed
- PDF contains uncompressible content (encrypted, protected)
- PDF uses compression-resistant formats

**Solutions**:
- Try "extreme" compression level
- Check if PDF has restrictions/encryption
- Use different PDF source if possible

### Issue: Quality Degradation Too High

**Possible Causes**:
- "Extreme" compression selected
- PDF has high-resolution images
- PDF has complex graphics

**Solutions**:
- Switch to "good" or "recommended" level
- Accept larger file size for better quality
- Consider converting to images if quality is critical

### Issue: Authentication Required Error

**Possible Causes**:
- User not logged in
- JWT token expired
- Guest user attempting compression

**Solutions**:
- Log in to PDFLab account
- Create free account if guest user
- Check authentication status

## Support & Documentation

### Additional Resources

- **CloudConvert Optimize Docs**: https://cloudconvert.com/api/v2/optimize
- **API Documentation**: [docs/api/API_DOCUMENTATION.md](../api/API_DOCUMENTATION.md)
- **User Guide**: [docs/guides/USER_GUIDE.md](../guides/USER_GUIDE.md)
- **Architecture**: [docs/architecture/](../architecture/)

### Getting Help

- **Email Support**: support@pdflab.pro
- **GitHub Issues**: https://github.com/pdflab/pdflab/issues
- **Documentation**: https://docs.pdflab.pro

---

**Last Updated**: November 6, 2025
**Version**: 1.0.0
**Status**: Production Ready ✅
