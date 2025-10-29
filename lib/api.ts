// Stub API client for frontend-only development
// This will be replaced with actual API calls when backend is ready

export interface ConversionJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string;
  errorMessage?: string;
}

export interface ConversionResponse {
  success: boolean
  message: string
  outputFile: string
  originalFile?: string
  processingTime: string
  fileCount?: number
}

export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate PDF file before upload
 */
export function validatePDFFile(file: File): ValidationResult {
  // Check file type
  if (file.type !== 'application/pdf') {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Only PDF files are accepted.`
    }
  }

  // Check file size (10MB for free tier, can be configured)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      error: `File too large: ${sizeMB}MB. Free tier limit is 10MB.`
    }
  }

  // Check minimum file size (1KB)
  if (file.size < 1024) {
    return {
      valid: false,
      error: 'File appears to be empty or corrupted.'
    }
  }

  return { valid: true }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  // Stub: Convert PDF to format
  async convertPDF(file: File, outputFormat: string): Promise<ConversionJob> {
    console.log('API Stub: convertPDF', file.name, outputFormat);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return mock response
    return {
      jobId: `stub-${Date.now()}`,
      status: 'pending',
      progress: 0,
    };
  }

  // Stub: Merge PDFs
  async mergePDFs(files: File[]): Promise<ConversionJob> {
    console.log('API Stub: mergePDFs', files.length, 'files');

    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      jobId: `merge-${Date.now()}`,
      status: 'pending',
      progress: 0,
    };
  }

  // Stub: Check job status
  async getJobStatus(jobId: string): Promise<ConversionJob> {
    console.log('API Stub: getJobStatus', jobId);

    // Simulate completed job after 3 seconds
    const jobAge = Date.now() - parseInt(jobId.split('-')[1] || '0');

    if (jobAge > 3000) {
      return {
        jobId,
        status: 'completed',
        progress: 100,
        downloadUrl: '/api/download/stub-file.pdf',
      };
    }

    return {
      jobId,
      status: 'processing',
      progress: Math.min(90, Math.floor((jobAge / 3000) * 100)),
    };
  }

  // Stub: Download file
  async downloadFile(jobId: string): Promise<Blob> {
    console.log('API Stub: downloadFile', jobId);

    // Return empty blob
    return new Blob(['Stub file content'], { type: 'application/pdf' });
  }
}

export const api = new ApiClient();

// Modern API interface matching component expectations
export const pdflabAPI = {
  /**
   * Convert PDF to Office format (PowerPoint, Word, Excel)
   */
  async convertPDFToOffice(
    file: File,
    format: 'pptx' | 'docx' | 'xlsx'
  ): Promise<ConversionResponse> {
    console.log('Converting PDF to', format, file.name);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 3000));

    return {
      success: true,
      message: `Successfully converted to ${format.toUpperCase()}`,
      outputFile: `converted-${file.name.replace('.pdf', `.${format}`)}`,
      originalFile: file.name,
      processingTime: '2.8 seconds'
    }
  },

  /**
   * Convert PDF to images
   */
  async convertPDFToImages(file: File): Promise<ConversionResponse> {
    console.log('Converting PDF to images:', file.name);

    await new Promise(resolve => setTimeout(resolve, 3000));

    return {
      success: true,
      message: 'Successfully converted to images',
      outputFile: `${file.name.replace('.pdf', '')}-images.zip`,
      originalFile: file.name,
      processingTime: '3.2 seconds'
    }
  },

  /**
   * Merge multiple PDFs
   */
  async mergePDFs(files: File[]): Promise<ConversionResponse> {
    console.log('Merging', files.length, 'PDF files');

    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      success: true,
      message: `Successfully merged ${files.length} PDF files`,
      outputFile: 'merged-document.pdf',
      processingTime: '1.5 seconds',
      fileCount: files.length
    }
  },

  /**
   * Trigger file download
   */
  triggerDownload(outputFile: string, originalFileName: string): void {
    console.log('Downloading:', outputFile, 'as', originalFileName);

    // In a real implementation, this would download from the server
    // For now, just show an alert
    alert(`Download would start for: ${originalFileName}\\n\\nNote: This is a frontend-only demo. Connect to a backend API for actual file downloads.`);
  }
};
