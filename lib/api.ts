// Real API client connecting to PDFLab backend
// Backend running on http://localhost:3006

import { handleAPIError } from './api-error-handler'
import {
  fetchWithEnhancedErrorHandling,
  parseEnhancedAPIError,
  trackErrorEvent,
  type APIErrorResponse
} from './enhanced-error-handler'

/**
 * Enhanced API Error that carries rich error data
 */
export class EnhancedAPIError extends Error {
  constructor(
    message: string,
    public errorResponse: APIErrorResponse
  ) {
    super(message)
    this.name = 'EnhancedAPIError'
  }
}

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
  jobId?: string
  isGuest?: boolean
}

export interface ValidationResult {
  valid: boolean
  error?: string
}

// Get API URL from environment or default to localhost:3006
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

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

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('authToken')
}

/**
 * Poll job status until completion
 */
async function pollJobStatus(jobId: string, onProgress?: (progress: number) => void): Promise<any> {
  const maxAttempts = 60 // 60 attempts = 60 seconds max
  let attempts = 0

  while (attempts < maxAttempts) {
    const token = getAuthToken()

    try {
      const response = await fetch(`${API_URL}/api/status/${jobId}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        }
      })

      if (!response.ok) {
        const errorMessage = handleAPIError(new Error('Status check failed'), response, 'Job Status')
        throw new Error(errorMessage)
      }

      const data = await response.json()

      // Update progress callback
      if (onProgress && data.progress) {
        onProgress(data.progress)
      }

      // Check if job is complete
      if (data.status === 'completed') {
        return data
      }

      if (data.status === 'failed') {
        throw new Error(data.error || 'Conversion failed - check the file format and try again')
      }

      // Wait 1 second before next poll
      await new Promise(resolve => setTimeout(resolve, 1000))
      attempts++
    } catch (error) {
      // If it's a network error, throw immediately
      if (error instanceof Error && error.message.includes('Cannot reach')) {
        throw error
      }
      // Otherwise, retry
      attempts++
      if (attempts >= maxAttempts) {
        throw error
      }
    }
  }

  throw new Error('Conversion timed out after 60 seconds. The file may be too large or complex.')
}

// Modern API interface matching component expectations
export const pdflabAPI = {
  /**
   * Convert PDF to Office format (PowerPoint, Word, Excel)
   */
  async convertPDFToOffice(
    file: File,
    format: 'pptx' | 'docx' | 'xlsx'
  ): Promise<ConversionResponse> {
    const startTime = Date.now()
    const token = getAuthToken()

    // Map format to conversion type
    const conversionTypeMap = {
      'pptx': 'pdf_to_pptx',
      'docx': 'pdf_to_docx',
      'xlsx': 'pdf_to_xlsx'
    }

    // Upload and start conversion
    const formData = new FormData()
    formData.append('file', file)
    formData.append('conversion_type', conversionTypeMap[format])

    let uploadResponse
    try {
      uploadResponse = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: formData
      })

      if (!uploadResponse.ok) {
        const errorResponse = await parseEnhancedAPIError(uploadResponse)
        trackErrorEvent(errorResponse, 'PDF to Office Upload')
        throw new EnhancedAPIError(errorResponse.message, errorResponse)
      }
    } catch (error) {
      if (error instanceof EnhancedAPIError) {
        throw error
      }
      if (!uploadResponse) {
        const errorMessage = handleAPIError(error, undefined, 'PDF to Office Upload')
        throw new Error(errorMessage)
      }
      throw error
    }

    const uploadData = await uploadResponse.json()
    const jobId = uploadData.job_id
    const isGuest = uploadData.is_guest === true

    // Poll for completion
    const result = await pollJobStatus(jobId)

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1)

    return {
      success: true,
      message: `Successfully converted to ${format.toUpperCase()}`,
      outputFile: result.output_file,
      originalFile: file.name,
      processingTime: `${processingTime} seconds`,
      jobId,
      isGuest
    }
  },

  /**
   * Convert PDF to images
   */
  async convertPDFToImages(file: File): Promise<ConversionResponse> {
    const startTime = Date.now()
    const token = getAuthToken()

    // Upload and start conversion
    const formData = new FormData()
    formData.append('file', file)
    formData.append('conversion_type', 'pdf_to_images')

    let uploadResponse
    try {
      uploadResponse = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: formData
      })

      if (!uploadResponse.ok) {
        const errorResponse = await parseEnhancedAPIError(uploadResponse)
        trackErrorEvent(errorResponse, 'PDF to Images Upload')
        throw new EnhancedAPIError(errorResponse.message, errorResponse)
      }
    } catch (error) {
      if (error instanceof EnhancedAPIError) {
        throw error
      }
      if (!uploadResponse) {
        const errorMessage = handleAPIError(error, undefined, 'PDF to Images Upload')
        throw new Error(errorMessage)
      }
      throw error
    }

    const uploadData = await uploadResponse.json()
    const jobId = uploadData.job_id
    const isGuest = uploadData.is_guest === true

    // Poll for completion
    const result = await pollJobStatus(jobId)

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1)

    return {
      success: true,
      message: 'Successfully converted to images',
      outputFile: result.output_file,
      originalFile: file.name,
      processingTime: `${processingTime} seconds`,
      jobId,
      isGuest
    }
  },

  /**
   * Merge multiple PDFs
   */
  async mergePDFs(files: File[]): Promise<ConversionResponse> {
    const startTime = Date.now()
    const token = getAuthToken()

    if (files.length < 2) {
      throw new Error('At least 2 PDF files are required for merging')
    }

    // Upload and start merge
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })

    let uploadResponse
    try {
      uploadResponse = await fetch(`${API_URL}/api/merge`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: formData
      })

      if (!uploadResponse.ok) {
        const errorResponse = await parseEnhancedAPIError(uploadResponse)
        trackErrorEvent(errorResponse, 'PDF Merge')
        throw new EnhancedAPIError(errorResponse.message, errorResponse)
      }
    } catch (error) {
      if (error instanceof EnhancedAPIError) {
        throw error
      }
      if (!uploadResponse) {
        const errorMessage = handleAPIError(error, undefined, 'PDF Merge')
        throw new Error(errorMessage)
      }
      throw error
    }

    const uploadData = await uploadResponse.json()
    const jobId = uploadData.job_id
    const isGuest = uploadData.is_guest === true

    // Poll for completion
    const result = await pollJobStatus(jobId)

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1)

    return {
      success: true,
      message: `Successfully merged ${files.length} PDF files`,
      outputFile: result.output_file,
      processingTime: `${processingTime} seconds`,
      fileCount: files.length,
      jobId,
      isGuest
    }
  },

  /**
   * Trigger file download
   */
  async triggerDownload(outputFile: string, originalFileName: string): Promise<void> {
    const token = getAuthToken()

    // Extract job ID from output file path (format: /download/JOB_ID)
    const jobId = outputFile.replace('/download/', '')

    const response = await fetch(`${API_URL}/api/download/${jobId}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Download failed' }))
      throw new Error(error.error || 'Download failed')
    }

    // Get the blob and content-disposition header
    const blob = await response.blob()

    // Try to get filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition')
    let downloadFileName = originalFileName

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
      if (filenameMatch && filenameMatch[1]) {
        downloadFileName = filenameMatch[1]
        console.log('✅ Using filename from Content-Disposition:', downloadFileName)
      } else {
        console.log('⚠️ Content-Disposition found but no filename extracted:', contentDisposition)
      }
    } else {
      console.log('❌ No Content-Disposition header found, using original filename:', originalFileName)
    }

    // Create download link
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = downloadFileName
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }
};

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  // Convert PDF to format
  async convertPDF(file: File, outputFormat: string): Promise<ConversionJob> {
    const token = getAuthToken()

    const formData = new FormData()
    formData.append('file', file)
    formData.append('conversion_type', `pdf_to_${outputFormat}`)

    const response = await fetch(`${this.baseUrl}/api/upload`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Conversion failed')
    }

    const data = await response.json()

    return {
      jobId: data.job_id,
      status: 'pending',
      progress: 0,
    };
  }

  // Merge PDFs
  async mergePDFs(files: File[]): Promise<ConversionJob> {
    const token = getAuthToken()

    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })

    const response = await fetch(`${this.baseUrl}/api/merge`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Merge failed')
    }

    const data = await response.json()

    return {
      jobId: data.job_id,
      status: 'pending',
      progress: 0,
    };
  }

  // Check job status
  async getJobStatus(jobId: string): Promise<ConversionJob> {
    const token = getAuthToken()

    const response = await fetch(`${this.baseUrl}/api/status/${jobId}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      }
    })

    if (!response.ok) {
      throw new Error('Failed to get job status')
    }

    const data = await response.json()

    return {
      jobId: data.job_id,
      status: data.status,
      progress: data.progress,
      downloadUrl: data.output_file,
      errorMessage: data.error
    };
  }

  // Download file
  async downloadFile(jobId: string): Promise<Blob> {
    const token = getAuthToken()

    const response = await fetch(`${this.baseUrl}/api/download/${jobId}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      }
    })

    if (!response.ok) {
      throw new Error('Download failed')
    }

    return await response.blob();
  }
}

export const api = new ApiClient();
