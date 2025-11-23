import { describe, it, expect } from '@jest/globals'
import {
  getProgressStages,
  getUploadText,
  getMaxFiles,
  mapOutputFormatToAPI,
  enhanceErrorMessage,
  getProcessButtonText,
  getCompletionMessage,
} from '@/lib/conversion/conversion-utils'

describe('conversion-utils', () => {
  describe('getProgressStages', () => {
    it('should return convert stages for PowerPoint conversion', () => {
      const stages = getProgressStages('convert', 'powerpoint', 'recommended')
      expect(stages).toHaveLength(5)
      expect(stages[0].progress).toBe(20)
      expect(stages[0].stage).toContain('Analyzing PDF structure')
      expect(stages[3].stage).toContain('Creating editable PowerPoint')
    })

    it('should return compress stages with compression level', () => {
      const stages = getProgressStages('compress', 'powerpoint', 'extreme')
      expect(stages).toHaveLength(4)
      expect(stages[1].stage).toContain('Applying extreme compression')
    })

    it('should return merge stages', () => {
      const stages = getProgressStages('merge', 'powerpoint', 'recommended')
      expect(stages).toHaveLength(4)
      expect(stages[1].stage).toContain('Merging PDFs')
    })

    it('should use "images" text for image output format', () => {
      const stages = getProgressStages('convert', 'image', 'recommended')
      expect(stages[3].stage).toContain('Creating images')
    })
  })

  describe('getUploadText', () => {
    it('should return single file text for single convert mode', () => {
      const text = getUploadText('convert', 'single', 1)
      expect(text.title).toBe('Drop your PDF here')
      expect(text.subtitle).toBe('Or click to browse files')
    })

    it('should return batch text for batch convert mode', () => {
      const text = getUploadText('convert', 'batch', 10)
      expect(text.title).toBe('Drop multiple PDFs here')
      expect(text.subtitle).toContain('Add up to 10 PDF files')
    })

    it('should return merge text for merge mode', () => {
      const text = getUploadText('merge', 'single', 10)
      expect(text.title).toBe('Drop multiple PDFs here')
      expect(text.subtitle).toContain('2 or more PDF files')
    })
  })

  describe('getMaxFiles', () => {
    it('should return 1 for single convert mode', () => {
      expect(getMaxFiles('convert', 'single')).toBe(1)
    })

    it('should return 10 for batch convert mode', () => {
      expect(getMaxFiles('convert', 'batch')).toBe(10)
    })

    it('should return 10 for merge mode', () => {
      expect(getMaxFiles('merge', 'single')).toBe(10)
    })

    it('should return 10 for compress mode', () => {
      expect(getMaxFiles('compress', 'single')).toBe(10)
    })
  })

  describe('mapOutputFormatToAPI', () => {
    it('should map powerpoint to pptx', () => {
      expect(mapOutputFormatToAPI('powerpoint')).toBe('pptx')
    })

    it('should map word to docx', () => {
      expect(mapOutputFormatToAPI('word')).toBe('docx')
    })

    it('should map excel to xlsx', () => {
      expect(mapOutputFormatToAPI('excel')).toBe('xlsx')
    })

    it('should map image to images', () => {
      expect(mapOutputFormatToAPI('image')).toBe('images')
    })
  })

  describe('enhanceErrorMessage', () => {
    it('should enhance file too large error with size', () => {
      const error = new Error('File too large')
      const fileSize = 15 * 1024 * 1024 // 15MB
      const enhanced = enhanceErrorMessage(error, fileSize)
      expect(enhanced).toContain('File too large')
      expect(enhanced).toContain('15.0MB')
      expect(enhanced).toContain('Free plan limit: 10MB')
    })

    it('should enhance corrupt file error', () => {
      const error = new Error('PDF is corrupt')
      const enhanced = enhanceErrorMessage(error)
      expect(enhanced).toContain('corrupted or password-protected')
    })

    it('should enhance timeout error', () => {
      const error = new Error('Request timed out')
      const enhanced = enhanceErrorMessage(error)
      expect(enhanced).toContain('Conversion timed out')
      expect(enhanced).toContain('Try converting to images instead')
    })

    it('should enhance network error', () => {
      const error = new Error('Network error occurred')
      const enhanced = enhanceErrorMessage(error)
      expect(enhanced).toContain('Network error')
      expect(enhanced).toContain('check your connection')
    })

    it('should return original message for unknown errors', () => {
      const error = new Error('Unknown error')
      const enhanced = enhanceErrorMessage(error)
      expect(enhanced).toBe('Unknown error')
    })

    it('should handle string errors', () => {
      const enhanced = enhanceErrorMessage('File too large')
      expect(enhanced).toContain('File too large')
    })
  })

  describe('getProcessButtonText', () => {
    it('should return correct text for single PowerPoint conversion', () => {
      const text = getProcessButtonText('convert', 'powerpoint', 'single', 1)
      expect(text).toBe('Convert to PowerPoint')
    })

    it('should return correct text for batch PowerPoint conversion', () => {
      const text = getProcessButtonText('convert', 'powerpoint', 'batch', 5)
      expect(text).toBe('Convert 5 Files to PowerPoint')
    })

    it('should return correct text for single image export', () => {
      const text = getProcessButtonText('convert', 'image', 'single', 1)
      expect(text).toBe('Export to Images')
    })

    it('should return correct text for batch image export', () => {
      const text = getProcessButtonText('convert', 'image', 'batch', 3)
      expect(text).toBe('Export 3 Files to Images')
    })

    it('should return correct text for Word conversion', () => {
      const text = getProcessButtonText('convert', 'word', 'single', 1)
      expect(text).toBe('Convert to Word')
    })

    it('should return correct text for Excel conversion', () => {
      const text = getProcessButtonText('convert', 'excel', 'batch', 2)
      expect(text).toBe('Convert 2 Files to Excel')
    })

    it('should return correct text for compression', () => {
      const text = getProcessButtonText('compress', 'powerpoint', 'single', 1)
      expect(text).toBe('Compress PDF')
    })

    it('should return correct text for merge', () => {
      const text = getProcessButtonText('merge', 'powerpoint', 'single', 3)
      expect(text).toBe('Merge PDFs')
    })
  })

  describe('getCompletionMessage', () => {
    it('should return correct message for PowerPoint conversion', () => {
      const message = getCompletionMessage('convert', 'powerpoint')
      expect(message).toBe('Conversion Complete!')
    })

    it('should return correct message for image export', () => {
      const message = getCompletionMessage('convert', 'image')
      expect(message).toBe('Export Complete!')
    })

    it('should return correct message for compression', () => {
      const message = getCompletionMessage('compress', 'powerpoint')
      expect(message).toBe('Compression Complete!')
    })

    it('should return correct message for merge', () => {
      const message = getCompletionMessage('merge', 'powerpoint')
      expect(message).toBe('Merge Complete!')
    })
  })
})
