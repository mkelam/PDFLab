import axios from 'axios'
import fs from 'fs'
import path from 'path'
import logger from '../config/logger'

export interface AddTextOptions {
  text: string
  x: number
  y: number
  pages?: string // default "0-"
  size?: number
  color?: string
}

export class PdfCoService {
  private apiKey: string
  private apiUrl = 'https://api.pdf.co/v1'

  constructor() {
    this.apiKey = process.env.PDFCO_API_KEY || ''
    if (!this.apiKey) {
      logger.warn('PDFCO_API_KEY is not set. PDF editing features will not work.')
    }
  }

  /**
   * Uploads a temporary file to PDF.co storage to get a URL
   */
  private async uploadFile(filePath: string): Promise<string> {
    try {
      // Get presigned URL (GET request)
      const response = await axios.get(`${this.apiUrl}/file/upload/get-presigned-url`, {
        params: {
          name: path.basename(filePath)
        },
        headers: {
          'x-api-key': this.apiKey
        }
      })

      if (response.data.error) {
        throw new Error(response.data.message)
      }

      const { presignedUrl, url } = response.data

      // Upload to the presigned URL
      await axios.put(presignedUrl, fs.readFileSync(filePath), {
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      })

      return url
    } catch (error: any) {
      logger.error('Error uploading file to PDF.co:', error.message)
      throw new Error('Failed to upload file to PDF service')
    }
  }

  /**
   * Add text to a PDF
   */
  async addText(
    filePath: string,
    options: AddTextOptions
  ): Promise<{ url: string; pageCount: number; error: boolean; message: string }> {
    try {
      if (!this.apiKey) {
        throw new Error('PDF.co API key is not configured')
      }

      const fileUrl = await this.uploadFile(filePath)

      const response = await axios.post(
        `${this.apiUrl}/pdf/edit/add`,
        {
          url: fileUrl,
          async: false,
          textAnnotations: [
            {
              text: options.text,
              x: options.x,
              y: options.y,
              pages: options.pages ?? '0-',
              size: options.size ?? 12,
              color: options.color ?? '000000'
            }
          ]
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.data.error) {
        throw new Error(response.data.message)
      }

      return {
        url: response.data.url,
        pageCount: response.data.pageCount,
        error: false,
        message: 'Text added successfully'
      }
    } catch (error: any) {
      logger.error('Error adding text with PDF.co:', error.response?.data || error.message)
      return {
        url: '',
        pageCount: 0,
        error: true,
        message: error.message || 'Failed to add text to PDF'
      }
    }
  }
  /**
   * Convert PDF to JSON to get text coordinates
   */
  async convertPdfToJson(
    filePath: string
  ): Promise<{ jsonUrl: string; error: boolean; message: string }> {
    try {
      if (!this.apiKey) {
        throw new Error('PDF.co API key is not configured')
      }

      const fileUrl = await this.uploadFile(filePath)

      const response = await axios.post(
        `${this.apiUrl}/pdf/convert/to/json2`,
        {
          url: fileUrl,
          async: false,
          inline: false, // We want a URL to the JSON file
          profiles: '' // Optional: Add Profiles string to filter if needed
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.data.error) {
        throw new Error(response.data.message)
      }

      return {
        jsonUrl: response.data.url,
        error: false,
        message: 'PDF converted to JSON successfully'
      }
    } catch (error: any) {
      logger.error('Error converting PDF to JSON:', error.response?.data || error.message)
      return {
        jsonUrl: '',
        error: true,
        message: error.message || 'Failed to convert PDF to JSON'
      }
    }
  }

  /**
   * Replace text in a PDF
   */
  async replaceText(
    filePath: string,
    searchString: string,
    replacementString: string,
    pages: string = '0-'
  ): Promise<{ url: string; error: boolean; message: string }> {
    try {
      if (!this.apiKey) {
        throw new Error('PDF.co API key is not configured')
      }

      const fileUrl = await this.uploadFile(filePath)

      const response = await axios.post(
        `${this.apiUrl}/pdf/edit/replace-text`,
        {
          url: fileUrl,
          async: false,
          searchString: searchString,
          replacementString: replacementString,
          pages: pages
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.data.error) {
        throw new Error(response.data.message)
      }

      return {
        url: response.data.url,
        error: false,
        message: 'Text replaced successfully'
      }
    } catch (error: any) {
      logger.error('Error replacing text:', error.response?.data || error.message)
      return {
        url: '',
        error: true,
        message: error.message || 'Failed to replace text'
      }
    }
  }
}

export const pdfCoService = new PdfCoService()
