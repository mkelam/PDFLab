# Onboarding Sample Templates

This directory contains sample PDF files used for the user onboarding flow.

## Required Templates

You need to add 3 PDF files to this directory:

### 1. sample_invoice.pdf
- **Size**: ~250KB
- **Content**: Invoice with tables (invoice number, line items, amounts)
- **Recommended Conversion**: XLSX (Excel)
- **Purpose**: Test table extraction and data conversion
- **Sources**:
  - Generate using any accounting software
  - Use https://invoice-generator.com
  - Search "sample invoice PDF" online

### 2. sample_report.pdf
- **Size**: ~580KB
- **Content**: Business report with text, headings, and images
- **Recommended Conversion**: DOCX (Word)
- **Purpose**: Test document conversion and formatting
- **Sources**:
  - Generate using Word → Save as PDF
  - Annual report samples from public companies
  - Search "business report PDF sample"

### 3. sample_presentation.pdf
- **Size**: ~1.25MB
- **Content**: Slide deck with multiple slides (5-10 slides)
- **Recommended Conversion**: PPTX (PowerPoint)
- **Purpose**: Test presentation conversion and layout preservation
- **Sources**:
  - Create in PowerPoint → Save as PDF
  - Marketing presentation templates
  - Search "presentation deck PDF sample"

## File Storage

These files are **NOT** committed to git (see `.gitignore`). Each developer/environment needs to add them manually.

## Database References

The `onboarding_templates` table references these files:

```sql
file_path = '/templates/sample_invoice.pdf'
file_path = '/templates/sample_report.pdf'
file_path = '/templates/sample_presentation.pdf'
```

The controller resolves these paths to: `backend/storage/templates/sample_*.pdf`

## Testing Without Real Files

If you don't have sample PDFs yet, you can:

1. Use the existing `test-sample.pdf` from project root as a placeholder
2. Copy it 3 times:
   ```bash
   cp ../../test-sample.pdf sample_invoice.pdf
   cp ../../test-sample.pdf sample_report.pdf
   cp ../../test-sample.pdf sample_presentation.pdf
   ```
3. Update file sizes in database to match actual files

## Production Deployment

Before deploying to VPS, ensure these 3 files are uploaded to:
```
/var/www/pdflab/backend/storage/templates/
```

Or update `TEMPLATE_STORAGE_PATH` environment variable if using different location.
